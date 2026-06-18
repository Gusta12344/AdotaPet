import { createAdminUser, fetchAdminUsers, promoteAdminUser } from "../admin-api.js";
import { emptyState, formatDateTime, renderRows, showError, statusPill, toFormBoolean } from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { element, setFeedback } from "../ui.js";

const tableBody = element("div", { className: "admin-list", "data-users-list": "" });
const form = element("form", { className: "admin-form admin-form-grid", "data-user-form": "" }, [
  field("Nome", element("input", { name: "nome", required: "required", autocomplete: "name" })),
  field("CPF", element("input", { name: "cpf", required: "required", autocomplete: "off" })),
  field("E-mail", element("input", { name: "email", type: "email", required: "required", autocomplete: "email" })),
  field("Telefone", element("input", { name: "telefone", required: "required", autocomplete: "tel" })),
  field("Endereco", element("input", { name: "endereco", required: "required", autocomplete: "street-address" })),
  field("Senha inicial", element("input", { name: "senha", type: "password", required: "required", minlength: "6", autocomplete: "new-password" })),
  field("Moradia", select("tipoMoradia", [
    ["apartamento", "Apartamento"],
    ["casa_sem_quintal", "Casa sem quintal"],
    ["casa_com_quintal", "Casa com quintal"],
  ])),
  field("Nivel de atividade", select("nivelAtividade", [
    ["sedentario", "Sedentario"],
    ["moderado", "Moderado"],
    ["ativo", "Ativo"],
  ])),
  field("Preferencia de porte", select("preferenciaPorte", [
    ["indiferente", "Indiferente"],
    ["pequeno", "Pequeno"],
    ["medio", "Medio"],
    ["grande", "Grande"],
  ])),
  field("Preferencia de especie", select("preferenciaEspecie", [
    ["indiferente", "Indiferente"],
    ["cao", "Cao"],
    ["gato", "Gato"],
    ["outro", "Outro"],
  ])),
  checkField("Tem criancas", "temCriancas"),
  checkField("Tem outros animais", "temOutrosAnimais"),
  checkField("Criar como administrador", "administrador"),
  element("div", { className: "admin-form-actions" }, [
    element("button", { className: "button", type: "submit", text: "Cadastrar usuario" }),
    element("button", { className: "button button-secondary", type: "reset", text: "Limpar" }),
  ]),
]);
const content = element("main", { className: "admin-page" }, [
  element("section", { className: "admin-card" }, [
    element("div", { className: "admin-card-header" }, [element("h2", { text: "Usuarios cadastrados" })]),
    tableBody,
  ]),
  element("section", { className: "admin-card", id: "novo" }, [
    element("div", { className: "admin-card-header" }, [element("h2", { text: "Cadastrar usuario" })]),
    form,
  ]),
]);
let users = [];
let query = "";
const shell = createAdminShell({
  active: "users",
  title: "Usuarios",
  subtitle: "Consulte adotantes, cadastre novos usuarios e conceda acesso administrativo.",
  searchPlaceholder: "Buscar usuario",
  onSearch(value) {
    query = value;
    renderUsers();
  },
  content,
});

if (shell) {
  form.addEventListener("submit", submitUser);
  loadUsers();
}

async function loadUsers() {
  setFeedback(shell.feedback, "Carregando usuarios...");
  try {
    users = await fetchAdminUsers();
    renderUsers();
    setFeedback(shell.feedback, "");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function renderUsers() {
  const needle = query.trim().toLowerCase();
  const filtered = users.filter((user) => {
    if (!needle) {
      return true;
    }
    return [user.nome, user.email, user.cpf].some((value) => String(value || "").toLowerCase().includes(needle));
  });

  renderRows(tableBody, filtered, renderUserRow, emptyState("Nenhum usuario encontrado", "Cadastre um novo usuario ou ajuste a busca."));
}

function renderUserRow(user) {
  return element("article", { className: "admin-list-row admin-user-row" }, [
    element("div", {}, [
      element("strong", { text: user.nome }),
      element("span", { className: "muted", text: `${user.email} - ${user.cpf}` }),
      element("small", { text: `Cadastro: ${formatDateTime(user.dataCadastro)}` }),
    ]),
    statusPill(user.administrador ? "administrador" : "adotante"),
    element("button", {
      className: "button button-secondary",
      type: "button",
      disabled: user.administrador ? "disabled" : null,
      text: user.administrador ? "Ja e admin" : "Tornar admin",
      onClick() {
        promoteUser(user.id);
      },
    }),
  ]);
}

async function submitUser(event) {
  event.preventDefault();
  const data = new FormData(form);
  setFeedback(shell.feedback, "Cadastrando usuario...");
  try {
    await createAdminUser({
      nome: data.get("nome"),
      cpf: data.get("cpf"),
      senha: data.get("senha"),
      email: data.get("email"),
      telefone: data.get("telefone"),
      endereco: data.get("endereco"),
      tipoMoradia: data.get("tipoMoradia"),
      temCriancas: toFormBoolean(data, "temCriancas"),
      temOutrosAnimais: toFormBoolean(data, "temOutrosAnimais"),
      nivelAtividade: data.get("nivelAtividade"),
      preferenciaPorte: data.get("preferenciaPorte"),
      preferenciaEspecie: data.get("preferenciaEspecie"),
      administrador: toFormBoolean(data, "administrador"),
    });
    form.reset();
    await loadUsers();
    setFeedback(shell.feedback, "Usuario cadastrado.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

async function promoteUser(id) {
  setFeedback(shell.feedback, "Promovendo usuario...");
  try {
    await promoteAdminUser(id);
    await loadUsers();
    setFeedback(shell.feedback, "Usuario agora e administrador.", "success");
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

function checkField(label, name) {
  return element("label", { className: "admin-check-field" }, [
    element("input", { type: "checkbox", name }),
    element("span", { text: label }),
  ]);
}

function select(name, options) {
  return element("select", { name, required: "required" }, options.map(([value, label]) => (
    element("option", { value, text: label })
  )));
}
