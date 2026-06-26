const DEFAULT_ORDER = "mais_recentes";

const SORTERS = {
  mais_recentes: (left, right) => compareDate(right, left) || compareName(left, right),
  mais_antigos: (left, right) => compareDate(left, right) || compareName(left, right),
  nome_az: (left, right) => compareName(left, right),
  nome_za: (left, right) => compareName(right, left),
};

export function filterAndSortAdminUsers(users = [], filters = {}) {
  const source = Array.isArray(users) ? users : [];
  const query = normalize(filters.query);
  const perfil = normalize(filters.perfil);
  const moradia = normalize(filters.moradia);
  const atividade = normalize(filters.atividade);
  const sorter = SORTERS[filters.ordem] || SORTERS[DEFAULT_ORDER];

  return source
    .filter((user) => (
      matchesQuery(user, query)
        && matchesPerfil(user, perfil)
        && matchesExact(user?.tipoMoradia, moradia)
        && matchesExact(user?.nivelAtividade, atividade)
    ))
    .sort(sorter);
}

export function paginateAdminUsers(items = [], page = 0, pageSize = 10) {
  const source = Array.isArray(items) ? items : [];
  const size = normalizePageSize(pageSize);
  const totalItems = source.length;
  const totalPages = Math.ceil(totalItems / size);
  const maxPage = Math.max(0, totalPages - 1);
  const requestedPage = Number(page);
  const safePage = Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 0;
  const currentPage = Math.max(0, Math.min(safePage, maxPage));
  const fromIndex = currentPage * size;
  const pageItems = source.slice(fromIndex, fromIndex + size);

  return {
    items: pageItems,
    page: currentPage,
    pageSize: size,
    totalItems,
    totalPages,
    first: currentPage === 0,
    last: totalPages === 0 || currentPage >= totalPages - 1,
    from: totalItems ? fromIndex + 1 : 0,
    to: totalItems ? fromIndex + pageItems.length : 0,
  };
}

function matchesQuery(user, query) {
  if (!query) {
    return true;
  }

  return normalize([
    user?.nome,
    user?.email,
    user?.cpf,
    user?.telefone,
    user?.endereco,
    user?.tipoMoradia,
    user?.nivelAtividade,
    user?.administrador ? "administrador admin usuario" : "adotante usuario",
  ].filter(Boolean).join(" ")).includes(query);
}

function matchesPerfil(user, perfil) {
  if (!perfil) {
    return true;
  }

  return perfil === "administrador" ? Boolean(user?.administrador) : !user?.administrador;
}

function matchesExact(value, expected) {
  return !expected || normalize(value) === expected;
}

function compareName(left, right) {
  return String(left?.nome || "").localeCompare(String(right?.nome || ""), "pt-BR", { sensitivity: "base" });
}

function compareDate(left, right) {
  return readDate(left) - readDate(right);
}

function readDate(user) {
  const value = user?.dataCadastro || user?.criadoEm || user?.dataCriacao;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizePageSize(value) {
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? Math.max(1, Math.trunc(size)) : 10;
}

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
