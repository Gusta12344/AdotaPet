import { api } from "./api.js";

export function fetchAdminOverview(client = api) {
  return client.get("/admin/resumo", { auth: true });
}

export function fetchAdminAnimals(client = api) {
  return client.get("/admin/animais", { auth: true });
}

export function createAdminAnimal(payload, { hasFiles = false, client = api } = {}) {
  if (hasFiles) {
    return client.postForm("/animais", payload, { auth: true });
  }
  return client.post("/animais", payload, { auth: true });
}

export function updateAdminAnimal(id, payload, client = api) {
  return client.put(`/animais/${id}`, payload, { auth: true });
}

export function updateAdminAnimalStatus(id, status, client = api) {
  return client.put(`/animais/${id}/status`, { status }, { auth: true });
}

export function deleteAdminAnimal(id, client = api) {
  return client.delete(`/animais/${id}`, { auth: true });
}

export function fetchAdminUsers(client = api) {
  return client.get("/admin/usuarios", { auth: true });
}

export function createAdminUser(payload, client = api) {
  return client.post("/admin/usuarios", payload, { auth: true });
}

export function updateAdminUser(id, payload, client = api) {
  return client.put(`/admin/usuarios/${id}`, payload, { auth: true });
}

export function deleteAdminUser(id, client = api) {
  return client.delete(`/admin/usuarios/${id}`, { auth: true });
}

export function updateStandaloneAdminUser(id, payload, client = api) {
  return client.put(`/admin/usuarios/admins/${id}`, payload, { auth: true });
}

export function deleteStandaloneAdminUser(id, client = api) {
  return client.delete(`/admin/usuarios/admins/${id}`, { auth: true });
}

export function promoteAdminUser(id, client = api) {
  return client.post(`/admin/usuarios/${id}/promover`, {}, { auth: true });
}

export function fetchAdminReport(formato, client = api) {
  const params = new URLSearchParams({ formato });
  return client.get(`/admin/relatorios?${params}`, { auth: true });
}
