import { createIcon } from "./icons.js";
import { element } from "./ui.js";

export function createAdoptionSuccessModal(solicitacao, { onClose = () => {} } = {}) {
  const animalNome = String(solicitacao?.animalNome || "esse animal").trim() || "esse animal";
  const solicitacaoId = Number.parseInt(solicitacao?.id, 10);
  let modal = null;

  const close = () => {
    if (!modal || modal.hidden) {
      return;
    }
    modal.hidden = true;
    onClose(modal);
  };

  modal = element("div", {
    className: "login-modal adoption-success-modal",
    "data-adoption-success-modal": "",
  }, [
    element("button", {
      className: "login-backdrop",
      type: "button",
      "aria-label": "Fechar confirmação de solicitação",
      onClick: close,
    }),
    element("section", {
      className: "login-dialog adoption-success-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "adoption-success-title",
    }, [
      element("button", {
        className: "modal-close",
        type: "button",
        "aria-label": "Fechar confirmação de solicitação",
        onClick: close,
      }, [
        createIcon("x"),
      ]),
      element("span", { className: "login-mark adoption-success-mark", "aria-hidden": "true" }, [
        createIcon("check"),
      ]),
      element("div", { className: "login-heading adoption-success-heading" }, [
        element("p", { className: "overline", text: "Solicitação enviada" }),
        element("h2", { id: "adoption-success-title", text: `Você entrou na fila de adoção para ${animalNome}` }),
        element("p", {
          text: "Sua solicitação foi feita. A equipe vai analisar o pedido e avisar quando houver uma decisão.",
        }),
      ]),
      element("dl", { className: "adoption-success-details" }, [
        detail("Animal", animalNome),
        detail("Status", "Pendente"),
        detail("Solicitação", Number.isInteger(solicitacaoId) ? `#${solicitacaoId}` : "Registrada"),
      ]),
      element("p", {
        className: "adoption-success-note",
        text: "Você pode acompanhar o andamento em Minhas Solicitações no menu da sua conta.",
      }),
      element("div", { className: "adoption-success-actions" }, [
        element("a", { className: "button", href: "recomendados.html", text: "Ver outros animais" }),
        element("a", { className: "button button-secondary", href: "index.html", text: "Voltar ao início" }),
      ]),
    ]),
  ]);

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });

  return modal;
}

export function showAdoptionSuccessModal(solicitacao, { documentRef = document } = {}) {
  const existingModal = documentRef.querySelector?.("[data-adoption-success-modal]");
  existingModal?.remove?.();

  const modal = createAdoptionSuccessModal(solicitacao, {
    onClose() {
      documentRef.body?.classList.remove("modal-open");
    },
  });

  documentRef.body?.append(modal);
  documentRef.body?.classList.add("modal-open");
  return modal;
}

function detail(label, value) {
  return element("div", { className: "adoption-success-detail" }, [
    element("dt", { text: label }),
    element("dd", { text: value }),
  ]);
}
