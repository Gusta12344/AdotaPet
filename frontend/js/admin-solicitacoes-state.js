const ATTENTION_WEIGHT = {
  alta: 3,
  media: 2,
  baixa: 1,
};

export function groupRequestsByAnimal(requests = []) {
  const groups = [];
  const byAnimal = new Map();

  for (const request of requests) {
    const key = String(request?.animalId ?? request?.animalNome ?? groups.length);
    let group = byAnimal.get(key);

    if (!group) {
      group = createAnimalGroup(request);
      byAnimal.set(key, group);
      groups.push(group);
    }

    const clonedRequest = { ...request };
    group.solicitacoes.push(clonedRequest);
    group.totalSolicitacoes += 1;
    group.totalAtivas = Math.max(Number(group.totalAtivas) || 0, Number(request?.totalAtivas) || 0, group.solicitacoes.length);
    group.nivelAtencao = highestAttention(group.nivelAtencao, request?.nivelAtencao);
    group.statusResumo = summarizeStatus(group.statusResumo, request?.status);
  }

  return groups;
}

export function getAnimatedDropdownTransition(currentExpandedKey, targetKey) {
  const current = normalizeKey(currentExpandedKey);
  const target = normalizeKey(targetKey);

  if (!target) {
    return {
      nextExpandedKey: null,
      openingKey: null,
      closingKey: current,
    };
  }

  if (current === target) {
    return {
      nextExpandedKey: null,
      openingKey: null,
      closingKey: current,
    };
  }

  return {
    nextExpandedKey: target,
    openingKey: target,
    closingKey: current,
  };
}

export function getRequestReviewFlow(status) {
  return String(status || "").toLowerCase() === "pendente" ? "start_analysis" : "review";
}

export function canDeleteSolicitacao(request) {
  return ["finalizada", "cancelada"].includes(String(request?.status || "").toLowerCase());
}

function createAnimalGroup(request = {}) {
  const imagemUrls = [];
  if (Array.isArray(request.imagemUrls)) {
    imagemUrls.push(...request.imagemUrls);
  }
  if (request.imagemUrl) {
    imagemUrls.unshift(request.imagemUrl);
  }

  return {
    animalId: request.animalId,
    animalNome: request.animalNome || "Animal",
    animalResumo: request.animalResumo || "",
    especie: request.especie,
    imagemUrl: request.imagemUrl || "",
    imagemUrls,
    diasAnimalDisponivel: request.diasAnimalDisponivel,
    totalAtivas: Number(request.totalAtivas) || 0,
    totalSolicitacoes: 0,
    nivelAtencao: normalizeAttention(request.nivelAtencao),
    statusResumo: request.status || "",
    solicitacoes: [],
  };
}

function normalizeKey(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
}

function highestAttention(current, next) {
  const currentAttention = normalizeAttention(current);
  const nextAttention = normalizeAttention(next);
  return ATTENTION_WEIGHT[nextAttention] > ATTENTION_WEIGHT[currentAttention]
    ? nextAttention
    : currentAttention;
}

function normalizeAttention(value) {
  const normalized = String(value || "baixa").toLowerCase();
  return Object.prototype.hasOwnProperty.call(ATTENTION_WEIGHT, normalized) ? normalized : "baixa";
}

function summarizeStatus(current, next) {
  const values = [current, next].map((value) => String(value || "").toLowerCase());
  if (values.includes("em_analise")) {
    return "em_analise";
  }
  if (values.includes("pendente")) {
    return "pendente";
  }
  if (values.includes("aprovada")) {
    return "aprovada";
  }
  if (values.includes("recusada")) {
    return "recusada";
  }
  return next || current || "";
}
