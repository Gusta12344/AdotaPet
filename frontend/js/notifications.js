import { api } from "./api.js";

const NOTIFICATIONS_KEY_PREFIX = "adotapet.notifications";
const DEFAULT_TOAST_DURATION = 4200;
const NOTIFICATION_POLL_INTERVAL_MS = 60000;
const NOTIFICATIONS_CHANGED_EVENT = "adotapet:notifications-changed";

export function readNotifications(storage = globalThis.localStorage, adotanteId) {
  if (!storage || !adotanteId) {
    return [];
  }

  const raw = storage.getItem(notificationsKey(adotanteId));
  if (!raw) {
    return [];
  }

  try {
    const notifications = JSON.parse(raw);
    return Array.isArray(notifications)
      ? notifications.map(normalizeStoredNotification).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function recordNotification(storage = globalThis.localStorage, adotanteId, notification) {
  const normalized = normalizeNotification(notification);
  if (!storage || !adotanteId || !normalized) {
    return null;
  }

  const currentNotifications = readNotifications(storage, adotanteId);
  const existingIndex = currentNotifications.findIndex((item) => item.id === normalized.id);
  const wasCreated = existingIndex === -1;
  const nextNotification = wasCreated
    ? normalized
    : { ...currentNotifications[existingIndex], ...normalized, read: currentNotifications[existingIndex].read };
  const nextNotifications = wasCreated
    ? [nextNotification, ...currentNotifications]
    : currentNotifications.map((item, index) => (index === existingIndex ? nextNotification : item));

  writeNotifications(storage, adotanteId, nextNotifications);
  return { ...nextNotification, wasCreated };
}

export function markAllNotificationsRead(storage = globalThis.localStorage, adotanteId) {
  const notifications = readNotifications(storage, adotanteId);
  writeNotifications(storage, adotanteId, notifications.map((notification) => ({
    ...notification,
    read: true,
  })));
}

export function unreadNotificationCount(storage = globalThis.localStorage, adotanteId) {
  return readNotifications(storage, adotanteId).filter((notification) => !notification.read).length;
}

export function favoriteChangeNotification(animal, isFavorite) {
  const animalId = Number(animal?.id);
  const nome = String(animal?.nome || "Animal").trim() || "Animal";
  const action = isFavorite ? "adicionado aos" : "removido dos";

  return {
    id: `favorito-${animalId || "animal"}-${Date.now()}`,
    title: "Favoritos atualizados",
    body: `${nome} foi ${action} favoritos.`,
    type: isFavorite ? "success" : "info",
  };
}

export function emitNotificationsChanged() {
  const target = globalThis.window;
  if (!target?.dispatchEvent) {
    return;
  }

  const EventConstructor = globalThis.CustomEvent || globalThis.Event;
  const event = typeof EventConstructor === "function"
    ? new EventConstructor(NOTIFICATIONS_CHANGED_EVENT)
    : { type: NOTIFICATIONS_CHANGED_EVENT };
  target.dispatchEvent(event);
}

export function adoptionStatusNotification(solicitacao) {
  const id = Number(solicitacao?.id);
  const status = String(solicitacao?.status || "").toLowerCase();
  const animalNome = String(solicitacao?.animalNome || "o animal").trim() || "o animal";

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  if (status === "aprovada") {
    return {
      id: `adocao-${id}-aprovada`,
      title: "Solicitacao aprovada",
      body: `Sua solicitacao para adotar ${animalNome} foi aprovada.`,
      type: "success",
      createdAt: solicitacao?.dataSolicitacao,
    };
  }

  if (status === "recusada") {
    return {
      id: `adocao-${id}-recusada`,
      title: "Solicitacao recusada",
      body: `Sua solicitacao para adotar ${animalNome} foi recusada.`,
      type: "warning",
      createdAt: solicitacao?.dataSolicitacao,
    };
  }

  return null;
}

export function adoptionCreatedNotification(solicitacao) {
  const id = Number(solicitacao?.id);
  const animalNome = String(solicitacao?.animalNome || "o animal").trim() || "o animal";

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return {
    id: `adocao-${id}-pendente`,
    title: "Solicitacao enviada",
    body: `Sua solicitacao para adotar ${animalNome} foi enviada e esta em analise.`,
    type: "info",
    createdAt: solicitacao?.dataSolicitacao,
  };
}

export function showToast({ title, body, type = "info", duration = DEFAULT_TOAST_DURATION } = {}) {
  const documentRef = globalThis.document;
  if (!documentRef?.body || (!title && !body)) {
    return null;
  }

  const region = getToastRegion(documentRef);
  const toast = documentRef.createElement("div");
  toast.className = `toast-notification toast-notification-${normalizeType(type)}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");

  const content = documentRef.createElement("div");
  content.className = "toast-content";
  if (title) {
    const titleNode = documentRef.createElement("strong");
    titleNode.className = "toast-title";
    titleNode.textContent = title;
    content.append(titleNode);
  }
  if (body) {
    const bodyNode = documentRef.createElement("span");
    bodyNode.className = "toast-body";
    bodyNode.textContent = body;
    content.append(bodyNode);
  }

  const closeButton = documentRef.createElement("button");
  closeButton.className = "toast-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Fechar notificacao");
  closeButton.textContent = "x";
  closeButton.addEventListener("click", () => removeNode(toast));

  toast.append(content, closeButton);
  region.append(toast);

  if (duration > 0) {
    globalThis.setTimeout?.(() => removeNode(toast), duration);
  }

  return toast;
}

export function createNotificationCenter({
  root = globalThis.document,
  storage = globalThis.localStorage,
  apiClient = api,
} = {}) {
  const toggle = query(root, "[data-notifications-toggle]");
  const badge = query(root, "[data-notification-badge]");
  const host = toggle?.parentElement || toggle?.parentNode || null;
  const panel = toggle && root?.createElement ? createNotificationPanel(root) : null;
  let currentAdotanteId = null;
  let currentNotifications = [];
  let hasSynced = false;
  let pollId = null;

  if (panel && host) {
    host.append(panel);
  }

  async function sync(user, { showToasts = true } = {}) {
    const adotanteId = getUserAdotanteId(user);
    currentAdotanteId = adotanteId;

    if (!adotanteId) {
      stopPolling();
      clear();
      return;
    }

    startPolling(user);

    try {
      const previousIds = new Set(currentNotifications.map((notification) => notification.id));
      const notifications = normalizeApiNotifications(await apiClient.get(`/notificacoes/adotantes/${adotanteId}`));
      currentNotifications = notifications;
      if (showToasts && hasSynced) {
        for (const notification of currentNotifications) {
          if (!notification.read && !previousIds.has(notification.id)) {
            showToast(notification);
          }
        }
      }
      hasSynced = true;
    } catch {
      currentNotifications = readNotifications(storage, adotanteId);
    }

    render();
  }

  function render() {
    if (!currentAdotanteId) {
      clear();
      return;
    }

    const unreadCount = currentNotifications.filter((notification) => !notification.read).length;
    renderBadge(badge, unreadCount);
    renderPanel(panel, currentNotifications);
  }

  function clear() {
    currentNotifications = [];
    hasSynced = false;
    renderBadge(badge, 0);
    if (panel) {
      panel.hidden = true;
      renderPanel(panel, []);
    }
    toggle?.setAttribute("aria-expanded", "false");
  }

  async function openPanel() {
    if (!panel || !currentAdotanteId) {
      return;
    }

    panel.hidden = false;
    toggle?.setAttribute("aria-expanded", "true");
    try {
      const updatedNotifications = await apiClient.put(`/notificacoes/adotantes/${currentAdotanteId}/lidas`, {});
      currentNotifications = Array.isArray(updatedNotifications)
        ? normalizeApiNotifications(updatedNotifications)
        : currentNotifications.map((notification) => ({ ...notification, read: true }));
    } catch {
      markAllNotificationsRead(storage, currentAdotanteId);
      currentNotifications = currentNotifications.map((notification) => ({ ...notification, read: true }));
    }
    render();
  }

  function closePanel() {
    if (panel) {
      panel.hidden = true;
    }
    toggle?.setAttribute("aria-expanded", "false");
  }

  toggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (panel?.hidden === false) {
      closePanel();
      return;
    }
    void openPanel();
  });

  panel?.addEventListener("click", (event) => event.stopPropagation());
  root?.addEventListener?.("click", closePanel);
  root?.addEventListener?.("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });
  globalThis.window?.addEventListener?.(NOTIFICATIONS_CHANGED_EVENT, () => {
    if (currentAdotanteId) {
      void sync({ id: currentAdotanteId, tipo: "adotante" }, { showToasts: false });
    }
  });

  function startPolling(user) {
    if (pollId || !globalThis.setInterval) {
      return;
    }

    pollId = globalThis.setInterval(() => {
      sync(user, { showToasts: true });
    }, NOTIFICATION_POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollId && globalThis.clearInterval) {
      globalThis.clearInterval(pollId);
    }
    pollId = null;
  }

  return {
    sync,
    render,
    clear,
    openPanel,
    closePanel,
  };
}

function writeNotifications(storage, adotanteId, notifications) {
  if (!storage || !adotanteId) {
    return;
  }

  storage.setItem(notificationsKey(adotanteId), JSON.stringify(
    notifications
      .map(normalizeStoredNotification)
      .filter(Boolean)
      .slice(0, 30)
  ));
}

function notificationsKey(adotanteId) {
  return `${NOTIFICATIONS_KEY_PREFIX}.${adotanteId}`;
}

function normalizeNotification(notification) {
  if (!notification) {
    return null;
  }

  const id = String(notification.id || "").trim();
  const title = String(notification.title || "").trim();
  const body = String(notification.body || "").trim();

  if (!id || (!title && !body)) {
    return null;
  }

  return {
    id,
    title,
    body,
    type: normalizeType(notification.type),
    read: Boolean(notification.read),
    createdAt: normalizeDate(notification.createdAt) || new Date().toISOString(),
  };
}

function normalizeStoredNotification(notification) {
  const normalized = normalizeNotification(notification);
  return normalized ? { ...normalized, read: Boolean(notification.read) } : null;
}

function normalizeApiNotifications(notifications) {
  return (Array.isArray(notifications) ? notifications : [])
    .map(normalizeApiNotification)
    .filter(Boolean);
}

function normalizeApiNotification(notification) {
  if (!notification) {
    return null;
  }

  const title = String(notification.titulo || notification.title || "").trim();
  const body = String(notification.mensagem || notification.body || "").trim();
  const id = String(notification.id || "").trim();
  if (!id || (!title && !body)) {
    return null;
  }

  return {
    id,
    title,
    body,
    type: visualTypeForNotification(notification, title, body),
    read: Boolean(notification.lida ?? notification.read),
    createdAt: normalizeDate(notification.dataCriacao || notification.createdAt) || new Date().toISOString(),
  };
}

function visualTypeForNotification(notification, title, body) {
  const type = String(notification.type || "").trim().toLowerCase();
  if (["success", "error", "warning", "info"].includes(type)) {
    return type;
  }

  const tipo = String(notification.tipo || "").trim().toLowerCase();
  const text = `${title} ${body}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (text.includes("aprovada") || text.includes("adicionado")) {
    return "success";
  }
  if (text.includes("recusada")) {
    return "warning";
  }
  if (tipo === "favoritos" || tipo === "adocao" || tipo === "sistema") {
    return "info";
  }
  return "info";
}

function normalizeType(type) {
  const normalized = String(type || "info").toLowerCase();
  return ["success", "error", "warning", "info"].includes(normalized) ? normalized : "info";
}

function normalizeDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function getToastRegion(documentRef) {
  const existingRegion = documentRef.querySelector?.(".toast-region");
  if (existingRegion) {
    return existingRegion;
  }

  const region = documentRef.createElement("div");
  region.className = "toast-region";
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "false");
  documentRef.body.append(region);
  return region;
}

function createNotificationPanel(documentRef) {
  const panel = documentRef.createElement("section");
  panel.className = "notification-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Notificacoes");
  return panel;
}

