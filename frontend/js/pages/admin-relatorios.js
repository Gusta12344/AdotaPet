import { fetchAdminReport } from "../admin-api.js";
import { adminCard, downloadReport, showError } from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { element, setFeedback } from "../ui.js";

const formatSelect = element("select", { name: "formato" }, [
  element("option", { value: "csv", text: "CSV" }),
  element("option", { value: "json", text: "JSON" }),
  element("option", { value: "html", text: "HTML" }),
  element("option", { value: "pdf", text: "PDF (imprimir/salvar)" }),
]);
const form = element("form", { className: "admin-form admin-report-form" }, [
  element("label", { className: "admin-field" }, [
    element("span", { text: "Formato do relatorio" }),
    formatSelect,
  ]),
  element("button", { className: "button", type: "submit", text: "Gerar relatorio" }),
]);
const content = element("main", { className: "admin-page" }, [
  adminCard("Relatorio geral", [
    element("p", { className: "muted", text: "Gere um arquivo com indicadores, animais e usuarios. A opcao PDF abre um HTML pronto para imprimir e salvar como PDF no navegador." }),
    form,
    element("pre", { className: "admin-report-preview", "data-report-preview": "", text: "Nenhum relatorio gerado ainda." }),
  ]),
]);
const shell = createAdminShell({
  active: "reports",
  title: "Relatorios",
  subtitle: "Exporte informacoes administrativas nos formatos mais uteis para revisao.",
  content,
});
const preview = content.querySelector("[data-report-preview]");

if (shell) {
  form.addEventListener("submit", generateReport);
}

async function generateReport(event) {
  event.preventDefault();
  setFeedback(shell.feedback, "Gerando relatorio...");
  try {
    const report = await fetchAdminReport(formatSelect.value);
    preview.textContent = report.conteudo.slice(0, 1400);
    if (formatSelect.value === "pdf" || report.formato === "html") {
      openPrintableReport(report);
    } else {
      downloadReport(report);
    }
    setFeedback(shell.feedback, "Relatorio gerado.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function openPrintableReport(report) {
  const blob = new Blob([report.conteudo || ""], { type: report.mimeType || "text/html" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    downloadReport(report);
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
