import { clearNode, element, formatAge, formatBoolean, formatEnum, renderAnimalImage } from "./ui.js";
import { canApproveSolicitacao, statusTabs } from "./admin-moderacao-state.js";
import { createIcon } from "./icons.js";

export function renderModeracaoResumo(target, resumo = {}) {
  if (!target) {
    return;
  }
  clearNode(target);
  target.append(
    element("h2", { text: "Resumo do dia" }),
    metric("Pendentes", resumo.pendentes ?? 0, "amber"),
    metric("Em análise", resumo.emAnalise ?? 0, "green"),
    metric("Aprovadas hoje", resumo.aprovadasHoje ?? 0, "mint")
  );
}

export function renderModeracaoTabs(target, { status, resumo = {}, onSelect } = {}) {
  if (!target) {
    return;
  }
  clearNode(target);
  for (const tab of statusTabs()) {
    const button = element("button", {
      className: `moderation-tab ${tab.value === status ? "moderation-tab-active" : ""}`,
      type: "button",
      dataset: { statusTab: tab.value },
      "aria-pressed": tab.value === status ? "true" : "false",
    }, [
      element("span", { text: humanizeModerationText(tab.label) }),
      element("strong", { className: `moderation-count moderation-count-${tab.tone}`, text: String(resumo[tab.countKey] ?? 0) }),
    ]);
    button.addEventListener("click", () => onSelect?.(tab.value));
    target.append(button);
  }
}

export function renderModeracaoQueue(target, { grupos = [], selectedId = null, onSelect } = {}) {
  if (!target) {
    return;
  }
  clearNode(target);
  if (!grupos.length) {
    target.append(element("p", { className: "empty-state", text: "Nenhuma solicitação encontrada." }));
    return;
  }

  for (const grupo of grupos) {
    const isExpanded = (grupo.solicitacoes || []).some((solicitacao) => solicitacao.id === selectedId);
    const firstSolicitacao = grupo.solicitacoes?.[0];
    const article = element("article", {
      className: `moderation-animal-group ${isExpanded ? "moderation-animal-group-expanded" : ""}`,
    });
    const header = element("button", {
      className: "moderation-animal-trigger",
      type: "button",
    }, [
      animalThumb(grupo),
      element("span", { className: "moderation-animal-heading" }, [
        element("strong", { text: grupo.animalNome }),
        element("small", { text: animalSummary(grupo) }),
      ]),
      element("span", { className: "moderation-group-count" }, [
        element("strong", { text: String(grupo.totalAtivas ?? 0) }),
        element("small", { text: "pendentes" }),
      ]),
      element("span", { className: "moderation-group-chevron", "aria-hidden": "true" }),
    ]);
    header.addEventListener("click", () => {
      if (firstSolicitacao) {
        onSelect?.(firstSolicitacao.id);
      }
    });
    article.append(header);

    const list = element("div", { className: "moderation-request-list" });
    for (const solicitacao of isExpanded ? grupo.solicitacoes || [] : []) {
      const item = element("button", {
        className: `moderation-request ${solicitacao.id === selectedId ? "moderation-request-active" : ""}`,
        type: "button",
        dataset: { solicitacaoId: String(solicitacao.id) },
      }, [
        element("span", { className: "moderation-request-icon" }, [moderationIcon("user")]),
        element("span", { className: "moderation-request-main" }, [
          element("strong", { text: solicitacao.adotanteNome }),
          element("small", { text: `Solicitado em ${formatQueueDateTime(solicitacao.dataSolicitacao)}` }),
        ]),
        element("span", {
          className: `moderation-pill ${solicitacao.posicaoFila === 1 ? "moderation-pill-green" : "moderation-pill-amber"}`,
          text: solicitacao.posicaoFila > 0 ? queuePosition(solicitacao.posicaoFila) : moderationLabel(solicitacao.status),
        }),
      ]);
      item.addEventListener("click", () => onSelect?.(solicitacao.id));
      list.append(item);
    }
    article.append(list);
    target.append(article);
  }
}