function renderBadge(badge, count) {
  if (!badge) {
    return;
  }

  if (count <= 0) {
    badge.textContent = "";
    badge.hidden = true;
    return;
  }

  badge.textContent = count > 9 ? "9+" : String(count);
  badge.hidden = false;
}

function renderPanel(panel, notifications) {
  if (!panel) {
    return;
  }

  clearNode(panel);
  const documentRef = panel.ownerDocument || globalThis.document;
  const header = documentRef.createElement("div");
  header.className = "notification-panel-header";
  header.append(textElement(documentRef, "strong", "Notificacoes"));
  header.append(textElement(documentRef, "span", notifications.length ? `${notifications.length} recentes` : "Tudo em dia"));
  panel.append(header);

  if (!notifications.length) {
    const empty = documentRef.createElement("p");
    empty.className = "notification-empty";
    empty.textContent = "Nenhuma notificacao nova por enquanto.";
    panel.append(empty);
    return;
  }

  const list = documentRef.createElement("div");
  list.className = "notification-list";
  for (const notification of notifications) {
    const item = documentRef.createElement("article");
    item.className = [
      "notification-item",
      `notification-item-${notification.type}`,
      notification.read ? "" : "notification-item-unread",
    ].filter(Boolean).join(" ");
    item.append(textElement(documentRef, "strong", notification.title));
    item.append(textElement(documentRef, "span", notification.body));
    list.append(item);
  }
  panel.append(list);
}

function textElement(documentRef, tag, text) {
  const node = documentRef.createElement(tag);
  node.textContent = text;
  return node;
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function removeNode(node) {
  if (typeof node?.remove === "function") {
    node.remove();
    return;
  }

  node?.parentNode?.removeChild?.(node);
}

function getUserAdotanteId(user) {
  if (user?.tipo === "admin") {
    return null;
  }

  const id = Number.parseInt(user?.id, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function query(root, selector) {
  return root?.querySelector?.(selector) || null;
}
