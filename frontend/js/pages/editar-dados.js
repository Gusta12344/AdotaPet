import { api } from "../api.js";
import { enhanceSelectDropdowns } from "../dropdowns.js";
import { buildAdotanteUpdatePayload } from "../forms.js";
import { createHeaderAuthController } from "../header-auth.js";
import { readCurrentUser, requestLoginOnHome, saveCurrentUser } from "../state.js";
import { $, setFeedback } from "../ui.js";

const form = $("#editar-dados-form");
const feedback = $("#editar-dados-feedback");
const summaryName = $("[data-profile-summary-name]");
const summaryEmail = $("[data-profile-summary-email]");
const headerAuth = createHeaderAuthController({
  onLogin(user) {
    if (user?.tipo === "adotante") {
      loadProfile();
    }
  },
  onLogout: redirectGuestToHomeLogin,
});

enhanceSelectDropdowns(form);
loadProfile();

function loadProfile() {
  const user = readCurrentUser(sessionStorage);

  if (!user || user.tipo !== "adotante") {
    redirectGuestToHomeLogin();
    return;
  }

  fillForm(user);
  renderSummary(user);
}

function fillForm(user) {
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
    setFeedback(feedback, "Sessao de adotante nao encontrada. Faca login novamente.", "error");
    redirectGuestToHomeLogin();
    return;
  }

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
    fillForm(nextUser);
    renderSummary(nextUser);
    headerAuth.render();
    resetPasswordFields();
    setFeedback(feedback, "Dados pessoais atualizados com sucesso.", "success");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
});

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

function redirectGuestToHomeLogin() {
  requestLoginOnHome();

  if (globalThis.window?.location) {
    globalThis.window.location.href = "index.html?login=required";
    return;
  }

  setFeedback(feedback, "Entre como adotante para editar seus dados pessoais.", "error");
  headerAuth.openLoginModal();
}
