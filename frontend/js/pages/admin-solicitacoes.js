import { fetchModeracaoFila } from "../admin-moderacao-api.js";
import { emptyState, formatDateTime, statusPill, showError } from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { clearNode, element, setFeedback } from "../ui.js";

const params = new URLSearchParams(window.location.search);
const initialStatus = params.get("status") || "";
const content = element("main", { className: "admin-page" }, [
  element("section", { className: "admin-card" }, [
    element("div", { className: "admin-card-header" }, [
      element("h2", { text: "Solicitacoes de adocao" }),
      element("select", { "data-request-status": "" }, [
        option("", "Todas", initialStatus),
        option("pendente", "Pendentes", initialStatus),
        option("em_analise", "Em analise", initialStatus),
        option("aprovada", "Aprovadas", initialStatus),
        option("recusada", "Recusadas", initialStatus),
      ]),
    ]),
    element("div", { className: "admin-list", "data-request-list": "" }),
  ]),
]);
const shell = createAdminShell({
  active: "requests",
  title: "Solicitacoes",
  subtitle: "Acompanhe a fila por status e abra a central de moderacao quando precisar decidir.",
  content,
});
const statusSelect = content.querySelector("[data-request-status]");
const list = content.querySelector("[data-request-list]");

if (shell) {
  statusSelect.addEventListener("change", () => loadRequests(statusSelect.value));
  loadRequests(initialStatus);
}

async function loadRequests(status) {
  setFeedback(shell.feedback, "Carregando solicitacoes...");
  try {
    const grupos = await fetchModeracaoFila({ status, q: "", ordem: "mais_antigas" });
    renderRequests(grupos);
    setFeedback(shell.feedback, "");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function renderRequests(grupos) {
  clearNode(list);
  const solicitacoes = grupos.flatMap((grupo) => (grupo.solicitacoes || []).map((solicitacao) => ({
    ...solicitacao,
    animalNome: grupo.animalNome,
    animalResumo: grupo.animalResumo,
  })));

  if (!solicitacoes.length) {
    list.append(emptyState("Nenhuma solicitacao encontrada", "Altere o filtro ou aguarde novas solicitacoes."));
    return;
  }

  for (const solicitacao of solicitacoes) {
    list.append(element("article", { className: "admin-list-row" }, [
      element("div", {}, [
        element("strong", { text: `${solicitacao.adotanteNome} -> ${solicitacao.animalNome}` }),
        element("span", { className: "muted", text: `${solicitacao.animalResumo || "Animal"} - ${formatDateTime(solicitacao.dataSolicitacao)}` }),
      ]),
      statusPill(solicitacao.status),
      element("a", { className: "button button-secondary", href: "admin-moderacao.html", text: "Abrir moderacao" }),
    ]));
  }
}

function option(value, label, selected) {
  return element("option", { value, selected: value === selected ? "selected" : null, text: label });
}
