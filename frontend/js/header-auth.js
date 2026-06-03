import { api } from "./api.js";
import { clearAdminCredentials, saveAdminCredentials } from "./auth.js";
import { createNotificationCenter } from "./notifications.js";
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
  onLogin = null,
  onLogout = null,
} = {}) {
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
  const notificationCenter = createNotificationCenter({
    root,
    storage: globalThis.localStorage || createMemoryStorage(),
  });

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
    root.body?.classList.add("modal-open");
    globalThis.requestAnimationFrame?.(() => cpfInput?.focus());
  }

  function closeLoginModal() {
    if (!modal) {
      return;
    }

    modal.hidden = true;
    root.body?.classList.remove("modal-open");
    setText(loginFeedback, "");
  }

  async function submitLogin(event) {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const cpf = formData.get("cpf");
    const senha = String(formData.get("senha") || "").trim();

    try {
      const response = await api.post("/auth/login", { cpf, senha });
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

  function logout() {
    clearCurrentUser(storage);
    clearAdminCredentials(storage);
    clearAdotanteIdIfAvailable();
    closeAccountMenu();
    closeLoginModal();
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
    const currentUser = readCurrentUser(storage);
    window.location.href = currentUser?.tipo === "admin" ? "admin-painel.html" : "editar-dados.html";
  });
  logoutButton?.addEventListener("click", logout);
  root.addEventListener?.("click", closeAccountMenu);
  root.addEventListener?.("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeAccountMenu();
    closeLoginModal();
  });

  render();

  return {
    render,
    openLoginModal,
    closeLoginModal,
    logout,
    toggleAccountMenu,
  };
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
