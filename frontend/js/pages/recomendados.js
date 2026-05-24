import { api } from "../api.js";
import { readAdotanteId } from "../state.js";
import { $, clearNode, element, renderAnimalCard, setFeedback } from "../ui.js";

const list = $("#recomendados-list");
const feedback = $("#recomendados-feedback");
const adotanteId = readAdotanteId(localStorage);

async function loadRecomendados() {
  if (!list) {
    return;
  }

  if (!adotanteId) {
    clearNode(list);
    list.append(element("p", { className: "empty-state", text: "Cadastre seu perfil antes de ver recomendacoes." }));
    setFeedback(feedback, "Perfil de adotante nao encontrado.", "error");
    return;
  }

  setFeedback(feedback, "Calculando compatibilidade...");

  try {
    const recomendacoes = await api.get(`/animais/recomendados/${adotanteId}`);
    clearNode(list);

    if (!recomendacoes.length) {
      list.append(element("p", { className: "empty-state", text: "Nao ha animais disponiveis para recomendacao no momento." }));
      setFeedback(feedback, "");
      return;
    }

    for (const recomendacao of recomendacoes) {
      list.append(renderAnimalCard({
        animal: recomendacao.animal,
        score: recomendacao.score,
      }));
    }

    setFeedback(feedback, "");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}

loadRecomendados();
