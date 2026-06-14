const VALID_STATUS = new Set(["pendente", "em_analise", "aprovada", "recusada"]);
const VALID_ORDER = new Set(["mais_antigas", "mais_recentes"]);

export function createModeracaoState(overrides = {}) {
  return {
    status: "pendente",
    q: "",
    ordem: "mais_antigas",
    grupos: [],
    resumo: null,
    selectedId: null,
    detalhe: null,
    loading: false,
    message: "",
    ...overrides,
  };
}

export function normalizeModeracaoFilters(filters = {}) {
  const status = filters.status === "" ? "" : VALID_STATUS.has(filters.status) ? filters.status : "pendente";
  const ordem = VALID_ORDER.has(filters.ordem) ? filters.ordem : "mais_antigas";
  return {
    status,
    q: String(filters.q || "").trim(),
    ordem,
  };
}

export function selectFirstSolicitacao(grupos = []) {
  for (const grupo of grupos) {
    const solicitacao = grupo?.solicitacoes?.[0];
    if (solicitacao) {
      return solicitacao.id;
    }
  }
  return null;
}

export function syncQueueAnimalImage(grupos = [], detalhe = {}) {
  const animal = detalhe?.animal || {};
  const animalId = animal.id;
  const imageUrl = String(animal.imagemUrl || "").trim();
  const especie = String(animal.especie || "").trim();

  if (!animalId || (!imageUrl && !especie)) {
    return grupos;
  }

  return grupos.map((grupo) => {
    if (grupo?.animalId !== animalId) {
      return grupo;
    }

    const imagemUrls = Array.isArray(grupo.imagemUrls) ? [...grupo.imagemUrls] : [];
    if (imageUrl && !imagemUrls.some((url) => String(url || "").trim() === imageUrl)) {
      imagemUrls.unshift(imageUrl);
    }

    return {
      ...grupo,
      especie: grupo.especie || especie || undefined,
      imagemUrl: grupo.imagemUrl || imageUrl,
      imagemUrls,
    };
  });
}

export function buildChecklistPayload(formOrValues = {}) {
  const values = readValues(formOrValues);
  return {
    dadosAdotanteConferidos: Boolean(values.dadosAdotanteConferidos),
    animalDisponivelConferido: Boolean(values.animalDisponivelConferido),
    contatoRevisado: Boolean(values.contatoRevisado),
    observacaoAdmin: String(values.observacaoAdmin || "").trim(),
  };
}

export function buildDecisaoPayload(status, formOrValues = {}) {
  return {
    status,
    ...buildChecklistPayload(formOrValues),
  };
}

export function canApproveSolicitacao(detalhe) {
  const checklist = detalhe?.checklist || {};
  return Boolean(
    detalhe?.podeAprovar
    && checklist.dadosAdotanteConferidos
    && checklist.animalDisponivelConferido
    && checklist.contatoRevisado
  );
}

export function statusTabs() {
  return [
    { value: "pendente", label: "Pendentes", countKey: "pendentes", tone: "amber" },
    { value: "em_analise", label: "Em analise", countKey: "emAnalise", tone: "green" },
    { value: "aprovada", label: "Aprovadas", countKey: "aprovadas", tone: "mint" },
    { value: "recusada", label: "Recusadas", countKey: "recusadas", tone: "coral" },
  ];
}

function readValues(source) {
  if (source instanceof FormData) {
    return {
      dadosAdotanteConferidos: source.get("dadosAdotanteConferidos") === "on",
      animalDisponivelConferido: source.get("animalDisponivelConferido") === "on",
      contatoRevisado: source.get("contatoRevisado") === "on",
      observacaoAdmin: source.get("observacaoAdmin") || "",
    };
  }

  if (source?.elements) {
    return {
      dadosAdotanteConferidos: source.elements.namedItem("dadosAdotanteConferidos")?.checked,
      animalDisponivelConferido: source.elements.namedItem("animalDisponivelConferido")?.checked,
      contatoRevisado: source.elements.namedItem("contatoRevisado")?.checked,
      observacaoAdmin: source.elements.namedItem("observacaoAdmin")?.value || "",
    };
  }

  return source || {};
}
