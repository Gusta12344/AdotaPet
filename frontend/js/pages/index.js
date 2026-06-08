import { api } from "../api.js";
import { enhanceSelectDropdowns } from "../dropdowns.js";
import { applyFavoriteButtonState, loadFavoriteIds, toggleFavorite } from "../favorites.js";
import { createHeaderAuthController } from "../header-auth.js";
import { loadRecommendationScores } from "../recommendations.js";
import { consumeLoginOnHome, readAuthenticatedAdotanteId } from "../state.js";
import { $, clearNode, element, renderAnimalCard, setFeedback } from "../ui.js";

const list = $("#animais-preview");
const feedback = $("#home-feedback");
const toolbar = $(".animal-toolbar");
const search = $("#animal-search");
const statusFilter = $("#animal-status-filter");
const speciesFilter = $("#animal-species-filter");
const sizeFilter = $("#animal-size-filter");
const ageFilter = $("#animal-age-filter");
const moreButton = $(".more-button");
const lessButton = $(".less-button");
const endMessage = $("#animais-end-message");

const INITIAL_VISIBLE_ANIMALS = 5;
const ANIMALS_PER_BATCH = 5;
const COLLAPSE_ANIMATION_MS = 260;
let allAnimais = [];
let visibleAnimalCount = INITIAL_VISIBLE_ANIMALS;
let favoriteIds = new Set();
let recommendationScores = new Map();

enhanceSelectDropdowns(toolbar);
const headerAuth = createHeaderAuthController({
  onLogin: () => {
    syncHomePersonalization()
      .then(renderAnimais)
      .catch((error) => setFeedback(feedback, error.message, "error"));
  },
});
if (shouldOpenLoginModalOnLoad()) {
  headerAuth.openLoginModal();
}

async function loadAnimais() {
  if (!list) {
    return;
  }

  setFeedback(feedback, "Carregando animais disponiveis...");

  try {
    allAnimais = await api.get("/animais");
    await syncHomePersonalization();
    resetPagination();
    renderAnimais();
    setFeedback(feedback, "");
  } catch (error) {
    setFeedback(feedback, getAnimalListErrorMessage(error), "error");
  }
}

function getAnimalListErrorMessage(error) {
  if (error?.status === 401) {
    return "Nao foi possivel carregar a lista de animais. Essa lista e publica.";
  }

  return error?.message || "Nao foi possivel carregar a lista de animais.";
}

function renderAnimais() {
  removePendingCollapsedCards();
  clearNode(list);

  const animais = getFilteredAnimais();
  if (!animais.length) {
    list.append(element("p", { className: "empty-state", text: "Nenhum animal encontrado com esses filtros." }));
    updatePaginationState(0);
    return;
  }

  visibleAnimalCount = Math.min(visibleAnimalCount, animais.length);
  const visibleAnimais = animais.slice(0, visibleAnimalCount);
  appendAnimalCards(visibleAnimais);
  updatePaginationState(animais.length);
}

function showMoreAnimais() {
  removePendingCollapsedCards();

  const animais = getFilteredAnimais();
  const previousCount = visibleAnimalCount;
  visibleAnimalCount = Math.min(visibleAnimalCount + ANIMALS_PER_BATCH, animais.length);

  appendAnimalCards(animais.slice(previousCount, visibleAnimalCount), { reveal: true });
  updatePaginationState(animais.length);
}

function showLessAnimais() {
  const animais = getFilteredAnimais();
  const nextVisibleCount = Math.max(visibleAnimalCount - ANIMALS_PER_BATCH, INITIAL_VISIBLE_ANIMALS);

  if (nextVisibleCount >= visibleAnimalCount) {
    return;
  }

  visibleAnimalCount = nextVisibleCount;
  collapseAnimalCardsFrom(nextVisibleCount);
  updatePaginationState(animais.length);
}

function resetPaginationAndRender() {
  resetPagination();
  renderAnimais();
}

function resetPagination() {
  visibleAnimalCount = INITIAL_VISIBLE_ANIMALS;
}

function appendAnimalCards(animais, { reveal = false } = {}) {
  for (const animal of animais) {
    const card = renderAnimalCard({
      animal,
      compact: true,
      score: recommendationScores.get(Number(animal.id)),
      isFavorite: favoriteIds.has(Number(animal.id)),
      onFavoriteToggle: handleFavoriteToggle,
    });
    if (reveal) {
      addClass(card, "animal-card-reveal");
    }
    list.append(card);
  }
}

