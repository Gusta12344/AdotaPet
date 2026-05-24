import { api } from "../api.js";
import { buildSolicitacaoPayload } from "../forms.js";
import { readAdotanteId, saveLastSolicitacao } from "../state.js";
import { $, clearNode, element, formatAge, formatBoolean, formatEnum, setFeedback } from "../ui.js";

const detail = $("#animal-detail");
const feedback = $("#animal-feedback");
const action = $("#solicitar-adocao");
const params = new URLSearchParams(window.location.search);
const animalId = Number.parseInt(params.get("id"), 10);

let loadedAnimal = null;

function renderDetail(animal) {
  clearNode(detail);
  detail.append(
    element("section", { className: "detail-panel" }, [
      element("div", { className: "detail-heading" }, [
        element("div", {}, [
          element("p", { className: "overline", text: formatEnum(animal.status) }),
          element("h1", { text: animal.nome }),
          element("p", { className: "lead", text: animal.descricao || "Animal cadastrado no AdotaPet." }),
        ]),
      ]),
      element("dl", { className: "detail-grid" }, [
        fact("Especie", formatEnum(animal.especie)),
        fact("Porte", formatEnum(animal.porte)),
        fact("Idade", formatAge(animal.idadeMeses)),
        fact("Energia", formatEnum(animal.nivelEnergia)),
        fact("Bom com criancas", formatBoolean(animal.bomComCriancas)),
        fact("Bom com outros animais", formatBoolean(animal.bomComAnimais)),
        fact("Precisa de espaco", formatBoolean(animal.precisaEspaco)),
        fact("Protetor", animal.protetorNome || "-"),
      ]),
    ])
  );

  if (action) {
    action.disabled = animal.status === "adotado";
    action.textContent = animal.status === "adotado" ? "Animal ja adotado" : "Solicitar adocao";
  }
}

function fact(label, value) {
  return element("div", { className: "detail-fact" }, [
    element("dt", { text: label }),
    element("dd", { text: value }),
  ]);
}

async function loadAnimal() {
  if (!Number.isInteger(animalId) || animalId <= 0) {
    setFeedback(feedback, "Animal invalido.", "error");
    action.disabled = true;
    return;
  }

  setFeedback(feedback, "Carregando animal...");

  try {
    loadedAnimal = await api.get(`/animais/${animalId}`);
    renderDetail(loadedAnimal);
    setFeedback(feedback, "");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
    action.disabled = true;
  }
}

action?.addEventListener("click", async () => {
  const adotanteId = readAdotanteId(localStorage);
  if (!adotanteId) {
    window.location.href = "cadastro.html";
    return;
  }

  setFeedback(feedback, "Registrando solicitacao...");

  try {
    const payload = buildSolicitacaoPayload(animalId, adotanteId);
    const solicitacao = await api.post("/adocoes", payload);
    saveLastSolicitacao(sessionStorage, solicitacao);
    window.location.href = `confirmacao.html?solicitacaoId=${solicitacao.id}`;
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
});

loadAnimal();
