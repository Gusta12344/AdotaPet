import {
  decidirModeracaoSolicitacao,
  fetchModeracaoDetalhe,
  fetchModeracaoFila,
  fetchModeracaoResumo,
  iniciarModeracaoAnalise,
  salvarModeracaoChecklist,
} from "../admin-moderacao-api.js";
import {
  buildChecklistPayload,
  buildDecisaoPayload,
  createModeracaoState,
  normalizeModeracaoFilters,
  selectFirstSolicitacao,
  syncQueueAnimalImage,
} from "../admin-moderacao-state.js";
import {
  renderModeracaoDecision,
  renderModeracaoDetail,
  renderModeracaoQueue,
  renderModeracaoResumo,
  renderModeracaoTabs,
} from "../admin-moderacao-render.js";
import { readAdminCredentials } from "../auth.js";
import { createHeaderAuthController } from "../header-auth.js";
import { $, setFeedback } from "../ui.js";

const credentials = readAdminCredentials(sessionStorage);

if (!credentials) {
  window.location.href = "index.html?login=required";
}

const nodes = {
  daySummary: $("[data-admin-day-summary]"),
  search: $("[data-admin-search]"),
  order: $("[data-admin-order]"),
  navLinks: Array.from(document.querySelectorAll("[data-admin-nav-action]")),
  tabs: $("[data-status-tabs]"),
  queue: $("[data-moderation-queue]"),
  detail: $("[data-moderation-detail]"),
  decision: $("[data-moderation-decision]"),
  feedback: $("[data-moderation-feedback]"),
};
const state = createModeracaoState();
let searchTimer = null;
let checklistTimer = null;

if (credentials) {
  createHeaderAuthController({
    onLogout() {
      window.location.href = "index.html";
    },
  });
  bindEvents();
  loadPage();
}

function bindEvents() {
  nodes.search?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = nodes.search.value;
      loadFila({ keepSelection: false });
    }, 250);
  });

  nodes.order?.addEventListener("change", () => {
    state.ordem = nodes.order.value;
    loadFila({ keepSelection: false });
  });

  nodes.navLinks.forEach((link) => {
    link.addEventListener("click", handleSidebarNavigation);
  });
}

async function loadPage() {
  await Promise.all([loadResumo(), loadFila({ keepSelection: false })]);
}

async function loadResumo() {
  try {
    state.resumo = await fetchModeracaoResumo();
    renderModeracaoResumo(nodes.daySummary, state.resumo);
    renderTabs();
  } catch (error) {
    setFeedback(nodes.feedback, error.message, "error");
  }
}

async function loadFila({ keepSelection = true } = {}) {
  setFeedback(nodes.feedback, "Carregando fila...");
  const filters = normalizeModeracaoFilters({
    status: state.status,
    q: state.q,
    ordem: state.ordem,
  });

  try {
    state.grupos = await fetchModeracaoFila(filters);
    if (!keepSelection || !containsSolicitacao(state.grupos, state.selectedId)) {
      state.selectedId = selectFirstSolicitacao(state.grupos);
    }
    renderTabs();
    renderQueue();
    await loadDetalhe(state.selectedId);
    setFeedback(nodes.feedback, "");
  } catch (error) {
    setFeedback(nodes.feedback, error.message, "error");
  }
}

async function loadDetalhe(id) {
  state.selectedId = id;
  if (!id) {
    state.detalhe = null;
    renderDetail();
    return;
  }

  try {
    state.detalhe = await fetchModeracaoDetalhe(id);
    state.grupos = syncQueueAnimalImage(state.grupos, state.detalhe);
    renderQueue();
    renderDetail();
  } catch (error) {
    state.detalhe = null;
    renderDetail();
    setFeedback(nodes.feedback, error.message, "error");
  }
}

function renderTabs() {
  renderModeracaoTabs(nodes.tabs, {
    status: state.status,
    resumo: state.resumo,
    onSelect(status) {
      state.status = status;
      loadFila({ keepSelection: false });
    },
  });
}

