import { fetchAdminAnimals, fetchAdminOverview, fetchAdminUnreadMessages, fetchAdminUsers } from "../admin-api.js";
import { fetchModeracaoFila } from "../admin-moderacao-api.js";
import { emptyState, showError } from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { element, formatAge, formatEnum, renderAnimalImage, setFeedback } from "../ui.js";

const content = element("main", { className: "admin-page admin-overview-page admin-reference-dashboard" });
const shell = createAdminShell({
  active: "overview",
  title: "Visão geral",
  content,
});

if (shell) {
  loadOverview();
}

async function loadOverview() {
  setFeedback(shell.feedback, "Carregando indicadores...");
  try {
    const resumo = await fetchAdminOverview();
    const [animals, users, grupos, messages] = await Promise.all([
      safeFetch(fetchAdminAnimals, []),
      safeFetch(fetchAdminUsers, []),
      safeFetch(() => fetchModeracaoFila({ status: "", q: "", ordem: "mais_recentes" }), []),
      safeFetch(fetchAdminUnreadMessages, []),
    ]);

    renderOverview({
      resumo,
      animals,
      users,
      requests: extractRequests(grupos),
      messages,
    });
    setFeedback(shell.feedback, "");
  } catch (error) {
    showError(shell.feedback, error);
    renderOverview({
      resumo: {},
      animals: [],
      users: [],
      requests: [],
      messages: [],
    });
  }
}

async function safeFetch(fetcher, fallback) {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}

function renderOverview({ resumo, animals, users, requests, messages }) {
  const recentAnimals = animals.slice(0, 5);
  const recentRequests = requests.slice(0, 5);
  const unreadMessages = messages.slice(0, 5);
  const recentActivity = buildRecentActivity({ animals, users, requests, messages: unreadMessages });
  const totalUsers = numberOrFallback(resumo.totalUsuarios, users.length);

  content.replaceChildren(
    element("section", { className: "admin-stat-grid", "aria-label": "Indicadores principais" }, [
      statCard("Animais disponíveis", numberOrFallback(resumo.animaisDisponiveis, 0), `${numberOrFallback(resumo.totalAnimais, 0)} animais cadastrados`, "fa-paw", "green"),
      statCard("Solicitações em análise", numberOrFallback(resumo.solicitacoesEmAnalise, 0), `${numberOrFallback(resumo.solicitacoesPendentes, 0)} pendentes`, "fa-clipboard-list", "orange"),
      statCard("Adoções concluídas", numberOrFallback(resumo.solicitacoesAprovadas, 0), `${numberOrFallback(resumo.solicitacoesRecusadas, 0)} recusadas`, "fa-circle-check", "green"),
      statCard("Usuários cadastrados", totalUsers.toLocaleString("pt-BR"), `${numberOrFallback(resumo.totalAdministradores, 0)} administradores`, "fa-users", "green"),
      statCard("Relatórios gerados", numberOrFallback(resumo.relatoriosGerados, 0), reportsDetail(resumo.relatoriosGerados), "fa-chart-simple", "orange"),
    ]),
    element("section", { className: "admin-overview-layout" }, [
      element("div", { className: "admin-overview-main" }, [
        dashboardCard("Animais recentes", "Ver todos", "admin-animais.html", [
          animalsTable(recentAnimals),
        ], "admin-card-large"),
        element("div", { className: "admin-overview-lower-grid" }, [
          dashboardCard("Solicitações recentes", "Ver todas", "admin-solicitacoes.html", [
            requestsTable(recentRequests),
          ]),
          dashboardCard("Atividade recente", "Ver todas", "admin-relatorios.html", [
            activityList(recentActivity),
          ]),
        ]),
      ]),
      element("aside", { className: "admin-right-rail", "aria-label": "Painéis rápidos" }, [
        dashboardCard("Fila de moderação", "Ver todos", "admin-moderacao.html", [
          moderationQueue(resumo),
        ]),
        dashboardCard("Mensagens não lidas", "Ver todas", "admin-mensagens.html", [
          messagesList(unreadMessages),
          element("a", { className: "admin-card-footer-link", href: "admin-mensagens.html", text: "Ir para mensagens" }),
        ]),
        dashboardCard("Relatórios rápidos", "", "", [
          quickReports(),
          element("a", { className: "button admin-report-button", href: "admin-relatorios.html" }, [
            icon("fa-square-poll-horizontal"),
            element("span", { text: "Gerar relatório" }),
          ]),
        ]),
      ]),
    ]),
  );
}

