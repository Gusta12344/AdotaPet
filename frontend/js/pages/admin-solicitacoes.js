import {
  decidirModeracaoSolicitacao,
  excluirModeracaoSolicitacao,
  fetchModeracaoDetalhe,
  fetchModeracaoSolicitacoesLista,
  finalizarModeracaoSolicitacao,
  iniciarModeracaoAnalise,
  reverterFinalizacaoModeracaoSolicitacao,
} from "../admin-moderacao-api.js";
import {
  buildDecisaoPayload,
  buildFinalizacaoPayload,
  buildReversaoFinalizacaoPayload,
} from "../admin-moderacao-state.js";
import {
  canDeleteSolicitacao,
  getAnimatedDropdownTransition,
  getRequestReviewFlow,
  groupRequestsByAnimal,
} from "../admin-solicitacoes-state.js";
import { emptyState, formatDateTime, showError, statusPill } from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { enhanceSelectDropdowns } from "../dropdowns.js";
import { clearNode, element, formatAge, formatEnum, renderAnimalImage, setFeedback } from "../ui.js";

const PAGE_SIZE = 10;
const requestFilters = {
  status: new URLSearchParams(window.location.search).get("status") || "",
  atencao: "",
  especie: "",
  perfil: "",
  ordem: "atencao",
  q: "",
  pagina: 0,
  tamanho: PAGE_SIZE,
};

let currentPage = emptyPage();
let expandedAnimalId = null;
let currentDetail = null;
let loadSequence = 0;
let modalLoadSequence = 0;
let isDecisionSubmitting = false;
let dropdownAnimationFrame = 0;
let startAnalysisRequest = null;
let isStartAnalysisSubmitting = false;

const requestList = element("div", { className: "admin-animal-table-region admin-request-table-region", "data-request-list": "" });
const filterSummary = element("p", {
  className: "admin-animal-filter-summary admin-request-summary muted",
  "data-request-filter-summary": "",
});
const toolbarSearch = element("input", {
  id: "admin-request-search",
  name: "q",
  autocomplete: "off",
  placeholder: "Buscar por animal, adotante ou email",
});
const pageStatus = element("span", { "data-request-page-status": "" });
const prevPageButton = element("button", {
  className: "button button-secondary",
  type: "button",
  "data-request-page-prev": "",
}, [
  icon("fa-chevron-left"),
  element("span", { text: "Anterior" }),
]);
const nextPageButton = element("button", {
  className: "button",
  type: "button",
  "data-request-page-next": "",
}, [
  element("span", { text: "Proxima" }),
  icon("fa-chevron-right"),
]);
const refreshButton = element("button", {
  className: "button button-secondary",
  type: "button",
}, [
  icon("fa-rotate"),
  element("span", { text: "Atualizar fila" }),
]);
const filterToolbar = element("form", {
  className: "animal-toolbar admin-animal-toolbar admin-request-toolbar",
  "aria-label": "Filtros das solicitacoes",
}, [
  element("label", { className: "search-field admin-animal-search-field admin-request-search-field" }, [
    icon("fa-magnifying-glass"),
    toolbarSearch,
  ]),
  filterField("Status", filterSelect("status", [
    ["", "Todos"],
    ["pendente", "Pendentes"],
    ["em_analise", "Em analise"],
    ["aprovada", "Aprovadas"],
    ["recusada", "Recusadas"],
    ["cancelada", "Canceladas"],
    ["finalizada", "Finalizadas"],
  ], requestFilters.status)),
  filterField("Atencao", filterSelect("atencao", [
    ["", "Todas"],
    ["alta", "Alta atencao"],
    ["media", "Media atencao"],
    ["baixa", "Baixa atencao"],
  ], requestFilters.atencao)),
  filterField("Animal", filterSelect("especie", [
    ["", "Todos"],
    ["cao", "Caes"],
    ["gato", "Gatos"],
    ["outro", "Outros"],
  ], requestFilters.especie)),
  filterField("Perfil", filterSelect("perfil", [
    ["", "Todos"],
    ["primeiro_da_fila", "Primeiro da fila"],
    ["com_fila", "Com fila"],
    ["pode_aprovar", "Pode aprovar"],
  ], requestFilters.perfil)),
  filterField("Ordenar", filterSelect("ordem", [
    ["atencao", "Atencao"],
    ["mais_antigas", "Mais antigas"],
    ["mais_recentes", "Mais recentes"],
    ["fila_maior", "Maior fila"],
    ["animal_az", "Animal A-Z"],
    ["adotante_az", "Adotante A-Z"],
  ], requestFilters.ordem)),
  element("button", { className: "filter-button", type: "reset" }, [
    icon("fa-filter"),
    element("span", { text: "Limpar" }),
  ]),
]);
const pagination = element("nav", { className: "admin-pagination admin-request-pagination", "aria-label": "Paginacao das solicitacoes" }, [
  pageStatus,
  element("div", { className: "admin-pagination-actions" }, [
    prevPageButton,
    nextPageButton,
  ]),
]);
const reviewModalTitle = element("h2", { id: "admin-request-review-title", text: "Revisar solicitacao" });
const reviewModalBody = element("div", { className: "admin-animal-detail-body admin-request-review-body", "data-request-review-body": "" });
const reviewModal = element("div", {
  className: "admin-animal-modal admin-request-review-modal",
  "data-request-review-modal": "",
  hidden: "hidden",
}, [
  element("button", {
    className: "login-backdrop",
    type: "button",
    "aria-label": "Fechar revisao da solicitacao",
    onClick() {
      closeReviewModal();
    },
  }),
  element("section", {
    className: "admin-animal-dialog admin-request-review-dialog",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "admin-request-review-title",
  }, [
    element("div", { className: "admin-modal-header" }, [
      reviewModalTitle,
      element("div", { className: "admin-animal-header-actions" }, [
        element("button", {
          className: "modal-close",
          type: "button",
          "aria-label": "Fechar",
          onClick() {
            closeReviewModal();
          },
        }, [icon("fa-xmark")]),
      ]),
    ]),
    reviewModalBody,
  ]),
]);
const startAnalysisTitle = element("h2", { id: "admin-start-analysis-title", text: "Iniciar analise?" });
const startAnalysisDescription = element("p", {
  className: "muted",
  "data-start-analysis-description": "",
});
const startAnalysisCancelButton = element("button", {
  className: "button button-secondary",
  type: "button",
  onClick() {
    closeStartAnalysisPrompt();
  },
}, [
  element("span", { text: "Agora nao" }),
]);
const startAnalysisConfirmButton = element("button", {
  className: "button admin-start-analysis-confirm",
  type: "button",
  onClick() {
    confirmStartAnalysis();
  },
}, [
  icon("fa-play"),
  element("span", { text: "Iniciar analise" }),
]);
const startAnalysisModal = element("div", {
  className: "admin-animal-modal admin-start-analysis-modal",
  "data-start-analysis-modal": "",
  hidden: "hidden",
}, [
  element("button", {
    className: "login-backdrop",
    type: "button",
    "aria-label": "Fechar confirmacao de analise",
    onClick() {
      closeStartAnalysisPrompt();
    },
  }),
  element("section", {
    className: "admin-animal-dialog admin-start-analysis-dialog",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "admin-start-analysis-title",
  }, [
    element("div", { className: "admin-modal-header" }, [
      startAnalysisTitle,
      element("button", {
        className: "modal-close",
        type: "button",
        "aria-label": "Fechar",
        onClick() {
          closeStartAnalysisPrompt();
        },
      }, [icon("fa-xmark")]),
    ]),
    element("div", { className: "admin-start-analysis-body" }, [
      element("span", { className: "admin-start-analysis-icon" }, [icon("fa-clipboard-check")]),
      startAnalysisDescription,
      element("div", { className: "admin-form-actions admin-start-analysis-actions" }, [
        startAnalysisCancelButton,
        startAnalysisConfirmButton,
      ]),
    ]),
  ]),
]);
const content = element("main", { className: "admin-page admin-requests-page" }, [
  element("section", { className: "admin-card admin-request-board" }, [
    element("div", { className: "admin-card-header" }, [
      element("div", {}, [
        element("h2", { text: "Solicitacoes de adocao" }),
        element("p", { className: "muted", text: "Clique em um animal para ver os adotantes, revisar pedidos e registrar a decisao." }),
      ]),
      element("span", { className: "admin-request-page-size", text: `${PAGE_SIZE} por pagina` }),
    ]),
    filterToolbar,
    filterSummary,
    requestList,
    pagination,
  ]),
]);
const shell = createAdminShell({
  active: "requests",
  title: "Solicitacoes",
  subtitle: "Gerencie a fila, revise pedidos e responda solicitacoes em uma unica pagina.",
  showSearch: false,
  actions: [refreshButton],
  content,
});

