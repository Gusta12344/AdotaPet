const ADOTANTE_ID_KEY = "adotapet.adotanteId";
const LAST_SOLICITACAO_KEY = "adotapet.lastSolicitacao";
const CURRENT_USER_KEY = "adotapet.currentUser";

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

  storage.setItem(CURRENT_USER_KEY, JSON.stringify({ id, nome, cpf, email, tipo }));
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
    return Number.isInteger(id) && id > 0 && nome && cpf && email && ["adotante", "admin"].includes(tipo)
      ? { id, nome, cpf, email, tipo }
      : null;
  } catch {
    return null;
  }
}

export function clearCurrentUser(storage) {
  storage.removeItem(CURRENT_USER_KEY);
}