async function syncHomePersonalization() {
  await Promise.all([
    syncFavoriteIds(),
    syncRecommendationScores(),
  ]);
}

async function syncFavoriteIds() {
  const adotanteId = readCurrentAdotanteId();
  favoriteIds = adotanteId ? await loadFavoriteIds(adotanteId) : new Set();
}

async function syncRecommendationScores() {
  const adotanteId = readCurrentAdotanteId();
  recommendationScores = await loadRecommendationScores(adotanteId);
}

async function handleFavoriteToggle({ animal, button }) {
  const adotanteId = readCurrentAdotanteId();
  if (!adotanteId) {
    setFeedback(feedback, "Entre como adotante para salvar favoritos.", "error");
    headerAuth.openLoginModal();
    return false;
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

function shouldOpenLoginModalOnLoad() {
  const params = new URLSearchParams(globalThis.window?.location?.search || "");
  const requestedByUrl = params.get("login") === "required";
  const requestedBySession = consumeLoginOnHome();

  if (requestedByUrl) {
    globalThis.window?.history?.replaceState?.(null, "", "index.html");
  }

  return requestedByUrl || requestedBySession;
}

function collapseAnimalCardsFrom(startIndex) {
  const cards = Array.from(list.children).slice(startIndex);
  for (const card of cards) {
    addClass(card, "animal-card-collapse");
    scheduleRemoval(card);
  }
}

function scheduleRemoval(card) {
  const setTimer = globalThis.window?.setTimeout || globalThis.setTimeout;
  setTimer(() => {
    if (card.parentNode === list) {
      list.removeChild(card);
    }
  }, COLLAPSE_ANIMATION_MS);
}

function removePendingCollapsedCards() {
  for (const card of Array.from(list.children)) {
    if (String(card.className || "").includes("animal-card-collapse") && card.parentNode === list) {
      list.removeChild(card);
    }
  }
}

function addClass(node, className) {
  if (node.classList) {
    node.classList.add(className);
    return;
  }

  const classes = new Set(String(node.className || "").split(/\s+/).filter(Boolean));
  classes.add(className);
  node.className = Array.from(classes).join(" ");
}

function updatePaginationState(total) {
  const hasAnimals = total > 0;
  const allVisible = hasAnimals && visibleAnimalCount >= total;

  if (moreButton) {
    moreButton.hidden = !hasAnimals || allVisible;
    moreButton.disabled = !hasAnimals || allVisible;
  }

  if (lessButton) {
    lessButton.hidden = !hasAnimals || visibleAnimalCount <= INITIAL_VISIBLE_ANIMALS;
    lessButton.disabled = !hasAnimals || visibleAnimalCount <= INITIAL_VISIBLE_ANIMALS;
  }

  if (endMessage) {
    endMessage.textContent = allVisible ? "Sem mais animais cadastrados." : "";
    endMessage.hidden = !allVisible;
  }
}

function getFilteredAnimais() {
  const query = normalize(search?.value || "");
  const selectedStatus = statusFilter?.value || "";
  const selectedSpecies = speciesFilter?.value || "";
  const selectedSize = sizeFilter?.value || "";
  const selectedAge = ageFilter?.value || "";

  return allAnimais.filter((animal) => {
    const animalAge = Number(animal.idadeMeses);
    const ageGroup = animalAge < 12 ? "filhote" : animalAge >= 96 ? "senior" : "adulto";
    const searchable = normalize(`${animal.nome} ${animal.especie} ${animal.porte} ${animal.raca || ""}`);

    return (!query || searchable.includes(query))
      && (!selectedStatus || animal.status === selectedStatus)
      && (!selectedSpecies || animal.especie === selectedSpecies)
      && (!selectedSize || animal.porte === selectedSize)
      && (!selectedAge || ageGroup === selectedAge);
  });
}

function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

toolbar?.addEventListener("input", resetPaginationAndRender);
toolbar?.addEventListener("change", resetPaginationAndRender);
toolbar?.addEventListener("reset", () => {
  window.setTimeout(resetPaginationAndRender, 0);
});
moreButton?.addEventListener("click", showMoreAnimais);
lessButton?.addEventListener("click", showLessAnimais);

loadAnimais();
