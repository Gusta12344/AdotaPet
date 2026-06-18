const DEFAULT_ORDER = "mais_recentes";

const SORTERS = {
  mais_recentes: (left, right) => compareDate(right, left) || compareName(left, right),
  mais_antigos: (left, right) => compareDate(left, right) || compareName(left, right),
  nome_az: (left, right) => compareName(left, right),
  nome_za: (left, right) => compareName(right, left),
  idade_menor: (left, right) => compareAge(left, right) || compareName(left, right),
  idade_maior: (left, right) => compareAge(right, left) || compareName(left, right),
};

export function filterAndSortAdminAnimals(animals = [], filters = {}) {
  const source = Array.isArray(animals) ? animals : [];
  const query = normalize(filters.query);
  const status = normalize(filters.status);
  const especie = normalize(filters.especie);
  const porte = normalize(filters.porte);
  const idade = normalize(filters.idade);
  const sorter = SORTERS[filters.ordem] || SORTERS[DEFAULT_ORDER];

  return source
    .filter((animal) => (
      matchesQuery(animal, query)
        && matchesExact(animal?.status, status)
        && matchesExact(animal?.especie, especie)
        && matchesExact(animal?.porte, porte)
        && (!idade || getAdminAnimalAgeGroup(animal) === idade)
    ))
    .sort(sorter);
}

export function getAdminAnimalAgeGroup(animal) {
  const age = Number(animal?.idadeMeses);
  if (Number.isFinite(age) && age < 12) {
    return "filhote";
  }
  if (Number.isFinite(age) && age >= 96) {
    return "senior";
  }
  return "adulto";
}

function matchesQuery(animal, query) {
  if (!query) {
    return true;
  }

  return normalize([
    animal?.nome,
    animal?.raca,
    animal?.especie,
    animal?.porte,
    animal?.status,
    animal?.protetorNome,
    animal?.nivelEnergia,
  ].filter(Boolean).join(" ")).includes(query);
}

function matchesExact(value, expected) {
  return !expected || normalize(value) === expected;
}

function compareName(left, right) {
  return String(left?.nome || "").localeCompare(String(right?.nome || ""), "pt-BR", { sensitivity: "base" });
}

function compareAge(left, right) {
  return readAge(left) - readAge(right);
}

function compareDate(left, right) {
  return readDate(left) - readDate(right);
}

function readAge(animal) {
  const value = Number(animal?.idadeMeses);
  return Number.isFinite(value) ? value : 0;
}

function readDate(animal) {
  const value = animal?.dataCadastro || animal?.criadoEm || animal?.dataCriacao || animal?.dataResgate;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
