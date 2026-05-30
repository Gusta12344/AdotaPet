const ENUMS = {
  tipoMoradia: ["apartamento", "casa_sem_quintal", "casa_com_quintal"],
  nivelAtividade: ["sedentario", "moderado", "ativo"],
  porte: ["pequeno", "medio", "grande"],
  porteComIndiferente: ["pequeno", "medio", "grande", "indiferente"],
  sexo: ["macho", "femea"],
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

function requireDate(field, value) {
  const clean = String(value || "").trim();
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (!parts) {
    throw new Error(`Valor invalido para ${field}`);
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Valor invalido para ${field}`);
  }

  return clean;
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
    senha: readValue(data, "senha"),
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

  const missing = validateRequiredFields(payload, ["nome", "cpf", "senha", "email", "telefone", "endereco"]);
  if (missing.length > 0) {
    throw new Error(`Campos obrigatorios: ${missing.join(", ")}`);
  }

  return payload;
}

export function buildAdotanteUpdatePayload(data) {
  const payload = {
    nome: readValue(data, "nome"),
    email: readValue(data, "email").toLowerCase(),
    telefone: readValue(data, "telefone"),
    endereco: readValue(data, "endereco"),
    tipoMoradia: requireEnum("tipoMoradia", readValue(data, "tipoMoradia"), ENUMS.tipoMoradia),
    temCriancas: readBoolean(data, "temCriancas"),
    temOutrosAnimais: readBoolean(data, "temOutrosAnimais"),
    nivelAtividade: requireEnum("nivelAtividade", readValue(data, "nivelAtividade"), ENUMS.nivelAtividade),
    preferenciaPorte: requireEnum("preferenciaPorte", readValue(data, "preferenciaPorte"), ENUMS.porteComIndiferente),
    preferenciaEspecie: requireEnum("preferenciaEspecie", readValue(data, "preferenciaEspecie"), ENUMS.especieComIndiferente),
    senhaAtual: readValue(data, "senhaAtual"),
    novaSenha: readValue(data, "novaSenha"),
  };

  const missing = validateRequiredFields(payload, ["nome", "email", "telefone", "endereco", "senhaAtual"]);
  if (missing.length > 0) {
    throw new Error(`Campos obrigatorios: ${missing.join(", ")}`);
  }

  if (payload.novaSenha && payload.novaSenha.length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres");
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
    sexo: requireEnum("sexo", readValue(data, "sexo"), ENUMS.sexo),
    dataResgate: requireDate("dataResgate", readValue(data, "dataResgate")),
    nivelEnergia: requireEnum("nivelEnergia", readValue(data, "nivelEnergia"), ENUMS.nivelEnergia),
    bomComCriancas: readBoolean(data, "bomComCriancas"),
    bomComAnimais: readBoolean(data, "bomComAnimais"),
    precisaEspaco: readBoolean(data, "precisaEspaco"),
    microchip: readBoolean(data, "microchip"),
    castrado: readBoolean(data, "castrado"),
    vermifugado: readBoolean(data, "vermifugado"),
    vacinado: readBoolean(data, "vacinado"),
    descricao: optionalText(readValue(data, "descricao")),
    protetorId: requireInteger("protetorId", readValue(data, "protetorId"), { min: 1 }),
  };

  const missing = validateRequiredFields(payload, [
    "nome",
    "especie",
    "idadeMeses",
    "porte",
    "sexo",
    "dataResgate",
    "nivelEnergia",
    "protetorId",
  ]);
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
