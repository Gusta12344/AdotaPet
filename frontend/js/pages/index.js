import { api } from "../api.js";
import { $, clearNode, element, renderAnimalCard, setFeedback } from "../ui.js";

const list = $("#animais-preview");
const feedback = $("#home-feedback");
const toolbar = $(".animal-toolbar");
const search = $("#animal-search");
const statusFilter = $("#animal-status-filter");
const speciesFilter = $("#animal-species-filter");
const sizeFilter = $("#animal-size-filter");
const ageFilter = $("#animal-age-filter");

let allAnimais = [];

async function loadAnimais() {
  if (!list) {
    return;
  }

  setFeedback(feedback, "Carregando animais disponiveis...");

  try {
    allAnimais = await api.get("/animais");
    renderAnimais();
    setFeedback(feedback, "");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}

function renderAnimais() {
  clearNode(list);

  const animais = getFilteredAnimais();
  if (!animais.length) {
    list.append(element("p", { className: "empty-state", text: "Nenhum animal encontrado com esses filtros." }));
    return;
  }

  for (const animal of animais.slice(0, 5)) {
    list.append(renderAnimalCard({ animal, compact: true }));
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

toolbar?.addEventListener("input", renderAnimais);
toolbar?.addEventListener("change", renderAnimais);
toolbar?.addEventListener("reset", () => {
  window.setTimeout(renderAnimais, 0);
});

loadAnimais();
