import { api } from "../api.js";
import { $, clearNode, element, renderAnimalCard, setFeedback } from "../ui.js";

const list = $("#animais-preview");
const feedback = $("#home-feedback");

async function loadAnimais() {
  if (!list) {
    return;
  }

  setFeedback(feedback, "Carregando animais disponiveis...");

  try {
    const animais = await api.get("/animais");
    clearNode(list);

    if (!animais.length) {
      list.append(element("p", { className: "empty-state", text: "Nenhum animal disponivel no momento." }));
      setFeedback(feedback, "");
      return;
    }

    for (const animal of animais.slice(0, 6)) {
      list.append(renderAnimalCard({ animal, compact: true }));
    }

    setFeedback(feedback, "");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}

loadAnimais();
