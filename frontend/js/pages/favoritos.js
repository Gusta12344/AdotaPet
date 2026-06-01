import { api } from "../api.js";
import { applyFavoriteButtonState, favoriteIdsFromAnimals, toggleFavorite } from "../favorites.js";
import { createHeaderAuthController } from "../header-auth.js";
import { readAdotanteId } from "../state.js";
import { $, clearNode, element, renderAnimalCard, setFeedback } from "../ui.js";

const list = $("#favoritos-list");
const feedback = $("#favoritos-feedback");
let favoriteIds = new Set();
let favoritos = [];

createHeaderAuthController({
  onLogin: loadFavoritos,
});

async function loadFavoritos() {
  if (!list) {
    return;
  }

  const adotanteId = readCurrentAdotanteId();
  clearNode(list);

  if (!adotanteId) {
    favoritos = [];
    favoriteIds = new Set();
    list.append(element("p", { className: "empty-state", text: "Entre como adotante para ver seus favoritos." }));
    setFeedback(feedback, "Perfil de adotante nao encontrado.", "error");
    return;
  }

  setFeedback(feedback, "Carregando favoritos...");

  try {
    favoritos = await api.get(`/adotantes/${adotanteId}/favoritos`);
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
      isFavorite: favoriteIds.has(Number(animal.id)),
      onFavoriteToggle: handleFavoriteToggle,
    }));
  }
}

async function handleFavoriteToggle({ animal, button }) {
  const adotanteId = readCurrentAdotanteId();
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
  return globalThis.localStorage ? readAdotanteId(globalThis.localStorage) : null;
}

loadFavoritos();