export function renderModeracaoDetail(target, detalhe, { onStartAnalysis } = {}) {
  if (!target) {
    return;
  }
  clearNode(target);
  if (!detalhe) {
    target.append(element("p", { className: "empty-state", text: "Selecione uma solicitação para revisar." }));
    return;
  }

  const animal = detalhe.animal || {};
  const adotante = detalhe.adotante || {};
  target.append(
    element("div", { className: "moderation-detail-back" }, [
      element("button", { className: "link-button", type: "button" }, [
        moderationIcon("arrowLeft"),
        element("span", { text: "Voltar para a fila" }),
      ]),
      element("span", { className: "moderation-pill moderation-pill-green", text: detalhe.posicaoFila ? queuePosition(detalhe.posicaoFila) : moderationLabel(detalhe.status) }),
    ]),
    element("section", { className: "moderation-detail-hero" }, [
      animalImage(animal),
      element("div", {}, [
        element("h2", { text: animal.nome || "Animal" }),
        element("p", { className: "muted", text: animalMeta(animal) }),
        element("span", { className: "moderation-status", text: moderationLabel(animal.status) }),
      ]),
    ]),
    detailSection("Solicitação", [
      detailField("Adotante", adotante.nome),
      detailField("Solicitado em", formatDateTime(detalhe.dataSolicitacao)),
      detailField("Posição na fila", detalhe.posicaoFila ? queuePosition(detalhe.posicaoFila) : "-"),
    ]),
    detailSection("Contato do adotante", [
      detailLine("mail", adotante.email),
      detailLine("phone", adotante.telefone),
      detailLine("pin", adotante.endereco),
    ], "moderation-contact-list"),
    detailSection("Compatibilidade", [
      compatibility("home", "Mora em casa", moderationLabel(adotante.tipoMoradia)),
      compatibility("users", "Mora com 1 pessoa", adotante.temCriancas ? "Com crianças" : "Sem crianças"),
      compatibility("paw", "Já teve pets", formatModerationBoolean(adotante.temOutrosAnimais)),
    ], "moderation-compatibility-grid"),
    renderTimeline(detalhe.eventos || [], detalhe)
  );

  if (detalhe.status === "pendente") {
    const button = element("button", { className: "button moderation-start-button", type: "button", text: "Iniciar análise" });
    button.addEventListener("click", () => onStartAnalysis?.(detalhe.id));
    target.append(button);
  }
}

export function renderModeracaoDecision(target, detalhe, { onChecklistChange, onDecision } = {}) {
  if (!target) {
    return;
  }
  clearNode(target);
  if (!detalhe) {
    target.append(element("p", { className: "empty-state", text: "A decisão aparece depois de selecionar uma solicitação." }));
    return;
  }

  const checklist = detalhe.checklist || {};
  const form = element("form", { className: "moderation-decision-form" }, [
    element("h2", { text: "Decisão" }),
    element("p", { className: "muted", text: "Revise os itens abaixo antes de tomar uma decisão." }),
    checklistRow("dadosAdotanteConferidos", "Dados do adotante conferidos", checklist.dadosAdotanteConferidos),
    checklistRow("animalDisponivelConferido", "Animal ainda disponível", checklist.animalDisponivelConferido),
    checklistRow("contatoRevisado", "Contato revisado", checklist.contatoRevisado),
    element("label", { className: "moderation-observation" }, [
      element("span", { text: "Observação (opcional)" }),
      element("textarea", {
        name: "observacaoAdmin",
        maxlength: "500",
        placeholder: "Adicione uma observação sobre esta solicitação...",
        text: detalhe.observacaoAdmin || "",
      }),
      element("small", { text: `${String(detalhe.observacaoAdmin || "").length}/500 caracteres` }),
    ]),
    element("p", { className: "moderation-impact" }, [
      moderationIcon("warning"),
      element("span", { text: "Ao aprovar, o animal será marcado como adotado e todas as demais solicitações pendentes para este animal serão recusadas automaticamente." }),
    ]),
  ]);

  form.addEventListener("change", () => onChecklistChange?.(form));
  form.addEventListener("input", (event) => {
    if (event.target?.name === "observacaoAdmin") {
      onChecklistChange?.(form);
    }
  });

  const approveButton = element("button", {
    className: "button moderation-approve-button",
    type: "button",
    disabled: canApproveSolicitacao(detalhe) ? undefined : "disabled",
  }, [
    element("span", { className: "moderation-button-icon" }, [moderationIcon("check")]),
    element("span", { text: "Aprovar solicitação" }),
  ]);
  approveButton.addEventListener("click", () => onDecision?.("aprovada", form));

  const rejectButton = element("button", {
    className: "button moderation-reject-button",
    type: "button",
    disabled: isFinalizada(detalhe.status) ? "disabled" : undefined,
  }, [
    element("span", { className: "moderation-button-icon" }, [moderationIcon("x")]),
    element("span", { text: "Recusar" }),
  ]);
  rejectButton.addEventListener("click", () => onDecision?.("recusada", form));

  form.append(approveButton, rejectButton, element("a", {
    className: "moderation-history-link",
    href: "#",
    text: "Ver histórico de decisões deste animal",
  }));
  target.append(form);
}

function metric(label, value, tone) {
  return element("div", { className: "admin-day-metric" }, [
    element("span", { text: label }),
    element("strong", { className: `moderation-count moderation-count-${tone}`, text: String(value) }),
  ]);
}

function animalThumb(grupo) {
  return renderAnimalImage(animalForImage(grupo), { className: "moderation-thumb" });
}

function animalImage(animal) {
  return renderAnimalImage(animalForImage(animal), { className: "moderation-detail-image" });
}

function animalSummary(grupo) {
  return humanizeModerationText(grupo.animalResumo || moderationLabel(grupo.animalStatus));
}

function animalForImage(source = {}) {
  const imagemUrls = Array.isArray(source.imagemUrls) ? [...source.imagemUrls] : [];
  if (source.imagemUrl) {
    imagemUrls.unshift(source.imagemUrl);
  }

  return {
    id: source.id ?? source.animalId,
    nome: source.nome ?? source.animalNome,
    especie: source.especie,
    imagemUrls,
  };
}