function statCard(label, value, detail, iconName, tone) {
  return element("article", { className: "admin-stat-card" }, [
    element("span", { className: `admin-stat-icon admin-stat-${tone}` }, [icon(iconName)]),
    element("div", { className: "admin-stat-copy" }, [
      element("span", { text: label }),
      element("strong", { text: String(value) }),
      element("small", { text: detail }),
    ]),
  ]);
}

function dashboardCard(title, actionLabel, actionHref, body, className = "") {
  return element("section", { className: ["admin-dashboard-card", className].filter(Boolean).join(" ") }, [
    element("div", { className: "admin-dashboard-card-header" }, [
      element("h2", { text: title }),
      actionLabel ? element("a", { href: actionHref, text: actionLabel }) : null,
    ]),
    ...body,
  ]);
}

function animalsTable(animals) {
  if (!animals.length) {
    return emptyState("Nenhum animal cadastrado", "Os animais aparecerão aqui assim que forem cadastrados.");
  }

  return element("div", { className: "admin-dashboard-table admin-animals-table" }, [
    tableHeader(["Foto", "Nome", "Espécie", "Idade", "Porte", "Status", "Data de cadastro", "Ações"]),
    ...animals.map((animal) => element("div", { className: "admin-dashboard-row" }, [
      element("span", { className: "admin-table-photo" }, [renderAnimalImage(normalizeAnimal(animal), { className: "admin-table-thumb" })]),
      element("strong", { text: animal.nome || "-" }),
      element("span", { text: speciesLabel(animal.especie) }),
      element("span", { text: formatAge(animal.idadeMeses) }),
      element("span", { text: formatEnum(animal.porte) }),
      statusBadge(animal.status),
      element("span", { text: formatDate(animal.dataCadastro || animal.dataResgate) }),
      element("span", { className: "admin-table-actions" }, [
        iconButton("fa-eye", "Ver"),
        iconButton("fa-pen", "Editar"),
        iconButton("fa-ellipsis-vertical", "Mais ações"),
      ]),
    ])),
  ]);
}

function requestsTable(requests) {
  if (!requests.length) {
    return emptyState("Nenhuma solicitação recente", "As solicitações aparecerão aqui quando forem recebidas.");
  }

  return element("div", { className: "admin-dashboard-table admin-requests-table" }, [
    tableHeader(["Solicitante", "Animal", "Data", "Status", ""]),
    ...requests.map((request) => element("div", { className: "admin-dashboard-row" }, [
      element("span", { className: "admin-person-cell" }, [
        element("span", { className: "admin-initials", text: request.initials || initials(request.solicitante) }),
        element("span", { text: request.solicitante }),
      ]),
      element("span", { text: request.animal }),
      element("span", { text: formatDate(request.data) }),
      statusBadge(request.status),
      iconButton("fa-eye", "Ver solicitação"),
    ])),
  ]);
}

function moderationQueue(resumo) {
  return element("div", { className: "admin-queue-list" }, [
    queueItem("fa-clipboard-list", "Animais aguardando aprovação", numberOrFallback(resumo.animaisEmAnalise, 0), "orange"),
    queueItem("fa-hourglass-half", "Solicitações pendentes", numberOrFallback(resumo.solicitacoesPendentes, 0), "orange"),
    queueItem("fa-magnifying-glass", "Solicitações em análise", numberOrFallback(resumo.solicitacoesEmAnalise, 0), "orange"),
    queueItem("fa-ban", "Solicitações recusadas", numberOrFallback(resumo.solicitacoesRecusadas, 0), "red"),
  ]);
}

function queueItem(iconName, label, count, tone) {
  return element("a", { className: "admin-queue-item", href: "admin-moderacao.html" }, [
    icon(iconName),
    element("span", { text: label }),
    element("strong", { className: `admin-count-pill admin-count-${tone}`, text: String(count) }),
    icon("fa-chevron-right"),
  ]);
}

function messagesList(messages) {
  if (!messages.length) {
    return emptyState("Nenhuma mensagem não lida", "As notificações pendentes dos usuários aparecerão aqui.");
  }

  return element("div", { className: "admin-message-list" }, messages.map((message) => (
    element("a", { className: "admin-message-item", href: "admin-mensagens.html" }, [
      element("span", { className: "admin-initials admin-message-initials", text: initials(message.adotanteNome) }),
      element("span", { className: "admin-message-copy" }, [
        element("strong", { text: message.adotanteNome || "Usuário" }),
        element("small", { text: message.mensagem || message.titulo || "-" }),
      ]),
      element("time", { text: formatDateTime(message.dataCriacao) }),
      element("span", { className: "admin-unread-dot", "aria-hidden": "true" }),
    ])
  )));
}

