import { api } from "../api.js";
import { clearAdminCredentials, readAdminCredentials } from "../auth.js";
import { buildAnimalPayload, buildSolicitacaoStatusPayload } from "../forms.js";
import { $, clearNode, element, formatEnum, setFeedback } from "../ui.js";

const credentials = readAdminCredentials(sessionStorage);
const animalForm = $("#animal-form");
const animalFeedback = $("#animal-feedback");
const filaFeedback = $("#fila-feedback");
const filaList = $("#fila-list");
const logout = $("#admin-logout");

if (!credentials) {
  window.location.href = "admin.html";
}

logout?.addEventListener("click", () => {
  clearAdminCredentials(sessionStorage);
  window.location.href = "admin.html";
});

animalForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFeedback(animalFeedback, "Cadastrando animal...");

  try {
    const payload = buildAnimalPayload(new FormData(animalForm));
    await api.post("/animais", payload, { auth: true });
    animalForm.reset();
    setFeedback(animalFeedback, "Animal cadastrado com sucesso.", "success");
  } catch (error) {
    setFeedback(animalFeedback, error.message, "error");
  }
});

async function loadFila() {
  if (!filaList) {
    return;
  }

  setFeedback(filaFeedback, "Carregando fila...");

  try {
    const fila = await api.get("/adocoes", { auth: true });
    clearNode(filaList);

    if (!fila.length) {
      filaList.append(element("p", { className: "empty-state", text: "Nenhuma solicitacao pendente." }));
      setFeedback(filaFeedback, "");
      return;
    }

    for (const solicitacao of fila) {
      filaList.append(renderSolicitacao(solicitacao));
    }

    setFeedback(filaFeedback, "");
  } catch (error) {
    setFeedback(filaFeedback, error.message, "error");
  }
}

function renderSolicitacao(solicitacao) {
  const item = element("article", { className: "queue-item" }, [
    element("div", {}, [
      element("p", { className: "overline", text: `Solicitacao #${solicitacao.id}` }),
      element("h3", { text: solicitacao.animalNome }),
      element("p", { className: "muted", text: `${solicitacao.adotanteNome} - ${solicitacao.adotanteEmail}` }),
      element("p", { className: "muted", text: `Status do animal: ${formatEnum(solicitacao.animalStatus)}` }),
    ]),
  ]);

  const actions = element("div", { className: "queue-actions" }, [
    element("button", {
      className: "button button-success",
      type: "button",
      text: "Aprovar",
      onclick: () => updateSolicitacao(solicitacao.id, "aprovada"),
    }),
    element("button", {
      className: "button button-danger",
      type: "button",
      text: "Recusar",
      onclick: () => updateSolicitacao(solicitacao.id, "recusada"),
    }),
  ]);

  item.append(actions);
  return item;
}

async function updateSolicitacao(id, status) {
  setFeedback(filaFeedback, "Processando solicitacao...");

  try {
    await api.put(`/adocoes/${id}`, buildSolicitacaoStatusPayload(status), { auth: true });
    await loadFila();
    setFeedback(filaFeedback, "Fila atualizada.", "success");
  } catch (error) {
    setFeedback(filaFeedback, error.message, "error");
  }
}

loadFila();
