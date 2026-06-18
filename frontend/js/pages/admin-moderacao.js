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
import { createAdminShell } from "../admin-shell.js";
import { adminCard } from "../admin-components.js";
import { element, setFeedback } from "../ui.js";

const state = createModeracaoState();
let searchTimer = null;
let checklistTimer = null;

const tabs = element("div", { className: "moderation-tabs", "data-status-tabs": "" });
const queue = element("div", { className: "moderation-queue", "data-moderation-queue": "" });
const detail = element("section", { className: "moderation-panel moderation-detail", "data-moderation-detail": "", "aria-live": "polite" });
const decision = element("aside", { className: "moderation-panel moderation-decision", "data-moderation-decision": "" });
const daySummary = element("section", { className: "admin-day-summary", "data-admin-day-summary": "" });
const order = element("select", { "data-admin-order": "" }, [
  element("option", { value: "mais_antigas", text: "Mais antigas" }),
  element("option", { value: "mais_recentes", text: "Mais recentes" }),
]);
const content = element("main", { className: "admin-page moderation-page" }, [
  element("section", { className: "admin-dashboard-grid admin-moderation-summary" }, [
    daySummary,
    adminCard("Filtros da fila", [
      element("label", { className: "moderation-order" }, [
        element("span", { text: "Ordenar por:" }),
        order,
      ]),
    ]),
  ]),
  tabs,
  element("section", { className: "moderation-grid", "aria-label": "Solicitacoes de adocao" }, [
    element("aside", { className: "moderation-panel moderation-queue-panel", id: "solicitacoes" }, [
      element("div", { className: "moderation-panel-header" }, [
        element("div", { className: "moderation-title-row" }, [
          element("h2", { text: "Fila de solicitacoes" }),
          element("i", { className: "fa-solid fa-filter moderation-filter-icon library-icon", "aria-hidden": "true" }),
        ]),
      ]),
      queue,
    ]),
    detail,
    decision,
  ]),
]);
const shell = createAdminShell({
  active: "moderation",
  title: "Central de moderacao",
  subtitle: "Analise solicitacoes, checklist, historico e decisao final em um unico fluxo.",
  searchPlaceholder: "Buscar animal ou adotante",
  onSearch(value) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = value;
      loadFila({ keepSelection: false });
    }, 250);
  },
  content,
});

if (shell) {
  order.addEventListener("change", () => {
    state.ordem = order.value;
    loadFila({ keepSelection: false });
  });
  loadPage();
}

async function loadPage() {
  await Promise.all([loadResumo(), loadFila({ keepSelection: false })]);
}

async function loadResumo() {
  try {
    state.resumo = await fetchModeracaoResumo();
    renderModeracaoResumo(daySummary, state.resumo);
    renderTabs();
  } catch (error) {
    setFeedback(shell.feedback, error.message, "error");
  }
}

async function loadFila({ keepSelection = true } = {}) {
  setFeedback(shell.feedback, "Carregando fila...");
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
    setFeedback(shell.feedback, "");
  } catch (error) {
    setFeedback(shell.feedback, error.message, "error");
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
    setFeedback(shell.feedback, error.message, "error");
  }
}

function renderTabs() {
  renderModeracaoTabs(tabs, {
    status: state.status,
    resumo: state.resumo,
    onSelect(status) {
      state.status = status;
      loadFila({ keepSelection: false });
    },
  });
}

function renderQueue() {
  renderModeracaoQueue(queue, {
    grupos: state.grupos,
    selectedId: state.selectedId,
    onSelect: loadDetalhe,
  });
}

function renderDetail() {
  renderModeracaoDetail(detail, state.detalhe, {
    onStartAnalysis: startAnalysis,
  });
  renderModeracaoDecision(decision, state.detalhe, {
    onChecklistChange: queueChecklistSave,
    onDecision: decideSolicitacao,
  });
}

async function startAnalysis(id) {
  setFeedback(shell.feedback, "Iniciando analise...");
  try {
    state.detalhe = await iniciarModeracaoAnalise(id);
    renderDetail();
    await loadResumo();
    await loadFila({ keepSelection: true });
    setFeedback(shell.feedback, "Solicitacao em analise.", "success");
  } catch (error) {
    setFeedback(shell.feedback, error.message, "error");
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
    setFeedback(shell.feedback, error.message, "error");
  }
}

async function decideSolicitacao(status, form) {
  if (!state.selectedId) {
    return;
  }

  setFeedback(shell.feedback, "Processando decisao...");
  try {
    const response = await decidirModeracaoSolicitacao(state.selectedId, buildDecisaoPayload(status, form));
    state.detalhe = response.solicitacao;
    setFeedback(shell.feedback, response.mensagem || "Solicitacao atualizada.", "success");
    await loadResumo();
    await loadFila({ keepSelection: true });
  } catch (error) {
    setFeedback(shell.feedback, error.message, "error");
  }
}

function containsSolicitacao(grupos, id) {
  return grupos.some((grupo) => (grupo.solicitacoes || []).some((solicitacao) => solicitacao.id === id));
}

function isFinalizada(status) {
  return status === "aprovada" || status === "recusada";
}