function activityList(activities) {
  if (!activities.length) {
    return emptyState("Nenhuma atividade recente", "Cadastros, solicitações e mensagens aparecerão aqui.");
  }

  return element("div", { className: "admin-activity-list" }, activities.map((activity) => (
    element("div", { className: "admin-activity-item" }, [
      element("span", { className: `admin-activity-icon admin-activity-${activity.tone}` }, [icon(activity.icon)]),
      element("span", { text: activity.title }),
      element("time", { text: formatDateTime(activity.date) }),
    ])
  )));
}

function quickReports() {
  const reports = [
    ["fa-paw", "Adoções por período"],
    ["fa-chart-column", "Animais por espécie"],
    ["fa-clipboard-list", "Solicitações por status"],
    ["fa-calendar-days", "Usuários por cidade"],
  ];

  return element("div", { className: "admin-report-list" }, reports.map(([iconName, label]) => (
    element("a", { className: "admin-report-link", href: "admin-relatorios.html" }, [
      icon(iconName),
      element("span", { text: label }),
      icon("fa-chevron-right"),
    ])
  )));
}

function tableHeader(labels) {
  return element("div", { className: "admin-dashboard-row admin-dashboard-row-head" }, labels.map((label) => (
    element("span", { text: label })
  )));
}

function statusBadge(status) {
  const normalized = String(status || "").toLowerCase();
  const tone = normalized.includes("aprov") || normalized.includes("dispon")
    ? "success"
    : normalized.includes("recus") || normalized.includes("indis")
      ? "neutral"
      : "warning";

  return element("span", { className: `admin-status-pill admin-status-${tone}`, text: statusLabel(status) });
}

function iconButton(iconName, label) {
  return element("button", { className: "admin-icon-action", type: "button", "aria-label": label, title: label }, [
    icon(iconName),
  ]);
}

function extractRequests(grupos) {
  if (!Array.isArray(grupos)) {
    return [];
  }

  return grupos.flatMap((grupo) => (grupo.solicitacoes || []).map((solicitacao) => ({
    solicitante: solicitacao.adotanteNome || "Solicitante",
    animal: grupo.animalNome || "Animal",
    data: solicitacao.dataSolicitacao,
    status: solicitacao.status,
    initials: initials(solicitacao.adotanteNome),
  })));
}

function buildRecentActivity({ animals, users, requests, messages }) {
  return [
    ...animals.map((animal) => activityItem("fa-paw", "green", `Animal cadastrado: ${animal.nome || "Animal"}`, animal.dataCadastro || animal.dataResgate)),
    ...requests.map((request) => activityItem("fa-clipboard-list", "orange", `Solicitação ${statusLabel(request.status).toLowerCase()} para ${request.animal}`, request.data)),
    ...users.map((user) => activityItem("fa-user", "green", `${user.administrador ? "Administrador" : "Usuário"} cadastrado: ${user.nome || "Usuário"}`, user.dataCadastro)),
    ...messages.map((message) => activityItem("fa-envelope", "orange", `Mensagem não lida: ${message.titulo || message.mensagem || "Notificação"}`, message.dataCriacao)),
  ]
    .filter((activity) => activity.date)
    .sort((a, b) => timestamp(b.date) - timestamp(a.date))
    .slice(0, 5);
}

function activityItem(iconName, tone, title, date) {
  return { icon: iconName, tone, title, date };
}

function normalizeAnimal(animal) {
  return {
    ...animal,
    especie: String(animal.especie || "").toLowerCase() === "cachorro" ? "cao" : animal.especie,
  };
}

function speciesLabel(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "cao" || normalized === "cachorro") {
    return "Cachorro";
  }
  if (normalized === "gato") {
    return "Gato";
  }
  return formatEnum(value);
}

function statusLabel(value) {
  const normalized = String(value || "").toLowerCase();
  const labels = {
    disponivel: "Disponível",
    em_analise: "Em avaliação",
    aprovada: "Aprovada",
    aprovado: "Aprovada",
    recusada: "Rejeitada",
    recusado: "Rejeitada",
    indisponivel: "Indisponível",
  };
  return labels[normalized] || formatEnum(value);
}

function formatDate(value, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatDateTime(value, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function timestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function reportsDetail(value) {
  const total = numberOrFallback(value, 0);
  return total === 1 ? "1 relatório registrado" : `${total} relatórios registrados`;
}

function numberOrFallback(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "AD";
}

function icon(name, className = "") {
  return element("i", {
    className: ["fa-solid", name, "library-icon", className].filter(Boolean).join(" "),
    "aria-hidden": "true",
  });
}