function renderQueue() {
  renderModeracaoQueue(nodes.queue, {
    grupos: state.grupos,
    selectedId: state.selectedId,
    onSelect: loadDetalhe,
  });
}

function renderDetail() {
  renderModeracaoDetail(nodes.detail, state.detalhe, {
    onStartAnalysis: startAnalysis,
  });
  renderModeracaoDecision(nodes.decision, state.detalhe, {
    onChecklistChange: queueChecklistSave,
    onDecision: decideSolicitacao,
  });
}

async function startAnalysis(id) {
  setFeedback(nodes.feedback, "Iniciando analise...");
  try {
    state.detalhe = await iniciarModeracaoAnalise(id);
    renderDetail();
    await loadResumo();
    await loadFila({ keepSelection: true });
    setFeedback(nodes.feedback, "Solicitacao em analise.", "success");
  } catch (error) {
    setFeedback(nodes.feedback, error.message, "error");
  }
}

function queueChecklistSave(form) {
  clearTimeout(checklistTimer);
  checklistTimer = setTimeout(() => saveChecklist(form), 350);
}

async function saveChecklist(form) {
  if (!state.selectedId || !state.detalhe || isFinalizada(state.detalhe.status)) {
    return;
  }

  try {
    state.detalhe = await salvarModeracaoChecklist(state.selectedId, buildChecklistPayload(form));
    renderDetail();
  } catch (error) {
    setFeedback(nodes.feedback, error.message, "error");
  }
}

async function decideSolicitacao(status, form) {
  if (!state.selectedId) {
    return;
  }

  setFeedback(nodes.feedback, "Processando decisao...");
  try {
    const response = await decidirModeracaoSolicitacao(state.selectedId, buildDecisaoPayload(status, form));
    state.detalhe = response.solicitacao;
    setFeedback(nodes.feedback, response.mensagem || "Solicitacao atualizada.", "success");
    await loadResumo();
    await loadFila({ keepSelection: true });
  } catch (error) {
    setFeedback(nodes.feedback, error.message, "error");
  }
}

function containsSolicitacao(grupos, id) {
  return grupos.some((grupo) => (grupo.solicitacoes || []).some((solicitacao) => solicitacao.id === id));
}

function isFinalizada(status) {
  return status === "aprovada" || status === "recusada";
}

function handleSidebarNavigation(event) {
  event.preventDefault();
  const link = event.currentTarget;
  const action = link?.dataset?.adminNavAction || "moderation";

  nodes.navLinks.forEach((item) => {
    item.classList.toggle("admin-sidebar-active", item === link);
  });

  const message = applySidebarAction(action);
  const target = document.querySelector(link.getAttribute("href"));
  target?.scrollIntoView?.({ behavior: "smooth", block: "start" });

  if (message) {
    setFeedback(nodes.feedback, message, "info");
  }
}

function applySidebarAction(action) {
  const passiveMessages = {
    interviews: "Entrevistas ficam centralizadas na solicitacao selecionada.",
    messages: "Mensagens ficam disponiveis nos dados de contato do adotante selecionado.",
    users: "Use a busca para localizar adotantes por nome ou email.",
    reports: "O resumo do dia mostra os principais indicadores da moderacao.",
    settings: "As configuracoes administrativas ainda seguem as regras atuais do painel.",
    help: "Selecione uma solicitacao para revisar dados, checklist e historico.",
  };

  if (action === "overview") {
    return "Resumo do dia atualizado na lateral.";
  }
  if (action === "animals") {
    nodes.search?.focus();
    return "Busque pelo nome do animal para filtrar a fila.";
  }
  if (action === "pending" || action === "moderation") {
    setStatusFilter("pendente");
    return "";
  }
  if (action === "all") {
    setStatusFilter("");
    return "Mostrando todas as solicitacoes.";
  }

  return passiveMessages[action] || "";
}

function setStatusFilter(status) {
  if (state.status === status) {
    return;
  }
  state.status = status;
  loadFila({ keepSelection: false });
}
