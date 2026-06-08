import { api } from "./api.js";

export async function loadRecommendations(adotanteId, { apiClient = api } = {}) {
  if (!adotanteId) {
    return [];
  }

  const recommendations = await apiClient.get(`/animais/recomendados/${adotanteId}`);
  return Array.isArray(recommendations) ? recommendations : [];
}

export async function loadRecommendationScores(adotanteId, options = {}) {
  return recommendationScoreMap(await loadRecommendations(adotanteId, options));
}

export function recommendationScoreMap(recommendations) {
  const scores = new Map();

  for (const recommendation of Array.isArray(recommendations) ? recommendations : []) {
    const animalId = Number(recommendation?.animal?.id);
    const score = Number(recommendation?.score);

    if (Number.isInteger(animalId) && animalId > 0 && Number.isFinite(score)) {
      scores.set(animalId, score);
    }
  }

  return scores;
}