function detailSection(title, children, bodyClassName = "moderation-detail-fields") {
  return element("section", { className: "moderation-detail-section" }, [
    element("h3", { text: title }),
    element("div", { className: bodyClassName }, children),
  ]);
}

function detailField(label, value) {
  return element("div", {}, [
    element("span", { text: label }),
    element("strong", { text: value || "-" }),
  ]);
}

function detailLine(iconName, value) {
  return element("p", { className: "moderation-contact-line" }, [
    element("span", { className: "moderation-line-icon", "aria-hidden": "true" }, [moderationIcon(iconName)]),
    element("strong", { text: value || "-" }),
  ]);
}

function compatibility(iconName, label, value) {
  return element("div", { className: "moderation-compatibility-item" }, [
    element("span", { className: "moderation-compatibility-icon", "aria-hidden": "true" }, [moderationIcon(iconName)]),
    element("div", {}, [
      element("span", { text: label }),
      element("strong", { text: value || "-" }),
    ]),
  ]);
}

function renderTimeline(eventos, detalhe) {
  const section = element("section", { className: "moderation-detail-section" }, [
    element("h3", { text: "Linha do tempo da solicitação" }),
  ]);
  const list = element("ol", { className: "moderation-timeline" });
  if (!eventos.length) {
    list.append(element("li", { text: "Aguardando eventos de moderação." }));
  }
  for (const evento of eventos) {
    list.append(element("li", { className: "moderation-timeline-done" }, [
      element("span", { className: "moderation-timeline-dot" }, [moderationIcon("check")]),
      element("strong", { text: moderationEventTitle(evento) }),
      element("span", { text: formatDateTime(evento.dataEvento) }),
      evento.adminNome ? element("small", { text: evento.adminNome }) : null,
      evento.descricao ? element("p", { text: humanizeModerationText(evento.descricao) }) : null,
    ]));
  }
  if (!isFinalizada(detalhe?.status)) {
    if (detalhe?.status === "em_analise") {
      list.append(element("li", { className: "moderation-timeline-current" }, [
        element("span", { className: "moderation-timeline-dot" }),
        element("strong", { text: "Em análise" }),
        element("span", { text: "Aguardando decisão da moderação" }),
      ]));
    }
    list.append(element("li", { className: "moderation-timeline-pending" }, [
      element("span", { className: "moderation-timeline-dot" }),
      element("strong", { text: "Decisão pendente" }),
      element("span", { text: "Aguardando ação da moderação" }),
    ]));
  }
  section.append(list);
  return section;
}

function checklistRow(name, label, checked) {
  return element("label", { className: "moderation-check-row" }, [
    element("input", { type: "checkbox", name, checked: checked ? "checked" : undefined }),
    element("span", { className: "moderation-check-box", "aria-hidden": "true" }, [checked ? moderationIcon("check") : null]),
    element("span", { text: label }),
    element("strong", { className: checked ? "moderation-ok-pill" : "moderation-pending-pill", text: checked ? "OK" : "Pendente" }),
  ]);
}

function animalMeta(animal) {
  return [animal.raca || "SRD", formatAge(animal.idadeMeses), moderationLabel(animal.sexo), moderationLabel(animal.porte)]
    .filter(Boolean)
    .join(" • ");
}

function queuePosition(position) {
  return `${position}º da fila`;
}

function moderationLabel(value) {
  if (!value) {
    return "-";
  }
  const labels = {
    aprovada: "Aprovada",
    adotado: "Adotado",
    casa_com_quintal: "Quintal pequeno",
    disponivel: "Disponível",
    em_analise: "Em análise",
    femea: "Fêmea",
    grande: "Porte grande",
    macho: "Macho",
    medio: "Porte médio",
    pendente: "Pendente",
    pequeno: "Porte pequeno",
    recusada: "Recusada",
  };
  return labels[String(value).toLowerCase()] || humanizeModerationText(formatEnum(value));
}

function moderationEventTitle(evento) {
  return humanizeModerationText(evento.titulo || formatEnum(evento.tipo));
}

function formatModerationBoolean(value) {
  return formatBoolean(value).replace("Nao", "Não");
}

function humanizeModerationText(value) {
  return String(value || "")
    .replaceAll(" - ", " • ")
    .replace(/\bSolicitacao\b/g, "Solicitação")
    .replace(/\bsolicitacao\b/g, "solicitação")
    .replace(/\bDecisao\b/g, "Decisão")
    .replace(/\bdecisao\b/g, "decisão")
    .replace(/\bModeracao\b/g, "Moderação")
    .replace(/\bmoderacao\b/g, "moderação")
    .replace(/\bAnalise\b/g, "Análise")
    .replace(/\banalise\b/g, "análise")
    .replace(/\bDisponivel\b/g, "Disponível")
    .replace(/\bdisponivel\b/g, "disponível")
    .replace(/\bFemea\b/g, "Fêmea")
    .replace(/\bfemea\b/g, "Fêmea")
    .replace(/\bmedio\b/g, "médio");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatQueueDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(",", " -");
}

function isFinalizada(status) {
  return status === "aprovada" || status === "recusada";
}

function moderationIcon(name) {
  return createIcon(name, { className: "moderation-icon" });
}
