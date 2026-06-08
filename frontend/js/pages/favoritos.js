import { api } from "../api.js";
import { applyFavoriteButtonState, favoriteIdsFromAnimals, toggleFavorite } from "../favorites.js";
import { createHeaderAuthController } from "../header-auth.js";
import { loadRecommendationScores } from "../recommendations.js";
import { readAuthenticatedAdotanteId, requestLoginOnHome } from "../state.js";
import { $, clearNode, element, renderAnimalCard, setFeedback } from "../ui.js";

const list = $("#favoritos-list");
const feedback = $("#favoritos-feedback");
let favoriteIds = new Set();
let favoritos = [];
let recommendationScores = new Map();

createHeaderAuthController({
  onLogin: loadFavoritos,
  onLogout: redirectGuestToHomeLogin,
});

async function loadFavoritos() {
  if (!list) {
    return;
  }

  const adotanteId = readCurrentAdotanteId();
  clearNode(list);

  if (!adotanteId) {
    redirectGuestToHomeLogin();
    return;
  }

  setFeedback(feedback, "Carregando favoritos...");

  try {
    const [nextFavoritos, nextRecommendationScores] = await Promise.all([
      api.get(`/adotantes/${adotanteId}/favoritos`),
      loadRecommendationScores(adotanteId),
    ]);
    favoritos = Array.isArray(nextFavoritos) ? nextFavoritos : [];
    recommendationScores = nextRecommendationScores;
    favoriteIds = favoriteIdsFromAnimals(favoritos);
    renderFavoritos();
    setFeedback(feedback, "");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}

function renderFavoritos() {
  clearNode(list);

  if (!favoritos.length) {
    list.append(element("p", { className: "empty-state", text: "Nenhum animal favoritado ainda." }));
    return;
  }

  for (const animal of favoritos) {
    list.append(renderAnimalCard({
      animal,
      score: recommendationScores.get(Number(animal.id)),
      isFavorite: favoriteIds.has(Number(animal.id)),
      onFavoriteToggle: handleFavoriteToggle,
    }));
  }
}

async function handleFavoriteToggle({ animal, button }) {
  const adotanteId = readCurrentAdotanteId();
  if (!adotanteId) {
    redirectGuestToHomeLogin();
    return undefined;
  }

  button.disabled = true;

  try {
    const isFavorite = await toggleFavorite(animal, { adotanteId, favoriteIds });
    applyFavoriteButtonState(button, animal, isFavorite);
    favoritos = favoritos.filter((item) => Number(item.id) !== Number(animal.id));
    renderFavoritos();
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
  favoritos = [];
  favoriteIds = new Set();
  recommendationScores = new Map();
  requestLoginOnHome();

  if (globalThis.window?.location) {
    globalThis.window.location.href = "index.html?login=required";
    return;
  }

  if (!list) {
    return;
  }

  clearNode(list);
  list.append(element("p", { className: "empty-state", text: "Entre como adotante para ver seus favoritos." }));
  setFeedback(feedback, "Entre como adotante para ver seus favoritos.", "error");
}

loadFavoritos();
