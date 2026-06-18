import { fetchAdminUsers, sendAdminMessage } from "../admin-api.js";
import { emptyState, showError } from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { clearNode, element, setFeedback } from "../ui.js";

const userSelect = element("select", { name: "adotanteId", required: "required" });
const form = element("form", { className: "admin-form", "data-message-form": "" }, [
  field("Usuario", userSelect),
  field("Titulo", element("input", { name: "titulo", required: "required", maxlength: "120", placeholder: "Assunto da mensagem" })),
  field("Mensagem", element("textarea", { name: "mensagem", required: "required", maxlength: "500", rows: "6", placeholder: "Escreva a mensagem para o usuario" })),
  element("button", { className: "button", type: "submit", text: "Enviar mensagem" }),
]);
const content = element("main", { className: "admin-page admin-two-column" }, [
  element("section", { className: "admin-card" }, [
    element("div", { className: "admin-card-header" }, [element("h2", { text: "Nova mensagem" })]),
    form,
  ]),
  element("section", { className: "admin-card" }, [
    element("div", { className: "admin-card-header" }, [element("h2", { text: "Usuarios disponiveis" })]),
    element("div", { className: "admin-list", "data-message-users": "" }),
  ]),
]);
const shell = createAdminShell({
  active: "messages",
  title: "Mensagens",
  subtitle: "Selecione um usuario cadastrado e envie uma notificacao administrativa.",
  content,
});
const usersList = content.querySelector("[data-message-users]");
let users = [];

if (shell) {
  form.addEventListener("submit", submitMessage);
  loadUsers();
}

async function loadUsers() {
  try {
    users = await fetchAdminUsers();
    renderUsers();
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function renderUsers() {
  clearNode(userSelect);
  clearNode(usersList);
  if (!users.length) {
    userSelect.append(element("option", { value: "", text: "Nenhum usuario encontrado" }));
    usersList.append(emptyState("Sem usuarios", "Cadastre usuarios antes de enviar mensagens."));
    return;
  }
  for (const user of users) {
    userSelect.append(element("option", { value: user.id, text: `${user.nome} - ${user.email}` }));
    usersList.append(element("article", { className: "admin-list-row" }, [
      element("div", {}, [
        element("strong", { text: user.nome }),
        element("span", { className: "muted", text: user.email }),
      ]),
      element("button", {
        className: "button button-secondary",
        type: "button",
        text: "Selecionar",
        onClick() {
          userSelect.value = String(user.id);
        },
      }),
    ]));
  }
}

async function submitMessage(event) {
  event.preventDefault();
  const data = new FormData(form);
  setFeedback(shell.feedback, "Enviando mensagem...");
  try {
    await sendAdminMessage({
      adotanteId: Number(data.get("adotanteId")),
      titulo: data.get("titulo"),
      mensagem: data.get("mensagem"),
    });
    form.reset();
    setFeedback(shell.feedback, "Mensagem enviada ao usuario.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function field(label, control) {
  return element("label", { className: "admin-field" }, [
    element("span", { text: label }),
    control,
  ]);
}
