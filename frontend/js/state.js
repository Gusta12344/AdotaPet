const ADOTANTE_ID_KEY = "adotapet.adotanteId";
const LAST_SOLICITACAO_KEY = "adotapet.lastSolicitacao";
const CURRENT_USER_KEY = "adotapet.currentUser";
const LOGIN_ON_HOME_KEY = "adotapet.loginOnHome";
const PROFILE_ENUMS = {
  tipoMoradia: ["apartamento", "casa_sem_quintal", "casa_com_quintal"],
  nivelAtividade: ["sedentario", "moderado", "ativo"],
  preferenciaPorte: ["pequeno", "medio", "grande", "indiferente"],
  preferenciaEspecie: ["cao", "gato", "outro", "indiferente"],
};

export function saveAdotanteId(storage, id) {
  const number = Number.parseInt(id, 10);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error("ID de adotante invalido");
  }

  storage.setItem(ADOTANTE_ID_KEY, String(number));
}

export function readAdotanteId(storage) {
  const number = Number.parseInt(storage.getItem(ADOTANTE_ID_KEY), 10);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function readAuthenticatedAdotanteId({
  sessionStorage = globalThis.sessionStorage,
  localStorage = globalThis.localStorage,
} = {}) {
  const user = sessionStorage ? readCurrentUser(sessionStorage) : null;
  if (!user || user.tipo !== "adotante") {
    clearStoredAdotanteId(localStorage);
    return null;
  }

  if (localStorage && readAdotanteId(localStorage) !== user.id) {
    saveAdotanteId(localStorage, user.id);
  }

  return user.id;
}

export function clearAdotanteId(storage) {
  storage.removeItem(ADOTANTE_ID_KEY);
}

export function saveLastSolicitacao(storage, solicitacao) {
  storage.setItem(LAST_SOLICITACAO_KEY, JSON.stringify({
    id: solicitacao.id,
    animalNome: solicitacao.animalNome,
    adotanteNome: solicitacao.adotanteNome,
    dataSolicitacao: solicitacao.dataSolicitacao,
  }));
}

export function readLastSolicitacao(storage) {
  const raw = storage.getItem(LAST_SOLICITACAO_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCurrentUser(storage, user) {
  const id = Number.parseInt(user?.id, 10);
  const nome = String(user?.nome || "").trim().replace(/\s+/g, " ");
  const cpf = String(user?.cpf || "").trim();
  const email = String(user?.email || "").trim().toLowerCase();
  const tipo = String(user?.tipo || "adotante").trim().toLowerCase();
  const profile = normalizeProfileFields(user);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID do usuario invalido");
  }
  if (!nome) {
    throw new Error("Nome do usuario invalido");
  }
  if (!cpf) {
    throw new Error("CPF do usuario invalido");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email do usuario invalido");
  }

  if (!["adotante", "admin"].includes(tipo)) {
    throw new Error("Tipo do usuario invalido");
  }

  storage.setItem(CURRENT_USER_KEY, JSON.stringify({ id, nome, cpf, email, tipo, ...profile }));
}

export function readCurrentUser(storage) {
  const raw = storage.getItem(CURRENT_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const user = JSON.parse(raw);
    const id = Number.parseInt(user?.id, 10);
    const nome = String(user?.nome || "").trim().replace(/\s+/g, " ");
    const cpf = String(user?.cpf || "").trim();
    const email = String(user?.email || "").trim().toLowerCase();
    const tipo = String(user?.tipo || "adotante").trim().toLowerCase();
    const profile = normalizeProfileFields(user);
    return Number.isInteger(id) && id > 0 && nome && cpf && email && ["adotante", "admin"].includes(tipo)
      ? { id, nome, cpf, email, tipo, ...profile }
      : null;
  } catch {
    return null;
  }
}

export function clearCurrentUser(storage) {
  storage.removeItem(CURRENT_USER_KEY);
}

export function requestLoginOnHome(storage = globalThis.sessionStorage) {
  storage?.setItem(LOGIN_ON_HOME_KEY, "1");
}

export function consumeLoginOnHome(storage = globalThis.sessionStorage) {
  if (!storage || storage.getItem(LOGIN_ON_HOME_KEY) !== "1") {
    return false;
  }

  storage.removeItem(LOGIN_ON_HOME_KEY);
  return true;
}

function clearStoredAdotanteId(storage) {
  if (storage) {
    clearAdotanteId(storage);
  }
}

function normalizeProfileFields(user) {
  const telefone = cleanOptionalText(user?.telefone);
  const endereco = cleanOptionalText(user?.endereco);
  const tipoMoradia = cleanOptionalEnum(user?.tipoMoradia, PROFILE_ENUMS.tipoMoradia);
  const nivelAtividade = cleanOptionalEnum(user?.nivelAtividade, PROFILE_ENUMS.nivelAtividade);
  const preferenciaPorte = cleanOptionalEnum(user?.preferenciaPorte, PROFILE_ENUMS.preferenciaPorte);
  const preferenciaEspecie = cleanOptionalEnum(user?.preferenciaEspecie, PROFILE_ENUMS.preferenciaEspecie);
  const profile = {};

  if (telefone) {
    profile.telefone = telefone;
  }
  if (endereco) {
    profile.endereco = endereco;
  }
  if (tipoMoradia) {
    profile.tipoMoradia = tipoMoradia;
  }
  if (nivelAtividade) {
    profile.nivelAtividade = nivelAtividade;
  }
  if (preferenciaPorte) {
    profile.preferenciaPorte = preferenciaPorte;
  }
  if (preferenciaEspecie) {
    profile.preferenciaEspecie = preferenciaEspecie;
  }

  if (typeof user?.temCriancas === "boolean") {
    profile.temCriancas = user.temCriancas;
  }
  if (typeof user?.temOutrosAnimais === "boolean") {
    profile.temOutrosAnimais = user.temOutrosAnimais;
  }

  return profile;
}

function cleanOptionalText(value) {
  return String(value || "").trim();
}

function cleanOptionalEnum(value, allowed) {
  const clean = String(value || "").trim().toLowerCase();
  return allowed.includes(clean) ? clean : "";
}
