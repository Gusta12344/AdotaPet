import { applyFavoriteButtonState, loadFavoriteIds, toggleFavorite } from "../favorites.js";
import { createHeaderAuthController } from "../header-auth.js";
import { loadRecommendations } from "../recommendations.js";
import { readAuthenticatedAdotanteId, requestLoginOnHome } from "../state.js";
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
  onLogout() {
    redirectGuestToHomeLogin();
  },
});

async function loadRecomendados() {
  if (!list) {
    return;
  }

  if (!adotanteId) {
    redirectGuestToHomeLogin();
    return;
  }

  setFeedback(feedback, "Calculando compatibilidade...");

  try {
    const recomendacoes = await loadRecommendations(adotanteId);
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

function renderGuestState() {
  if (!list) {
    return;
  }

  clearNode(list);
  list.append(element("p", {
    className: "empty-state",
    text: "Entre para ver recomendacoes personalizadas.",
  }));
  setFeedback(feedback, "Entre para ver suas recomendacoes.");
}

async function handleFavoriteToggle({ animal, button }) {
  adotanteId = readCurrentAdotanteId();
  if (!adotanteId) {
    redirectGuestToHomeLogin();
    return undefined;
  }

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
  return readAuthenticatedAdotanteId();
}

function redirectGuestToHomeLogin() {
  adotanteId = null;
  favoriteIds = new Set();
  requestLoginOnHome();

  if (globalThis.window?.location) {
    globalThis.window.location.href = "index.html?login=required";
    return;
  }

  renderGuestState();
}

loadRecomendados();
