import { api } from "./api.js";

export function getFavoriteButtonState(animal, isFavorite, { baseClass = "favorite-toggle" } = {}) {
  const nome = String(animal?.nome || "animal").trim() || "animal";
  const active = Boolean(isFavorite);

  return {
    className: active ? `${baseClass} ${baseClass}-active` : baseClass,
    ariaLabel: active ? `Remover ${nome} dos favoritos` : `Salvar ${nome} nos favoritos`,
    ariaPressed: String(active),
    title: active ? "Remover dos favoritos" : "Salvar nos favoritos",
  };
}

export function applyFavoriteButtonState(button, animal, isFavorite, options = {}) {
  if (!button) {
    return;
  }

  const state = getFavoriteButtonState(animal, isFavorite, options);
  button.className = state.className;
  button.setAttribute("aria-label", state.ariaLabel);
  button.setAttribute("aria-pressed", state.ariaPressed);
  button.setAttribute("title", state.title);
}

export function favoriteIdsFromAnimals(animais) {
  return new Set((Array.isArray(animais) ? animais : [])
    .map((animal) => Number(animal?.id))
    .filter((id) => Number.isInteger(id) && id > 0));
}

export async function loadFavoriteIds(adotanteId, { apiClient = api } = {}) {
  if (!adotanteId) {
    return new Set();
  }

  return favoriteIdsFromAnimals(await apiClient.get(`/adotantes/${adotanteId}/favoritos`));
}

export async function toggleFavorite(animal, { adotanteId, favoriteIds, apiClient = api } = {}) {
  const animalId = Number(animal?.id);
  if (!Number.isInteger(animalId) || animalId <= 0) {
    throw new Error("Animal invalido para favoritos");
  }
  if (!adotanteId) {
    throw new Error("Entre como adotante para salvar favoritos.");
  }

  const favorites = favoriteIds || new Set();
  const isFavorite = favorites.has(animalId);

  if (isFavorite) {
    await apiClient.delete(`/adotantes/${adotanteId}/favoritos/${animalId}`);
    favorites.delete(animalId);
    return false;
  }

  await apiClient.post(`/adotantes/${adotanteId}/favoritos/${animalId}`, null);
  favorites.add(animalId);
  return true;
}