if (shell) {
  document.body.append(reviewModal);
  document.body.append(startAnalysisModal);
  filterToolbar.addEventListener("submit", (event) => event.preventDefault());
  filterToolbar.addEventListener("input", syncFiltersFromToolbar);
  filterToolbar.addEventListener("change", syncFiltersFromToolbar);
  filterToolbar.addEventListener("reset", () => {
    const setTimer = globalThis.window?.setTimeout || globalThis.setTimeout;
    setTimer(() => syncFiltersFromToolbar({ resetPage: true }), 0);
  });
  prevPageButton.addEventListener("click", () => changePage(requestFilters.pagina - 1));
  nextPageButton.addEventListener("click", () => changePage(requestFilters.pagina + 1));
  refreshButton.addEventListener("click", () => loadRequests({ keepExpanded: true }));
  reviewModal.addEventListener("keydown", handleReviewModalKeydown);
  startAnalysisModal.addEventListener("keydown", handleStartAnalysisModalKeydown);
  enhanceSelectDropdowns(filterToolbar);
  loadRequests();
}

async function loadRequests({ keepExpanded = false } = {}) {
  const sequence = ++loadSequence;
  setFeedback(shell.feedback, "Carregando solicitacoes...");

  try {
    const response = await fetchModeracaoSolicitacoesLista(buildApiFilters());
    if (sequence !== loadSequence) {
      return;
    }
    currentPage = normalizePage(response);
    requestFilters.pagina = currentPage.pagina;
    if (!keepExpanded) {
      expandedAnimalId = null;
    }
    renderPage();
    setFeedback(shell.feedback, "");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function renderPage() {
  renderRequests();
  renderPagination();
  updateFilterSummary();
}

function renderRequests() {
  clearNode(requestList);
  const groups = groupRequestsByAnimal(currentPage.itens || []);
  if (!groups.length) {
    requestList.append(emptyState("Nenhuma solicitacao encontrada", "Ajuste os filtros para visualizar outros registros."));
    return;
  }

  if (!expandedAnimalId && groups[0]) {
    expandedAnimalId = animalGroupKey(groups[0]);
  }

  requestList.append(renderAnimalRequestTable(groups));
}

function renderAnimalRequestTable(groups) {
  const tbody = element("tbody");
  for (const group of groups) {
    tbody.append(renderAnimalGroupRow(group));
    tbody.append(renderAnimalRequestsRow(group));
  }

  return element("div", { className: "admin-animal-table-wrap admin-request-animal-table-wrap" }, [
    element("table", { className: "admin-animal-table admin-request-animal-table" }, [
      element("thead", {}, [
        element("tr", {}, [
          tableHeader("Foto"),
          tableHeader("Animal"),
          tableHeader("Especie"),
          tableHeader("Solicitacoes"),
          tableHeader("Atencao"),
          tableHeader("Status"),
          tableHeader("Na fila"),
          tableHeader("Acoes", "admin-animal-actions-head"),
        ]),
      ]),
      tbody,
    ]),
  ]);
}

function renderAnimalGroupRow(group) {
  const key = animalGroupKey(group);
  const isExpanded = expandedAnimalId === key;
  const animal = animalFromGroup(group);
  const row = element("tr", {
    className: `admin-animal-table-row admin-request-animal-row ${isExpanded ? "admin-request-animal-expanded" : ""}`,
    "data-animal-group": key,
    "data-animal-name": group.animalNome || "animal",
    onClick(event) {
      if (event.target?.closest?.("button, a")) {
        return;
      }
      toggleAnimalGroup(group);
    },
  }, [
    tableCell("Foto", [renderAnimalImage(animal, { className: "admin-animal-thumb admin-request-thumb" })], "admin-animal-photo-cell"),
    tableCell("Animal", [
      element("div", { className: "admin-animal-identity" }, [
        element("strong", { text: group.animalNome || "Animal" }),
        element("span", { className: "muted", text: group.animalResumo || "Resumo nao informado" }),
      ]),
    ], "admin-animal-name-cell"),
    tableCell("Especie", [
      element("span", { className: "admin-animal-species" }, [
        icon(speciesIcon(group.especie)),
        element("span", { text: speciesLabel(group.especie) }),
      ]),
    ]),
    tableCell("Solicitacoes", [
      requestFact(String(group.totalSolicitacoes || 0), "pedidos"),
    ]),
    tableCell("Atencao", [
      attentionPill(group.nivelAtencao),
    ]),
    tableCell("Status", [
      statusPill(group.statusResumo),
    ]),
    tableCell("Na fila", [
      requestFact(String(group.totalAtivas || group.totalSolicitacoes || 0), "ativas"),
    ]),
    tableCell("Acoes", [
      element("button", {
        className: "admin-animal-action-trigger admin-request-animal-toggle",
        type: "button",
        "data-request-animal-toggle": key,
        "aria-expanded": String(isExpanded),
        "aria-controls": `request-dropdown-${key}`,
        "aria-label": `${isExpanded ? "Fechar" : "Abrir"} solicitacoes de ${group.animalNome || "animal"}`,
        onClick() {
          toggleAnimalGroup(group);
        },
      }, [
        icon(isExpanded ? "fa-chevron-up" : "fa-chevron-down"),
      ]),
    ], "admin-animal-actions-cell"),
  ]);
  return row;
}

function renderAnimalRequestsRow(group) {
  const key = animalGroupKey(group);
  const isExpanded = expandedAnimalId === key;
  return element("tr", {
    className: `admin-request-detail-row ${isExpanded ? "admin-request-detail-row-open" : "admin-request-detail-row-closed"}`,
    "data-request-detail-row": key,
  }, [
    element("td", { colspan: "8" }, [
      element("div", {
        className: "admin-request-dropdown",
        "data-request-dropdown": key,
        id: `request-dropdown-${key}`,
        "aria-hidden": String(!isExpanded),
      }, [
        element("div", { className: "admin-request-dropdown-inner" }, [
          element("div", { className: "admin-request-dropdown-header" }, [
            element("strong", { text: `${group.totalSolicitacoes} solicitacao${group.totalSolicitacoes === 1 ? "" : "es"} para ${group.animalNome || "animal"}` }),
            element("span", { className: "muted", text: "Revise cada adotante sem sair da pagina." }),
          ]),
          element("div", { className: "admin-request-dropdown-list" }, group.solicitacoes.map(renderSolicitacaoCard)),
        ]),
      ]),
    ]),
  ]);
}

function renderSolicitacaoCard(item) {
  const actions = [
    element("button", {
      className: "button button-secondary admin-request-review",
      type: "button",
      onClick() {
        handleReviewClick(item);
      },
    }, [
      icon("fa-clipboard-check"),
      element("span", { text: "Revisar" }),
    ]),
  ];

  if (canDeleteSolicitacao(item)) {
    actions.push(element("button", {
      className: "button button-secondary admin-request-delete",
      type: "button",
      "data-request-delete": String(item.id),
      title: "Excluir solicitacao",
      "aria-label": `Excluir solicitacao de ${item.adotanteNome || "adotante"}`,
      onClick() {
        deleteSolicitacao(item);
      },
    }, [
      icon("fa-trash"),
    ]));
  }

  return element("article", { className: "admin-request-person-row" }, [
    element("div", { className: "admin-request-person-main" }, [
      element("strong", { text: item.adotanteNome || "Adotante" }),
      element("span", { className: "muted", text: item.adotanteEmail || "Email nao informado" }),
      element("small", { text: `Solicitado em ${formatDateTime(item.dataSolicitacao)}` }),
    ]),
    element("div", { className: "admin-request-status-stack" }, [
      statusPill(item.status),
      attentionPill(item.nivelAtencao),
    ]),
    element("div", { className: "admin-request-facts" }, [
      requestFact(String(item.posicaoFila ?? "-"), "posicao"),
      requestFact(String(item.totalAtivas ?? 0), "fila ativa"),
      requestFact(item.podeAprovar ? "Sim" : "Nao", "pode aprovar"),
    ]),
    element("div", { className: "admin-request-reason" }, [
      element("span", { text: item.motivoAtencao || "Sem alerta operacional." }),
      element("small", { text: `Ha ${item.diasSolicitacao ?? 0} dias na fila` }),
    ]),
    element("div", { className: "admin-request-action-buttons" }, actions),
  ]);
}

function handleReviewClick(item) {
  if (getRequestReviewFlow(item?.status) === "start_analysis") {
    openStartAnalysisPrompt(item);
    return;
  }
  openReviewModal(item.id);
}

function openStartAnalysisPrompt(item) {
  startAnalysisRequest = item;
  startAnalysisTitle.textContent = "Iniciar analise?";
  startAnalysisDescription.textContent = [
    `A solicitacao de ${item?.adotanteNome || "adotante"} para ${item?.animalNome || "este animal"} ainda esta pendente.`,
    "Ao iniciar, ela muda para em analise e o modal completo de aprovacao ou recusa sera aberto.",
  ].join(" ");
  startAnalysisModal.hidden = false;
  setStartAnalysisControlsDisabled(false);
  syncAdminModalOpenState();
  startAnalysisConfirmButton.focus();
}

async function openReviewModal(id) {
  const sequence = ++modalLoadSequence;
  currentDetail = null;
  reviewModalTitle.textContent = `Revisar solicitacao #S-${String(id).padStart(4, "0")}`;
  reviewModal.hidden = false;
  syncAdminModalOpenState();
  clearNode(reviewModalBody);
  reviewModalBody.append(emptyState("Carregando solicitacao", "Buscando dados do animal e do adotante."));

  try {
    const detalhe = await fetchModeracaoDetalhe(id);
    if (sequence !== modalLoadSequence) {
      return;
    }
    currentDetail = detalhe;
    renderReviewModal(detalhe);
  } catch (error) {
    showError(shell.feedback, error);
    clearNode(reviewModalBody);
    reviewModalBody.append(emptyState("Nao foi possivel carregar", error?.message || "Tente novamente em alguns instantes."));
  }
}

function closeReviewModal() {
  if (isDecisionSubmitting) {
    return;
  }
  currentDetail = null;
  reviewModal.hidden = true;
  syncAdminModalOpenState();
}

function closeStartAnalysisPrompt() {
  if (isStartAnalysisSubmitting) {
    return;
  }
  startAnalysisRequest = null;
  startAnalysisModal.hidden = true;
  syncAdminModalOpenState();
}

function renderReviewModal(detalhe) {
  const animal = detalhe?.animal || {};
  const adotante = detalhe?.adotante || {};
  const form = element("form", { className: "admin-request-review-form" }, [
    reviewSection("Pedido do adotante", [
      reviewFact("Moradia", formatEnum(adotante.tipoMoradia)),
      reviewFact("Criancas", formatBooleanLabel(adotante.temCriancas)),
      reviewFact("Outros animais", formatBooleanLabel(adotante.temOutrosAnimais)),
    ], "admin-request-review-fact-grid"),
    reviewSection("Contato e fila", [
      detailRow("Nome", adotante.nome),
      detailRow("Email", adotante.email),
      detailRow("Telefone", adotante.telefone),
      detailRow("Endereco", adotante.endereco),
      detailRow("Solicitado em", formatDateTime(detalhe.dataSolicitacao)),
      detailRow("Posicao", detalhe.posicaoFila ? `${detalhe.posicaoFila} da fila` : "-"),
    ]),
    reviewSection("Resposta da solicitacao", [
      element("label", { className: "admin-field admin-field-full admin-request-response-field" }, [
        element("span", { text: "Mensagem / observacao" }),
        element("textarea", {
          name: "observacaoAdmin",
          rows: "5",
          maxlength: "500",
          placeholder: "Escreva a resposta ou observacao administrativa para esta solicitacao.",
          text: detalhe.observacaoAdmin || "",
        }),
      ]),
    ], "admin-request-response-grid"),
    renderRequestHistoryToggle(detalhe.eventos || []),
  ]);

  const actions = renderRequestActions(detalhe, form);

  clearNode(reviewModalBody);
  reviewModalBody.append(element("div", { className: "admin-animal-modal-layout admin-request-review-layout" }, [
    renderReviewProfileSide(detalhe),
    element("div", { className: "admin-animal-detail-main admin-request-review-main" }, [
      form,
      actions,
    ]),
  ]));
  form.querySelector("textarea")?.focus();
}

function renderRequestActions(detalhe, form) {
  if (detalhe?.status === "aprovada") {
    return renderRequestFinalizationActions(form);
  }
  if (detalhe?.status === "finalizada" && detalhe?.podeReverterFinalizacao) {
    return renderRequestUndoFinalizationActions(form);
  }
  if (isEncerrada(detalhe?.status)) {
    return renderRequestClosedActions(detalhe);
  }
  return renderRequestDecisionActions(detalhe, form);
}

function renderRequestDecisionActions(detalhe, form) {
  const rejectButton = element("button", {
    className: "button button-secondary admin-request-reject-button",
    type: "button",
    disabled: isEncerrada(detalhe?.status) ? "disabled" : undefined,
    onClick() {
      decideSolicitacao("recusada", form);
    },
  }, [
    icon("fa-xmark"),
    element("span", { text: "Recusar" }),
  ]);
  const approveButton = element("button", {
    className: "button admin-request-approve-button",
    type: "button",
    disabled: detalhe?.podeAprovar ? undefined : "disabled",
    onClick() {
      decideSolicitacao("aprovada", form);
    },
  }, [
    icon("fa-check"),
    element("span", { text: "Aprovar adocao" }),
  ]);

  return element("div", { className: "admin-form-actions admin-animal-modal-actions admin-request-review-actions admin-request-decision-footer" }, [
    rejectButton,
    approveButton,
  ]);
}

function renderRequestFinalizationActions(form) {
  const successButton = element("button", {
    className: "button admin-request-finalize-success",
    type: "button",
    "data-request-finalize-success": "",
    onClick() {
      finalizeSolicitacao("adocao_concluida", form);
    },
  }, [
    icon("fa-house-circle-check"),
    element("span", { text: "Finalizar adocao" }),
  ]);
  const failedButton = element("button", {
    className: "button button-secondary admin-request-finalize-failed",
    type: "button",
    "data-request-finalize-failed": "",
    onClick() {
      finalizeSolicitacao("adocao_cancelada", form);
    },
  }, [
    icon("fa-rotate-left"),
    element("span", { text: "Voltar para disponivel" }),
  ]);

  return element("div", { className: "admin-form-actions admin-animal-modal-actions admin-request-review-actions admin-request-decision-footer admin-request-finalization-panel" }, [
    element("div", { className: "admin-request-finalization-copy" }, [
      element("strong", { text: "Finalizar status da adocao" }),
      element("span", { text: "Use quando a familia ja respondeu se a adocao deu certo." }),
    ]),
    element("div", { className: "admin-request-finalization-actions" }, [
      failedButton,
      successButton,
    ]),
  ]);
}

function renderRequestUndoFinalizationActions(form) {
  const undoButton = element("button", {
    className: "button button-secondary admin-request-undo-finalization-button",
    type: "button",
    "data-request-undo-finalization": "",
    onClick() {
      revertFinalizacao(form);
    },
  }, [
    icon("fa-rotate-left"),
    element("span", { text: "Voltar atras" }),
  ]);

  return element("div", { className: "admin-form-actions admin-animal-modal-actions admin-request-review-actions admin-request-decision-footer admin-request-undo-finalization-panel" }, [
    element("div", { className: "admin-request-finalization-copy" }, [
      element("strong", { text: "Reverter finalizacao" }),
      element("span", { text: "Use se o animal voltou ao abrigo antes da exclusao automatica." }),
    ]),
    element("div", { className: "admin-request-finalization-actions" }, [
      undoButton,
    ]),
  ]);
}

function renderRequestClosedActions(detalhe) {
  return element("div", { className: "admin-form-actions admin-animal-modal-actions admin-request-review-actions admin-request-decision-footer" }, [
    element("span", {
      className: "admin-request-closed-note",
      text: detalhe?.status === "finalizada"
        ? "Esta solicitacao ja foi finalizada."
        : "Esta solicitacao ja foi encerrada.",
    }),
  ]);
}

function renderRequestHistoryToggle(events) {
  const panelId = `request-history-${String(currentDetail?.id || "current")}`;
  const panel = element("div", {
    className: "admin-request-history-panel",
    id: panelId,
    "data-request-history-panel": "",
    hidden: "hidden",
  }, [
    element("div", { className: "admin-request-history-list" }, renderTimelineItems(events)),
  ]);
  const buttonLabel = element("span", { text: "Mostrar Historico" });
  const chevron = icon("fa-chevron-down");
  const button = element("button", {
    className: "button button-secondary admin-request-history-toggle",
    type: "button",
    "aria-expanded": "false",
    "aria-controls": panelId,
    "data-request-history-toggle": "",
    onClick() {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
      buttonLabel.textContent = willOpen ? "Ocultar Historico" : "Mostrar Historico";
      chevron.classList.toggle("fa-chevron-up", willOpen);
      chevron.classList.toggle("fa-chevron-down", !willOpen);
    },
  }, [
    icon("fa-clock-rotate-left"),
    buttonLabel,
    chevron,
  ]);

  return element("section", { className: "admin-animal-detail-section admin-request-history-section" }, [
    element("div", { className: "admin-request-history-header" }, [
      element("div", {}, [
        element("h3", { text: "Historico" }),
        element("p", { className: "muted", text: "Eventos administrativos desta solicitacao." }),
      ]),
      button,
    ]),
    panel,
  ]);
}

function renderReviewProfileSide(detalhe) {
  const animal = detalhe?.animal || {};
  return element("aside", { className: "admin-animal-profile-side admin-request-review-side" }, [
    renderAnimalImage(animal, { className: "admin-animal-modal-photo" }),
    element("div", { className: "admin-animal-profile-heading" }, [
      element("h3", { text: animal.nome || "Animal" }),
      statusPill(detalhe.status),
      element("span", { className: "admin-animal-profile-code", text: `#S-${String(detalhe.id || 0).padStart(4, "0")}` }),
    ]),
    element("dl", { className: "admin-animal-profile-facts" }, [
      profileFact("fa-paw", "Especie", speciesLabel(animal.especie)),
      profileFact("fa-ruler-combined", "Porte", formatEnum(animal.porte)),
      profileFact("fa-cake-candles", "Idade", formatAge(animal.idadeMeses)),
      profileFact("fa-venus-mars", "Sexo", formatEnum(animal.sexo)),
      profileFact("fa-list-ol", "Fila", detalhe.posicaoFila ? `${detalhe.posicaoFila} de ${detalhe.totalAtivas || "-"}` : "-"),
    ]),
  ]);
}

async function confirmStartAnalysis() {
  if (!startAnalysisRequest?.id || isStartAnalysisSubmitting) {
    return;
  }
  const requestId = startAnalysisRequest.id;
  isStartAnalysisSubmitting = true;
  setStartAnalysisControlsDisabled(true);
  setFeedback(shell.feedback, "Iniciando analise...");
  try {
    currentDetail = await iniciarModeracaoAnalise(requestId);
    startAnalysisRequest = null;
    startAnalysisModal.hidden = true;
    reviewModalTitle.textContent = `Revisar solicitacao #S-${String(requestId).padStart(4, "0")}`;
    reviewModal.hidden = false;
    syncAdminModalOpenState();
    renderReviewModal(currentDetail);
    await loadRequests({ keepExpanded: true });
    setFeedback(shell.feedback, "Solicitacao em analise.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  } finally {
    isStartAnalysisSubmitting = false;
    setStartAnalysisControlsDisabled(false);
  }
}

function setStartAnalysisControlsDisabled(disabled) {
  startAnalysisCancelButton.disabled = disabled;
  startAnalysisConfirmButton.disabled = disabled;
}

async function decideSolicitacao(status, form) {
  if (!currentDetail?.id || isDecisionSubmitting) {
    return;
  }
  isDecisionSubmitting = true;
  setRequestControlsDisabled(true);
  setFeedback(shell.feedback, "Processando decisao...");
  try {
    const response = await decidirModeracaoSolicitacao(currentDetail.id, buildDecisaoPayload(status, form));
    currentDetail = response.solicitacao || currentDetail;
    renderReviewModal(currentDetail);
    await loadRequests({ keepExpanded: true });
    setFeedback(shell.feedback, response.mensagem || "Solicitacao atualizada.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  } finally {
    isDecisionSubmitting = false;
    setRequestControlsDisabled(false);
  }
}

async function finalizeSolicitacao(resultado, form) {
  if (!currentDetail?.id || isDecisionSubmitting) {
    return;
  }
  isDecisionSubmitting = true;
  setRequestControlsDisabled(true);
  setFeedback(shell.feedback, "Finalizando adocao...");
  try {
    const response = await finalizarModeracaoSolicitacao(currentDetail.id, buildFinalizacaoPayload(resultado, form));
    currentDetail = response.solicitacao || currentDetail;
    renderReviewModal(currentDetail);
    await loadRequests({ keepExpanded: true });
    setFeedback(shell.feedback, response.mensagem || "Adocao finalizada.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  } finally {
    isDecisionSubmitting = false;
    setRequestControlsDisabled(false);
  }
}

async function revertFinalizacao(form) {
  if (!currentDetail?.id || isDecisionSubmitting) {
    return;
  }
  isDecisionSubmitting = true;
  setRequestControlsDisabled(true);
  setFeedback(shell.feedback, "Revertendo finalizacao...");
  try {
    const response = await reverterFinalizacaoModeracaoSolicitacao(
      currentDetail.id,
      buildReversaoFinalizacaoPayload(form)
    );
    currentDetail = response.solicitacao || currentDetail;
    renderReviewModal(currentDetail);
    await loadRequests({ keepExpanded: true });
    setFeedback(shell.feedback, response.mensagem || "Finalizacao revertida.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  } finally {
    isDecisionSubmitting = false;
    setRequestControlsDisabled(false);
  }
}

async function deleteSolicitacao(item) {
  if (!item?.id || isDecisionSubmitting) {
    return;
  }
  isDecisionSubmitting = true;
  setFeedback(shell.feedback, "Excluindo solicitacao...");
  try {
    await excluirModeracaoSolicitacao(item.id);
    if (currentDetail?.id === item.id) {
      closeReviewModal();
    }
    await loadRequests({ keepExpanded: true });
    setFeedback(shell.feedback, "Solicitacao excluida.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  } finally {
    isDecisionSubmitting = false;
  }
}

function setRequestControlsDisabled(disabled) {
  for (const control of reviewModalBody.querySelectorAll("button, input, textarea")) {
    control.disabled = disabled;
  }
}

function toggleAnimalGroup(group) {
  const key = animalGroupKey(group);
  const transition = getAnimatedDropdownTransition(expandedAnimalId, key);
  expandedAnimalId = transition.nextExpandedKey;
  animateAnimalGroupTransition(transition);
}

function animateAnimalGroupTransition({ openingKey, closingKey }) {
  if (dropdownAnimationFrame) {
    cancelNextFrame(dropdownAnimationFrame);
    dropdownAnimationFrame = 0;
  }

  if (closingKey) {
    syncAnimalGroupExpansion(closingKey, false);
  }

  if (!openingKey) {
    return;
  }

  syncAnimalGroupExpansion(openingKey, false);
  dropdownAnimationFrame = nextFrame(() => {
    syncAnimalGroupExpansion(openingKey, true);
    dropdownAnimationFrame = 0;
  });
}

function syncAnimalGroupExpansion(key, isExpanded) {
  const parts = findAnimalGroupParts(key);
  if (!parts.detailRow) {
    return;
  }

  parts.animalRow?.classList.toggle("admin-request-animal-expanded", isExpanded);
  parts.detailRow.classList.toggle("admin-request-detail-row-open", isExpanded);
  parts.detailRow.classList.toggle("admin-request-detail-row-closed", !isExpanded);
  parts.dropdown?.setAttribute("aria-hidden", String(!isExpanded));

  if (parts.toggle) {
    const animalName = parts.animalRow?.dataset.animalName || "animal";
    parts.toggle.setAttribute("aria-expanded", String(isExpanded));
    parts.toggle.setAttribute("aria-label", `${isExpanded ? "Fechar" : "Abrir"} solicitacoes de ${animalName}`);
    setToggleChevron(parts.toggle, isExpanded);
  }
}

function findAnimalGroupParts(key) {
  const animalRow = findElementByDataset("animalGroup", key);
  const detailRow = findElementByDataset("requestDetailRow", key);
  return {
    animalRow,
    detailRow,
    dropdown: detailRow?.querySelector("[data-request-dropdown]") || null,
    toggle: animalRow?.querySelector("[data-request-animal-toggle]") || null,
  };
}

function findElementByDataset(name, value) {
  return Array.from(requestList.querySelectorAll(`[data-${kebabCase(name)}]`))
    .find((item) => item.dataset[name] === value) || null;
}

function nextFrame(callback) {
  if (typeof window.requestAnimationFrame === "function") {
    return { type: "frame", id: window.requestAnimationFrame(callback) };
  }
  return { type: "timeout", id: window.setTimeout(callback, 16) };
}

function cancelNextFrame(handle) {
  if (handle?.type === "frame" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(handle.id);
    return;
  }
  if (handle?.type === "timeout") {
    window.clearTimeout(handle.id);
  }
}

function kebabCase(value) {
  return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function setToggleChevron(button, isExpanded) {
  const chevron = button.querySelector(".library-icon");
  if (!chevron) {
    return;
  }
  chevron.classList.toggle("fa-chevron-up", isExpanded);
  chevron.classList.toggle("fa-chevron-down", !isExpanded);
}

function changePage(page) {
  const nextPage = Math.max(0, Math.min(page, Math.max(0, currentPage.totalPaginas - 1)));
  if (nextPage === requestFilters.pagina) {
    return;
  }
  requestFilters.pagina = nextPage;
  loadRequests();
}

function syncFiltersFromToolbar({ resetPage = true } = {}) {
  requestFilters.q = toolbarSearch.value.trim();
  requestFilters.status = readFilterValue("status");
  requestFilters.atencao = readFilterValue("atencao");
  requestFilters.especie = readFilterValue("especie");
  requestFilters.perfil = readFilterValue("perfil");
  requestFilters.ordem = readFilterValue("ordem") || "atencao";
  requestFilters.tamanho = PAGE_SIZE;
  if (resetPage) {
    requestFilters.pagina = 0;
  }
  loadRequests();
}

function buildApiFilters() {
  return {
    status: requestFilters.status,
    atencao: requestFilters.atencao,
    especie: requestFilters.especie,
    perfil: requestFilters.perfil,
    q: requestFilters.q,
    ordem: requestFilters.ordem || "atencao",
    pagina: requestFilters.pagina,
    tamanho: PAGE_SIZE,
  };
}

function normalizePage(response = {}) {
  return {
    ...emptyPage(),
    ...response,
    itens: Array.isArray(response.itens) ? response.itens : [],
    pagina: Number.isFinite(Number(response.pagina)) ? Number(response.pagina) : 0,
    tamanho: Number.isFinite(Number(response.tamanho)) ? Number(response.tamanho) : PAGE_SIZE,
    totalItens: Number.isFinite(Number(response.totalItens)) ? Number(response.totalItens) : 0,
    totalPaginas: Number.isFinite(Number(response.totalPaginas)) ? Number(response.totalPaginas) : 0,
    primeira: Boolean(response.primeira ?? true),
    ultima: Boolean(response.ultima ?? true),
  };
}

function emptyPage() {
  return {
    itens: [],
    pagina: 0,
    tamanho: PAGE_SIZE,
    totalItens: 0,
    totalPaginas: 0,
    primeira: true,
    ultima: true,
    altaAtencao: 0,
    mediaAtencao: 0,
    baixaAtencao: 0,
    animaisComFila: 0,
    aguardandoDecisao: 0,
  };
}

function renderPagination() {
  const totalPages = currentPage.totalPaginas || 0;
  const current = totalPages ? currentPage.pagina + 1 : 0;
  pageStatus.textContent = totalPages
    ? `Pagina ${current} de ${totalPages} - ${currentPage.totalItens} solicitacoes`
    : "Nenhuma pagina disponivel";
  prevPageButton.disabled = currentPage.primeira || !totalPages;
  nextPageButton.disabled = currentPage.ultima || !totalPages;
}

function updateFilterSummary() {
  if (!currentPage.totalItens) {
    filterSummary.textContent = "Nenhuma solicitacao encontrada para os filtros atuais.";
    return;
  }

  const groups = groupRequestsByAnimal(currentPage.itens || []);
  const from = currentPage.pagina * PAGE_SIZE + 1;
  const to = Math.min(currentPage.totalItens, from + currentPage.itens.length - 1);
  filterSummary.textContent = `${from}-${to} de ${currentPage.totalItens} solicitacoes exibidas em ${groups.length} animais.`;
}

function readFilterValue(name) {
  return filterToolbar.elements.namedItem(name)?.value || "";
}

function tableHeader(label, className = "") {
  return element("th", { scope: "col", className, text: label });
}

function tableCell(label, children, className = "") {
  return element("td", { className, "data-label": label }, children);
}

function reviewSection(title, children, className = "admin-animal-detail-list") {
  return element("section", { className: "admin-animal-detail-section admin-request-review-section" }, [
    element("h3", { text: title }),
    element("div", { className }, children),
  ]);
}

function reviewFact(label, value) {
  return element("div", { className: "admin-request-review-fact" }, [
    element("span", { text: label }),
    element("strong", { text: displayValue(value) }),
  ]);
}

function detailRow(label, value) {
  return element("div", { className: "admin-animal-detail-row" }, [
    element("dt", { text: label }),
    element("dd", { text: displayValue(value) }),
  ]);
}

function renderTimelineItems(events) {
  if (!events.length) {
    return [element("p", { className: "muted", text: "Nenhum evento registrado para esta solicitacao." })];
  }
  return events.map((event) => element("article", { className: "admin-request-history-item" }, [
    element("strong", { text: event.titulo || formatEnum(event.tipo) }),
    element("span", { text: formatDateTime(event.dataEvento) }),
    event.descricao ? element("p", { text: event.descricao }) : null,
  ]));
}

function profileFact(iconName, label, value) {
  return element("div", { className: "admin-animal-profile-fact" }, [
    icon(iconName),
    element("dt", { text: label }),
    element("dd", { text: displayValue(value) }),
  ]);
}

function filterField(label, control) {
  return element("label", { className: "filter-field" }, [
    element("span", { text: label }),
    control,
  ]);
}

function filterSelect(name, options, selected = "") {
  return element("select", { name }, options.map(([value, label]) => (
    element("option", { value, selected: value === selected ? "selected" : null, text: label })
  )));
}

function requestFact(value, label) {
  return element("span", { className: "admin-request-fact" }, [
    element("strong", { text: displayValue(value) }),
    element("small", { text: label }),
  ]);
}

function attentionPill(level) {
  const normalized = String(level || "baixa").toLowerCase();
  const labels = {
    alta: "Alta",
    media: "Media",
    baixa: "Baixa",
  };
  return element("span", {
    className: `admin-attention-pill admin-attention-${labels[normalized] ? normalized : "baixa"}`,
    text: labels[normalized] || "Baixa",
  });
}

function animalGroupKey(group) {
  return String(group.animalId ?? group.animalNome ?? "");
}

function animalFromGroup(group) {
  return {
    id: group.animalId,
    nome: group.animalNome,
    especie: group.especie,
    imagemUrl: group.imagemUrl,
    imagemUrls: group.imagemUrls,
  };
}

function speciesLabel(value) {
  const species = String(value || "").toLowerCase();
  if (species === "cao" || species === "cachorro") {
    return "Cao";
  }
  if (species === "gato") {
    return "Gato";
  }
  return formatEnum(value);
}

function speciesIcon(value) {
  const species = String(value || "").toLowerCase();
  if (species === "cao" || species === "cachorro") {
    return "fa-dog";
  }
  if (species === "gato") {
    return "fa-cat";
  }
  return "fa-paw";
}

function formatBooleanLabel(value) {
  return value ? "Sim" : "Nao";
}

function displayValue(value) {
  const cleanValue = String(value ?? "").trim();
  return cleanValue || "-";
}

function isEncerrada(status) {
  return status === "recusada" || status === "finalizada";
}

function handleReviewModalKeydown(event) {
  if (event.key === "Escape") {
    closeReviewModal();
  }
}

function handleStartAnalysisModalKeydown(event) {
  if (event.key === "Escape") {
    closeStartAnalysisPrompt();
  }
}

function syncAdminModalOpenState() {
  document.body.classList.toggle("modal-open", !reviewModal.hidden || !startAnalysisModal.hidden);
}

function icon(name) {
  return element("i", { className: `fa-solid ${name} library-icon`, "aria-hidden": "true" });
}
