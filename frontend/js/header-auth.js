import { api } from "./api.js";
import { clearAdminCredentials, saveAdminCredentials } from "./auth.js";
import { createNotificationCenter } from "./notifications.js";
import { renderSharedAuthShell } from "./shared-auth-shell.js";
import { clearAdotanteId, clearCurrentUser, readCurrentUser, saveAdotanteId, saveCurrentUser } from "./state.js";

export function getHeaderAuthViewState(user) {
  const isLoggedIn = Boolean(user?.nome);
  const isAdmin = user?.tipo === "admin";
  const isAdotante = user?.tipo === "adotante";

  return {
    isLoggedIn,
    isAdmin,
    loginHidden: isLoggedIn,
    privateActionsHidden: !isAdotante,
    accountHidden: !isLoggedIn,
    adminAreaHidden: !isAdmin,
    greeting: isLoggedIn ? user.nome : "",
  };
}

export function formatCpfForLogin(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  const parts = [];

  if (digits.length <= 3) {
    return digits;
  }

  parts.push(digits.slice(0, 3));

  if (digits.length <= 6) {
    parts.push(digits.slice(3));
    return parts.join(".");
  }

  parts.push(digits.slice(3, 6));

  if (digits.length <= 9) {
    parts.push(digits.slice(6));
    return parts.join(".");
  }

  return `${parts.join(".")}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function createHeaderAuthController({
  root = document,
  storage = globalThis.sessionStorage || createMemoryStorage(),
  apiClient = api,
  onLogin = null,
  onLogout = null,
} = {}) {
  renderSharedAuthShell(root);

  const loginButton = query(root, "[data-login-open]");
  const privateActions = queryAll(root, "[data-auth-private]");
  const accountMenu = query(root, "[data-account-menu]");
  const accountTrigger = query(root, "[data-account-trigger]");
  const accountGreeting = query(root, "[data-account-greeting]");
  const accountDropdown = query(root, "[data-account-dropdown]");
  const adminAreaLink = query(root, "[data-admin-area]");
  const editProfileButton = query(root, "[data-edit-profile]");
  const logoutButton = query(root, "[data-logout]");
  const modal = query(root, "[data-login-modal]");
  const loginForm = query(root, "[data-login-form]");
  const loginFeedback = query(root, "[data-login-feedback]");
  const modalTitle = query(root, "[data-login-title]");
  const modalSubtitle = query(root, "[data-login-subtitle]");
  const modalSubmitText = query(root, "[data-login-submit-text]");
  const closeButtons = queryAll(root, "[data-login-close]");
  const myRequestsButton = query(root, "[data-my-requests]");
  const requestsModal = query(root, "[data-requests-modal]");
  const requestsList = query(root, "[data-requests-list]");
  const requestsFeedback = query(root, "[data-requests-feedback]");
  const requestsCloseButtons = queryAll(root, "[data-requests-close]");
  const notificationCenter = createNotificationCenter({
    root,
    storage: globalThis.localStorage || createMemoryStorage(),
  });
  let currentRequests = [];

  function render() {
    const user = readCurrentUser(storage);
    const state = getHeaderAuthViewState(user);

    setHidden(loginButton, state.loginHidden);
    for (const action of privateActions) {
      setHidden(action, state.privateActionsHidden);
    }
    setHidden(accountMenu, state.accountHidden);
    setHidden(adminAreaLink, state.adminAreaHidden);

    if (accountGreeting) {
      accountGreeting.textContent = state.greeting;
    }

    if (!state.isLoggedIn) {
      closeAccountMenu();
    }

    void notificationCenter.sync(user);

    return state;
  }

  function openLoginModal({ mode = "login" } = {}) {
    if (!modal || !loginForm) {
      return;
    }

    const currentUser = readCurrentUser(storage);
    const cpfInput = getFormControl(loginForm, "cpf");
    const senhaInput = getFormControl(loginForm, "senha");

    if (cpfInput) {
      cpfInput.value = mode === "edit" && currentUser ? currentUser.cpf : "";
    }

    if (senhaInput) {
      senhaInput.value = "";
    }

    loginForm.dataset.mode = mode;
    setText(loginFeedback, "");
    setText(modalTitle, mode === "edit" ? "Confirmar acesso" : "Fazer login");
    setText(
      modalSubtitle,
      mode === "edit"
        ? "Confirme seu CPF e senha para continuar."
        : "Entre com CPF e senha para acessar favoritos, notificacoes e sua conta."
    );
    setText(modalSubmitText, mode === "edit" ? "Confirmar" : "Entrar");

    modal.hidden = false;
    syncModalOpenState();
    globalThis.requestAnimationFrame?.(() => cpfInput?.focus());
  }

  function closeLoginModal() {
    if (!modal) {
      return;
    }

    modal.hidden = true;
    setText(loginFeedback, "");
    syncModalOpenState();
  }

  async function submitLogin(event) {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const cpf = formData.get("cpf");
    const senha = String(formData.get("senha") || "").trim();

    try {
      const response = await apiClient.post("/auth/login", { cpf, senha });
      if (!response.autenticado) {
        throw new Error(response.mensagem || "CPF ou senha invalidos");
      }

      const nextUser = {
        id: response.id,
        nome: response.nome,
        cpf: response.cpf,
        email: response.email,
        tipo: response.tipo,
        telefone: response.telefone,
        endereco: response.endereco,
        tipoMoradia: response.tipoMoradia,
        temCriancas: response.temCriancas,
        temOutrosAnimais: response.temOutrosAnimais,
        nivelAtividade: response.nivelAtividade,
        preferenciaPorte: response.preferenciaPorte,
        preferenciaEspecie: response.preferenciaEspecie,
      };

      saveCurrentUser(storage, nextUser);

      if (response.tipo === "admin") {
        saveAdminCredentials(storage, response.email, senha);
        clearAdotanteIdIfAvailable();
      } else {
        clearAdminCredentials(storage);
        saveAdotanteIdIfAvailable(response.id);
      }

      render();
      closeLoginModal();
      onLogin?.(readCurrentUser(storage));
    } catch (error) {
      setText(loginFeedback, error.message);
    }
  }

  function toggleAccountMenu() {
    if (!accountMenu || !accountTrigger) {
      return;
    }

    const isOpen = !accountMenu.classList.contains("account-menu-open");
    accountMenu.classList.toggle("account-menu-open", isOpen);
    accountTrigger.setAttribute("aria-expanded", String(isOpen));
  }

  function closeAccountMenu() {
    accountMenu?.classList.remove("account-menu-open");
    accountTrigger?.setAttribute("aria-expanded", "false");
  }

  async function openRequestsModal() {
    const currentUser = readCurrentUser(storage);
    if (!currentUser || currentUser.tipo !== "adotante") {
      openLoginModal();
      return;
    }

    closeAccountMenu();
    if (!requestsModal || !requestsList) {
      return;
    }

    requestsModal.hidden = false;
    syncModalOpenState();
    renderRequestsLoading();

    try {
      const requests = await apiClient.get(`/adocoes/adotantes/${currentUser.id}`);
      renderRequests(requests);
    } catch {
      renderRequestsError();
    }
  }

  function closeRequestsModal() {
    if (!requestsModal) {
      return;
    }

    requestsModal.hidden = true;
    setText(requestsFeedback, "");
    syncModalOpenState();
  }

  function logout() {
    clearCurrentUser(storage);
    clearAdminCredentials(storage);
    clearAdotanteIdIfAvailable();
    closeAccountMenu();
    closeLoginModal();
    closeRequestsModal();
    notificationCenter.clear();
    onLogout?.();
    render();
  }

  function requireLoggedUser(event) {
    if (readCurrentUser(storage)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openLoginModal();
  }

  loginButton?.addEventListener("click", () => openLoginModal());
  privateActions.forEach((action) => action.addEventListener("click", requireLoggedUser));
  closeButtons.forEach((button) => button.addEventListener("click", closeLoginModal));
  requestsCloseButtons.forEach((button) => button.addEventListener("click", closeRequestsModal));
  loginForm?.addEventListener("submit", submitLogin);
  if (loginForm) {
    getFormControl(loginForm, "cpf")?.addEventListener("input", (event) => {
      event.currentTarget.value = formatCpfForLogin(event.currentTarget.value);
    });
  }
  accountTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleAccountMenu();
  });
  accountDropdown?.addEventListener("click", (event) => event.stopPropagation());
  editProfileButton?.addEventListener("click", () => {
    closeAccountMenu();
    window.location.href = "editar-dados.html";
  });
  myRequestsButton?.addEventListener("click", () => {
    void openRequestsModal();
  });
  logoutButton?.addEventListener("click", logout);
  root.addEventListener?.("click", closeAccountMenu);
  root.addEventListener?.("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeAccountMenu();
    closeLoginModal();
    closeRequestsModal();
  });

  render();

  return {
    render,
    openLoginModal,
    closeLoginModal,
    openRequestsModal,
    closeRequestsModal,
    logout,
    toggleAccountMenu,
  };

  function syncModalOpenState() {
    const isOpen = Boolean((modal && !modal.hidden) || (requestsModal && !requestsModal.hidden));
    root.body?.classList.toggle("modal-open", isOpen);
  }

  function renderRequestsLoading() {
    setText(requestsFeedback, "Carregando solicitações...");
    clearNode(requestsList);
  }

  function renderRequestsError() {
    setText(requestsFeedback, "Não foi possível carregar suas solicitações.");
    currentRequests = [];
    clearNode(requestsList);
  }

  function renderRequests(requests) {
    const normalizedRequests = Array.isArray(requests) ? requests : [];
    currentRequests = normalizedRequests;
    setText(requestsFeedback, "");
    clearNode(requestsList);

    if (!normalizedRequests.length) {
      requestsList.append(createRequestsEmptyState());
      return;
    }

    for (const request of normalizedRequests) {
      requestsList.append(createRequestItem(request));
    }
  }

  function createRequestsEmptyState() {
    return createNode("p", {
      className: "requests-empty",
      text: "Você ainda não enviou solicitações de adoção.",
    });
  }

  function createRequestItem(request) {
    const status = requestStatus(request?.status);
    const item = createNode("article", { className: "request-item" });
    const header = createNode("div", { className: "request-item-header" });
    const titleGroup = createNode("div", { className: "request-item-title" }, [
      createNode("strong", { text: request?.animalNome || "Animal" }),
      createNode("span", { text: request?.id ? `Solicitação #${request.id}` : "Solicitação" }),
    ]);
    const statusPill = createNode("span", {
      className: `requests-status requests-status-${status.tone}`,
      text: status.label,
    });
    const details = createNode("dl", { className: "request-item-details" }, [
      createRequestDetail("Enviada em", formatRequestDate(request?.dataSolicitacao)),
      createRequestDetail("Status", status.label),
    ]);

    header.append(titleGroup, statusPill);
    item.append(header, details);
    if (isCancelableRequest(request)) {
      item.append(createRequestActions(request));
    }
    return item;
  }

  function createRequestActions(request) {
    const cancelButton = createNode("button", {
      className: "button button-secondary request-cancel-button",
      text: "Cancelar solicitação",
      attrs: {
        type: "button",
        "data-request-cancel": String(request.id),
      },
    });
    cancelButton.addEventListener("click", () => {
      void cancelRequest(request, cancelButton);
    });

    return createNode("div", { className: "request-item-actions" }, [cancelButton]);
  }

  async function cancelRequest(request, button) {
    const currentUser = readCurrentUser(storage);
    if (!currentUser || currentUser.tipo !== "adotante" || !request?.id) {
      return;
    }

    button.disabled = true;
    button.textContent = "Cancelando...";
    setText(requestsFeedback, "");

    try {
      const canceledRequest = await apiClient.post(`/adocoes/${request.id}/cancelamento`, {
        adotanteId: currentUser.id,
      });
      currentRequests = currentRequests.map((item) => (
        Number(item?.id) === Number(canceledRequest?.id) ? canceledRequest : item
      ));
      renderRequests(currentRequests);
      setText(requestsFeedback, "Solicitação cancelada.");
    } catch {
      button.disabled = false;
      button.textContent = "Cancelar solicitação";
      setText(requestsFeedback, "Não foi possível cancelar esta solicitação.");
    }
  }

  function createRequestDetail(label, value) {
    return createNode("div", { className: "request-item-detail" }, [
      createNode("dt", { text: label }),
      createNode("dd", { text: value || "-" }),
    ]);
  }

  function createNode(tagName, options = {}, children = []) {
    const documentRef = requestsModal?.ownerDocument || root;
    const node = documentRef.createElement(tagName);

    if (options.className) {
      node.className = options.className;
    }
    if (options.text) {
      node.textContent = options.text;
    }
    for (const [name, value] of Object.entries(options.attrs || {})) {
      node.setAttribute(name, String(value));
    }
    node.append(...children);
    return node;
  }
}

