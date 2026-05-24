const ADOTANTE_ID_KEY = "adotapet.adotanteId";
const LAST_SOLICITACAO_KEY = "adotapet.lastSolicitacao";

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
