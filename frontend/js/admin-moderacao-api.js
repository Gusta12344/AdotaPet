import { api } from "./api.js";

const BASE = "/admin/moderacao";

export function fetchModeracaoResumo(apiClient = api) {
  return apiClient.get(`${BASE}/resumo`, { auth: true });
}

export function fetchModeracaoFila(filters = {}, apiClient = api) {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.ordem) {
    params.set("ordem", filters.ordem);
  }
  const query = params.toString();
  return apiClient.get(`${BASE}/solicitacoes${query ? `?${query}` : ""}`, { auth: true });
}

export function fetchModeracaoSolicitacoesLista(filters = {}, apiClient = api) {
  const params = new URLSearchParams();
  for (const key of ["status", "atencao", "especie", "perfil", "q", "ordem", "pagina", "tamanho"]) {
    const value = filters[key];
    if (value !== undefined && value !== null && String(value) !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return apiClient.get(`${BASE}/solicitacoes/lista${query ? `?${query}` : ""}`, { auth: true });
}

export function fetchModeracaoDetalhe(id, apiClient = api) {
  return apiClient.get(`${BASE}/solicitacoes/${id}`, { auth: true });
}

export function iniciarModeracaoAnalise(id, apiClient = api) {
  return apiClient.post(`${BASE}/solicitacoes/${id}/analise`, {}, { auth: true });
}

export function salvarModeracaoChecklist(id, payload, apiClient = api) {
  return apiClient.put(`${BASE}/solicitacoes/${id}/checklist`, payload, { auth: true });
}

export function decidirModeracaoSolicitacao(id, payload, apiClient = api) {
  return apiClient.post(`${BASE}/solicitacoes/${id}/decisao`, payload, { auth: true });
}

export function finalizarModeracaoSolicitacao(id, payload, apiClient = api) {
  return apiClient.post(`${BASE}/solicitacoes/${id}/finalizacao`, payload, { auth: true });
}

export function reverterFinalizacaoModeracaoSolicitacao(id, payload, apiClient = api) {
  return apiClient.post(`${BASE}/solicitacoes/${id}/reversao-finalizacao`, payload, { auth: true });
}

export function excluirModeracaoSolicitacao(id, apiClient = api) {
  return apiClient.delete(`${BASE}/solicitacoes/${id}`, { auth: true });
}