function setHidden(node, hidden) {
  if (node) {
    node.hidden = hidden;
  }
}

function setText(node, text) {
  if (node) {
    node.textContent = text;
  }
}

function clearNode(node) {
  while (node?.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function requestStatus(status) {
  const normalized = String(status || "").toLowerCase();
  const statuses = {
    pendente: { label: "Pendente", tone: "pending" },
    em_analise: { label: "Em análise", tone: "analysis" },
    aprovada: { label: "Aprovada", tone: "approved" },
    recusada: { label: "Recusada", tone: "rejected" },
    cancelada: { label: "Cancelada", tone: "canceled" },
    finalizada: { label: "Finalizada", tone: "finished" },
  };

  return statuses[normalized] || { label: "Status indisponível", tone: "neutral" };
}

function isCancelableRequest(request) {
  return ["pendente", "em_analise"].includes(String(request?.status || "").toLowerCase());
}

function formatRequestDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function query(root, selector) {
  return root.querySelector?.(selector) || null;
}

function queryAll(root, selector) {
  return Array.from(root.querySelectorAll?.(selector) || []);
}

function createMemoryStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function getFormControl(form, name) {
  return form.elements?.namedItem?.(name) || form[name] || null;
}

function saveAdotanteIdIfAvailable(id) {
  if (globalThis.localStorage) {
    saveAdotanteId(globalThis.localStorage, id);
  }
}

function clearAdotanteIdIfAvailable() {
  if (globalThis.localStorage) {
    clearAdotanteId(globalThis.localStorage);
  }
}
