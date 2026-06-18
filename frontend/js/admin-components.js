import { clearNode, element, formatAge, formatBoolean, formatEnum, setFeedback } from "./ui.js";

export function adminCard(title, body = [], { className = "", action = null } = {}) {
  return element("section", { className: ["admin-card", className].filter(Boolean).join(" ") }, [
    element("div", { className: "admin-card-header" }, [
      element("h2", { text: title }),
      action,
    ]),
    ...body,
  ]);
}

export function metricCard(label, value, detail = "", iconName = "fa-chart-simple") {
  return element("article", { className: "admin-metric-card" }, [
    element("span", { className: "admin-metric-icon" }, [
      element("i", { className: `fa-solid ${iconName} library-icon`, "aria-hidden": "true" }),
    ]),
    element("strong", { text: String(value ?? 0) }),
    element("span", { text: label }),
    detail ? element("small", { text: detail }) : null,
  ]);
}

export function emptyState(title, description) {
  return element("div", { className: "admin-empty-state" }, [
    element("i", { className: "fa-solid fa-circle-info library-icon", "aria-hidden": "true" }),
    element("strong", { text: title }),
    element("p", { className: "muted", text: description }),
  ]);
}

export function renderRows(target, items, renderItem, empty) {
  clearNode(target);
  if (!items.length) {
    target.append(empty);
    return;
  }
  for (const item of items) {
    target.append(renderItem(item));
  }
}

export function statusPill(value) {
  const normalized = String(value || "").toLowerCase();
  const tone = normalized.includes("aprov") || normalized.includes("dispon")
    ? "success"
    : normalized.includes("recus") || normalized.includes("adotado")
      ? "danger"
      : "warning";
  return element("span", { className: `admin-status-pill admin-status-${tone}`, text: formatEnum(value) });
}

export function formatDateTime(value) {
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

export function describeAnimal(animal) {
  return `${formatEnum(animal.especie)} - ${formatAge(animal.idadeMeses)} - ${formatEnum(animal.porte)}`;
}

export function booleanLabel(value) {
  return formatBoolean(Boolean(value));
}

export function toFormBoolean(formData, name) {
  return formData.get(name) === "on";
}

export function showError(feedback, error) {
  setFeedback(feedback, error?.message || "Nao foi possivel concluir a operacao", "error");
}

export function downloadReport(report) {
  const blob = new Blob([report.conteudo || ""], { type: report.mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = report.filename || "adotapet-relatorio.txt";
  link.click();
  URL.revokeObjectURL(url);
}
