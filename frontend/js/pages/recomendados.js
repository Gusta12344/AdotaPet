import { api } from "../api.js";
import { applyFavoriteButtonState, loadFavoriteIds, toggleFavorite } from "../favorites.js";
import { createHeaderAuthController } from "../header-auth.js";
import { readAdotanteId } from "../state.js";
import { $, clearNode, element, renderAnimalCard, setFeedback } from "../ui.js";

const list = $("#recomendados-list");
const feedback = $("#recomendados-feedback");
let adotanteId = readCurrentAdotanteId();
let favoriteIds = new Set();
createHeaderAuthController({
  onLogin(user) {
    if (user?.tipo === "adotante") {
      adotanteId = readCurrentAdotanteId();
      loadRecomendados();
    }
  },
});

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
    favoriteIds = await loadFavoriteIds(adotanteId);
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
        isFavorite: favoriteIds.has(Number(recomendacao.animal.id)),
        onFavoriteToggle: handleFavoriteToggle,
      }));
    }

    setFeedback(feedback, "");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}

async function handleFavoriteToggle({ animal, button }) {
  button.disabled = true;
  try {
    const isFavorite = await toggleFavorite(animal, { adotanteId, favoriteIds });
    applyFavoriteButtonState(button, animal, isFavorite);
    setFeedback(feedback, isFavorite ? "Animal adicionado aos favoritos." : "Animal removido dos favoritos.");
    return isFavorite;
  } catch (error) {
    setFeedback(feedback, error.message, "error");
    return undefined;
  } finally {
    button.disabled = false;
  }
}

function readCurrentAdotanteId() {
  return globalThis.localStorage ? readAdotanteId(globalThis.localStorage) : null;
}

loadRecomendados();
