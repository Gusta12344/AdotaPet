import { api } from "../api.js";
import { saveAdminCredentials } from "../auth.js";
import { enhanceSelectDropdowns } from "../dropdowns.js";
import { buildAdminUpdatePayload, buildAdotanteUpdatePayload } from "../forms.js";
import { createHeaderAuthController } from "../header-auth.js";
import { readCurrentUser, requestLoginOnHome, saveCurrentUser } from "../state.js";
import { $, setFeedback } from "../ui.js";

const form = $("#editar-dados-form");
const feedback = $("#editar-dados-feedback");
const layout = $("[data-profile-layout]");
const modePill = $("[data-profile-mode-pill]");
const modeTitle = $("[data-profile-mode-title]");
const modeLead = $("[data-profile-mode-lead]");
const summaryStatus = $("[data-profile-summary-status]");
const summaryName = $("[data-profile-summary-name]");
const summaryEmail = $("[data-profile-summary-email]");
const adotanteOnlySections = Array.from(document.querySelectorAll("[data-adotante-only]"));
const headerAuth = createHeaderAuthController({
  onLogin(user) {
    if (user?.tipo === "adotante" || user?.tipo === "admin") {
      loadProfile();
    }
  },
  onLogout: redirectGuestToHomeLogin,
});

const PROFILE_COPY = {
  adotante: {
    pill: "Conta do adotante",
    title: "Editar dados pessoais",
    lead: "Mantenha seu perfil atualizado para que as recomendacoes continuem alinhadas com sua rotina e seu lar.",
    summary: "Perfil ativo",
  },
  admin: {
    pill: "Conta administrativa",
    title: "Editar dados pessoais",
    lead: "Atualize os dados usados para acessar e operar o painel administrativo.",
    summary: "Acesso administrativo",
  },
};

enhanceSelectDropdowns(form);
loadProfile();

function loadProfile() {
  const user = readCurrentUser(sessionStorage);

  if (!user) {
    redirectGuestToHomeLogin();
    return;
  }

  if (user.tipo === "admin") {
    setProfileMode("admin");
    fillAdminForm(user);
    renderSummary(user);
    return;
  }

  if (user.tipo !== "adotante") {
    redirectGuestToHomeLogin();
    return;
  }

  setProfileMode("adotante");
  fillAdotanteForm(user);
  renderSummary(user);
}

function fillAdotanteForm(user) {
  setControlValue("nome", user.nome);
  setControlValue("cpf", user.cpf);
  setControlValue("email", user.email);
  setControlValue("telefone", user.telefone);
  setControlValue("endereco", user.endereco);
  setControlValue("tipoMoradia", user.tipoMoradia || "apartamento");
  setControlValue("nivelAtividade", user.nivelAtividade || "moderado");
  setControlValue("preferenciaPorte", user.preferenciaPorte || "indiferente");
  setControlValue("preferenciaEspecie", user.preferenciaEspecie || "indiferente");
  setControlChecked("temCriancas", Boolean(user.temCriancas));
  setControlChecked("temOutrosAnimais", Boolean(user.temOutrosAnimais));

  for (const select of form?.querySelectorAll?.("select") || []) {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function fillAdminForm(user) {
  setControlValue("nome", user.nome);
  setControlValue("cpf", user.cpf);
  setControlValue("email", user.email);
}

function renderSummary(user) {
  if (summaryName) {
    summaryName.textContent = user.nome;
  }
  if (summaryEmail) {
    summaryEmail.textContent = user.email;
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currentUser = readCurrentUser(sessionStorage);
  if (!currentUser || currentUser.tipo !== "adotante") {
    if (currentUser?.tipo === "admin") {
      await saveAdminProfile(currentUser);
      return;
    }

    setFeedback(feedback, "Sessao de usuario nao encontrada. Faca login novamente.", "error");
    redirectGuestToHomeLogin();
    return;
  }

  await saveAdotanteProfile(currentUser);
});

async function saveAdotanteProfile(currentUser) {
  setFeedback(feedback, "Salvando alteracoes...");

  try {
    const payload = buildAdotanteUpdatePayload(new FormData(form));
    const adotante = await api.put(`/adotantes/${currentUser.id}`, payload);
    const nextUser = {
      id: adotante.id,
      nome: adotante.nome,
      cpf: adotante.cpf || currentUser.cpf,
      email: adotante.email,
      tipo: "adotante",
      telefone: adotante.telefone,
      endereco: adotante.endereco,
      tipoMoradia: adotante.tipoMoradia,
      temCriancas: adotante.temCriancas,
      temOutrosAnimais: adotante.temOutrosAnimais,
      nivelAtividade: adotante.nivelAtividade,
      preferenciaPorte: adotante.preferenciaPorte,
      preferenciaEspecie: adotante.preferenciaEspecie,
    };

    saveCurrentUser(sessionStorage, nextUser);
    fillAdotanteForm(nextUser);
    renderSummary(nextUser);
    headerAuth.render();
    resetPasswordFields();
    setFeedback(feedback, "Dados pessoais atualizados com sucesso.", "success");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}

async function saveAdminProfile(currentUser) {
  setFeedback(feedback, "Salvando alteracoes...");

  try {
    const payload = buildAdminUpdatePayload(new FormData(form));
    const admin = await api.put("/admin/me", payload, { auth: true });
    const nextUser = {
      id: admin.id,
      nome: admin.nome,
      cpf: admin.cpf || currentUser.cpf,
      email: admin.email,
      tipo: "admin",
    };

    saveCurrentUser(sessionStorage, nextUser);
    saveAdminCredentials(sessionStorage, nextUser.email, payload.novaSenha || payload.senhaAtual);
    fillAdminForm(nextUser);
    renderSummary(nextUser);
    headerAuth.render();
    resetPasswordFields();
    setFeedback(feedback, "Dados pessoais atualizados com sucesso.", "success");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}

function setProfileMode(mode) {
  const copy = PROFILE_COPY[mode] || PROFILE_COPY.adotante;
  const isAdmin = mode === "admin";

  setText(modePill, copy.pill);
  setText(modeTitle, copy.title);
  setText(modeLead, copy.lead);
  setText(summaryStatus, copy.summary);
  layout?.classList.toggle("profile-admin-layout", isAdmin);

  for (const section of adotanteOnlySections) {
    section.hidden = isAdmin;
    for (const control of section.querySelectorAll("input, select, textarea, button")) {
      control.disabled = isAdmin;
    }
  }
}

function setControlValue(name, value) {
  const control = form?.elements?.namedItem?.(name);
  if (control) {
    control.value = value || "";
  }
}

function setControlChecked(name, checked) {
  const control = form?.elements?.namedItem?.(name);
  if (control) {
    control.checked = checked;
  }
}

function resetPasswordFields() {
  setControlValue("senhaAtual", "");
  setControlValue("novaSenha", "");
}

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function redirectGuestToHomeLogin() {
  requestLoginOnHome();

  if (globalThis.window?.location) {
    globalThis.window.location.href = "index.html?login=required";
    return;
  }

  setFeedback(feedback, "Entre como adotante para editar seus dados pessoais.", "error");
  headerAuth.openLoginModal();
}
