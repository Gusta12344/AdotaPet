const ENUMS = {
  tipoMoradia: ["apartamento", "casa_sem_quintal", "casa_com_quintal"],
  nivelAtividade: ["sedentario", "moderado", "ativo"],
  porte: ["pequeno", "medio", "grande"],
  porteComIndiferente: ["pequeno", "medio", "grande", "indiferente"],
  especie: ["cao", "gato", "outro"],
  especieComIndiferente: ["cao", "gato", "outro", "indiferente"],
  nivelEnergia: ["baixo", "medio", "alto"],
  statusSolicitacao: ["aprovada", "recusada"],
};

function readValue(data, key) {
  if (data instanceof FormData) {
    const value = data.get(key);
    return value == null ? "" : String(value).trim();
  }

  if (data instanceof Map) {
    const value = data.get(key);
    return value == null ? "" : String(value).trim();
  }

  const value = data?.[key];
  return value == null ? "" : String(value).trim();
}

function readBoolean(data, key) {
  if (data instanceof FormData || data instanceof Map) {
    return data.has(key);
  }

  return Boolean(data?.[key]);
}

function requireEnum(field, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`Valor invalido para ${field}`);
  }

  return value;
}

function requireInteger(field, value, { min = Number.MIN_SAFE_INTEGER } = {}) {
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number) || number < min) {
    throw new Error(`Valor invalido para ${field}`);
  }

  return number;
}

function optionalText(value, fallback = "") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export function validateRequiredFields(payload, fields) {
  return fields.filter((field) => {
    const value = payload[field];
    return value === null || value === undefined || value === "";
  });
}

export function buildAdotantePayload(data) {
  const payload = {
    nome: readValue(data, "nome"),
    cpf: readValue(data, "cpf"),
    email: readValue(data, "email").toLowerCase(),
    telefone: readValue(data, "telefone"),
    endereco: readValue(data, "endereco"),
    tipoMoradia: requireEnum("tipoMoradia", readValue(data, "tipoMoradia"), ENUMS.tipoMoradia),
    temCriancas: readBoolean(data, "temCriancas"),
    temOutrosAnimais: readBoolean(data, "temOutrosAnimais"),
    nivelAtividade: requireEnum("nivelAtividade", readValue(data, "nivelAtividade"), ENUMS.nivelAtividade),
    preferenciaPorte: requireEnum("preferenciaPorte", readValue(data, "preferenciaPorte"), ENUMS.porteComIndiferente),
    preferenciaEspecie: requireEnum("preferenciaEspecie", readValue(data, "preferenciaEspecie"), ENUMS.especieComIndiferente),
  };

  const missing = validateRequiredFields(payload, ["nome", "cpf", "email", "telefone", "endereco"]);
  if (missing.length > 0) {
    throw new Error(`Campos obrigatorios: ${missing.join(", ")}`);
  }

  return payload;
}

export function buildAnimalPayload(data) {
  const payload = {
    nome: readValue(data, "nome"),
    especie: requireEnum("especie", readValue(data, "especie"), ENUMS.especie),
    raca: optionalText(readValue(data, "raca"), "SRD"),
    idadeMeses: requireInteger("idadeMeses", readValue(data, "idadeMeses"), { min: 0 }),
    porte: requireEnum("porte", readValue(data, "porte"), ENUMS.porte),
    nivelEnergia: requireEnum("nivelEnergia", readValue(data, "nivelEnergia"), ENUMS.nivelEnergia),
    bomComCriancas: readBoolean(data, "bomComCriancas"),
    bomComAnimais: readBoolean(data, "bomComAnimais"),
    precisaEspaco: readBoolean(data, "precisaEspaco"),
    descricao: optionalText(readValue(data, "descricao")),
    protetorId: requireInteger("protetorId", readValue(data, "protetorId"), { min: 1 }),
  };

  const missing = validateRequiredFields(payload, ["nome", "especie", "idadeMeses", "porte", "nivelEnergia", "protetorId"]);
  if (missing.length > 0) {
    throw new Error(`Campos obrigatorios: ${missing.join(", ")}`);
  }

  return payload;
}

export function buildAnimalFormData(form) {
  const source = form?._data || new FormData(form);
  const payload = buildAnimalPayload(source);
  const multipart = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    multipart.append(key, String(value));
  }

  const files = Array.from(form?.elements?.imagens?.files || []);
  for (const file of files) {
    multipart.append("imagens", file);
  }

  return multipart;
}

export function buildSolicitacaoPayload(animalId, adotanteId) {
  return {
    animalId: requireInteger("animalId", animalId, { min: 1 }),
    adotanteId: requireInteger("adotanteId", adotanteId, { min: 1 }),
  };
}

export function buildSolicitacaoStatusPayload(status) {
  return {
    status: requireEnum("status", String(status || "").trim(), ENUMS.statusSolicitacao),
  };
}
