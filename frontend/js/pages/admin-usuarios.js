import {
  createAdminUser,
  deleteAdminUser,
  deleteStandaloneAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  updateStandaloneAdminUser,
} from "../admin-api.js";
import { filterAndSortAdminUsers, paginateAdminUsers } from "../admin-user-filters.js";
import {
  adminCheckField as checkField,
  adminField as field,
  adminFilterField as filterField,
  adminFilterSelect as filterSelect,
  adminFormSection as formSection,
  adminIcon as icon,
  adminSelect as select,
  emptyState,
  formatDateTime,
  showError,
  toFormBoolean,
} from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { enhanceSelectDropdowns } from "../dropdowns.js";
import { clearNode, element, formatBoolean, formatEnum, setFeedback } from "../ui.js";

const PAGE_SIZE = 10;
const userList = element("div", { className: "admin-animal-table-region admin-user-table-region", "data-user-table-region": "" });
const userFilters = {
  query: "",
  perfil: "",
  moradia: "",
  atividade: "",
  ordem: "mais_recentes",
};
const toolbarSearch = element("input", {
  id: "admin-user-search",
  name: "busca",
  autocomplete: "off",
  placeholder: "Buscar por nome, e-mail, CPF ou telefone",
});
const filterSummary = element("p", {
  className: "admin-animal-filter-summary admin-user-filter-summary muted",
  "data-user-filter-summary": "",
});
const pageStatus = element("span", { "data-user-page-status": "" });
const prevPageButton = element("button", {
  className: "button button-secondary",
  type: "button",
  "data-user-page-prev": "",
}, [
  icon("fa-chevron-left"),
  element("span", { text: "Anterior" }),
]);
const nextPageButton = element("button", {
  className: "button",
  type: "button",
  "data-user-page-next": "",
}, [
  element("span", { text: "Proxima" }),
  icon("fa-chevron-right"),
]);
const pagination = element("nav", { className: "admin-pagination admin-user-pagination", "aria-label": "Paginacao dos usuarios" }, [
  pageStatus,
  element("div", { className: "admin-pagination-actions" }, [
    prevPageButton,
    nextPageButton,
  ]),
]);
const filterToolbar = element("form", {
  className: "animal-toolbar admin-animal-toolbar admin-user-toolbar",
  "aria-label": "Filtros dos usuarios cadastrados",
}, [
  element("label", { className: "search-field admin-animal-search-field admin-user-search-field" }, [
    icon("fa-magnifying-glass"),
    toolbarSearch,
  ]),
  filterField("Perfil", filterSelect("perfil", [
    ["", "Todos"],
    ["administrador", "Administradores"],
    ["adotante", "Adotantes"],
  ])),
  filterField("Moradia", filterSelect("moradia", [
    ["", "Todas"],
    ["apartamento", "Apartamento"],
    ["casa_sem_quintal", "Casa sem quintal"],
    ["casa_com_quintal", "Casa com quintal"],
  ])),
  filterField("Atividade", filterSelect("atividade", [
    ["", "Todas"],
    ["sedentario", "Sedentario"],
    ["moderado", "Moderado"],
    ["ativo", "Ativo"],
  ])),
  filterField("Ordenar", filterSelect("ordem", [
    ["mais_recentes", "Mais recentes"],
    ["mais_antigos", "Mais antigos"],
    ["nome_az", "Nome A-Z"],
    ["nome_za", "Nome Z-A"],
  ])),
  element("button", { className: "filter-button", type: "reset" }, [
    icon("fa-filter"),
    element("span", { text: "Limpar" }),
  ]),
]);
const primaryAction = element("button", { className: "button admin-primary-action", type: "button" }, [
  icon("fa-plus"),
  element("span", { text: "Novo Usuario Admistrador" }),
]);

const modalTitle = element("h2", { id: "admin-user-modal-title", "data-user-form-title": "", text: "Cadastrar administrador" });
const formCodeInput = element("input", {
  type: "text",
  value: formatUserCode(null),
  disabled: "disabled",
  "aria-label": "Codigo do usuario",
});
const formSide = element("aside", { className: "admin-animal-modal-side admin-user-modal-side", "data-user-form-side": "" });
const formIntro = element("div", { className: "admin-user-form-intro", "data-user-form-intro": "", hidden: "hidden" });
const form = element("form", { className: "admin-form admin-animal-form admin-user-form", "data-user-form": "" }, [
  element("input", { type: "hidden", name: "id" }),
  formSide,
  element("div", { className: "admin-animal-form-main admin-user-form-main" }, [
    formIntro,
    formSection("Identificacao", [
      field("Nome", element("input", { name: "nome", required: "required", autocomplete: "name" }), "admin-field-span-2"),
      field("ID (codigo)", formCodeInput),
      field("CPF", element("input", { name: "cpf", required: "required", autocomplete: "off" })),
      field("E-mail", element("input", { name: "email", type: "email", required: "required", autocomplete: "email" }), "admin-field-span-2"),
      field("Telefone", element("input", { name: "telefone", required: "required", autocomplete: "tel" }), "admin-user-phone-field"),
      field("Senha", element("input", { name: "senha", type: "password", minlength: "6", autocomplete: "new-password", placeholder: "Obrigatoria no cadastro" }), "admin-field-span-2"),
    ]),
    formSection("Perfil", [
      field("Endereco", element("input", { name: "endereco", required: "required", autocomplete: "street-address" }), "admin-field-full"),
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
    ], "admin-user-profile-section"),
    formSection("Convivencia", [
      checkField("Tem criancas", element("input", { type: "checkbox", name: "temCriancas" })),
      checkField("Tem outros animais", element("input", { type: "checkbox", name: "temOutrosAnimais" })),
    ], "admin-animal-check-section admin-user-check-section"),
    element("div", { className: "admin-form-actions admin-animal-modal-actions" }, [
      element("button", {
        className: "button button-secondary",
        type: "button",
        text: "Cancelar",
        onClick() {
          closeUserModal();
        },
      }),
      element("button", { className: "button", type: "submit", "data-user-submit": "", text: "Cadastrar administrador" }),
    ]),
  ]),
]);
const modal = element("div", { className: "admin-animal-modal admin-user-modal", "data-user-modal": "", hidden: "hidden" }, [
  element("button", {
    className: "login-backdrop",
    type: "button",
    "aria-label": "Fechar cadastro de usuario",
    onClick() {
      closeUserModal();
    },
  }),
  element("section", { className: "admin-animal-dialog admin-animal-edit-dialog admin-user-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "admin-user-modal-title" }, [
    element("button", {
      className: "modal-close",
      type: "button",
      "aria-label": "Fechar",
      onClick() {
        closeUserModal();
      },
    }, [icon("fa-xmark")]),
    element("div", { className: "admin-modal-header" }, [
      modalTitle,
    ]),
    form,
  ]),
]);

const detailModalTitle = element("h2", { id: "admin-user-detail-title", text: "Detalhes do usuario" });
const detailModalBody = element("div", { className: "admin-animal-detail-body admin-user-detail-body", "data-user-detail-body": "" });
let detailUser = null;
const detailEditButton = element("button", {
  className: "admin-animal-header-action",
  type: "button",
  onClick() {
    if (!detailUser) {
      return;
    }
    const user = detailUser;
    closeDetailModal();
    openUserModal(user);
  },
}, [
  icon("fa-pen"),
  element("span", { text: "Editar" }),
]);
const detailDeleteButton = element("button", {
  className: "admin-animal-header-action admin-animal-header-action-danger",
  type: "button",
  onClick() {
    if (!detailUser) {
      return;
    }
    const user = detailUser;
    closeDetailModal();
    removeUser(user);
  },
}, [
  icon("fa-trash"),
  element("span", { text: "Excluir" }),
]);
const detailModal = element("div", {
  className: "admin-animal-modal admin-user-detail-modal",
  "data-user-detail-modal": "",
  hidden: "hidden",
}, [
  element("button", {
    className: "login-backdrop",
    type: "button",
    "aria-label": "Fechar detalhes do usuario",
    onClick() {
      closeDetailModal();
    },
  }),
  element("section", {
    className: "admin-animal-dialog admin-animal-detail-dialog admin-user-detail-dialog",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "admin-user-detail-title",
  }, [
    element("div", { className: "admin-modal-header" }, [
      detailModalTitle,
      element("div", { className: "admin-animal-header-actions" }, [
        detailEditButton,
        detailDeleteButton,
        element("button", {
          className: "modal-close",
          type: "button",
          "aria-label": "Fechar",
          onClick() {
            closeDetailModal();
          },
        }, [icon("fa-xmark")]),
      ]),
    ]),
    detailModalBody,
  ]),
]);

const deleteModalTitle = element("h2", { id: "admin-user-delete-title", text: "Remover usuario?" });
const deleteModalMessage = element("p", {
  className: "admin-animal-delete-copy",
  id: "admin-user-delete-copy",
  text: "A exclusao remove o usuario, acessos administrativos e vinculos cadastrados.",
});
const deleteBackdrop = element("button", {
  className: "login-backdrop",
  type: "button",
  "aria-label": "Cancelar exclusao de usuario",
  onClick() {
    closeDeleteModal();
  },
});
const deleteCloseButton = element("button", {
  className: "modal-close",
  type: "button",
  "aria-label": "Fechar",
  onClick() {
    closeDeleteModal();
  },
}, [icon("fa-xmark")]);
const deleteCancelButton = element("button", {
  className: "admin-animal-delete-cancel",
  type: "button",
  text: "Cancelar",
  onClick() {
    closeDeleteModal();
  },
});
const deleteConfirmButton = element("button", {
  className: "admin-animal-delete-confirm",
  type: "button",
  text: "Excluir",
  onClick() {
    confirmUserDeletion();
  },
});
const deleteModal = element("div", {
  className: "admin-animal-modal admin-animal-delete-modal admin-user-delete-modal",
  "data-user-delete-modal": "",
  hidden: "hidden",
}, [
  deleteBackdrop,
  element("section", {
    className: "admin-animal-delete-dialog admin-user-delete-dialog",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "admin-user-delete-title",
    "aria-describedby": "admin-user-delete-copy",
  }, [
    deleteCloseButton,
    element("span", { className: "admin-animal-delete-mark", "aria-hidden": "true" }, [
      icon("fa-exclamation"),
    ]),
    deleteModalTitle,
    deleteModalMessage,
    element("div", { className: "admin-animal-delete-actions" }, [
      deleteCancelButton,
      deleteConfirmButton,
    ]),
  ]),
]);

const content = element("main", { className: "admin-page admin-users-page" }, [
  element("section", { className: "admin-card" }, [
    element("div", { className: "admin-card-header" }, [
      element("h2", { text: "Usuarios cadastrados" }),
      element("span", { className: "admin-table-page-size", text: `${PAGE_SIZE} por pagina` }),
    ]),
    filterToolbar,
    filterSummary,
    userList,
    pagination,
  ]),
]);
const shell = createAdminShell({
  active: "users",
  title: "Usuarios",
  subtitle: "Gerencie adotantes e administradores em uma unica tabela.",
  showSearch: false,
  actions: [primaryAction],
  content,
});
let users = [];
let userPage = 0;
let editingUser = null;
let userPendingDeletion = null;
let deleteIsSubmitting = false;

if (shell) {
  document.body.append(modal, detailModal, deleteModal);
  primaryAction.addEventListener("click", openCreateAdminModal);
  form.addEventListener("submit", submitUser);
  filterToolbar.addEventListener("submit", (event) => event.preventDefault());
  filterToolbar.addEventListener("input", syncFiltersFromToolbar);
  filterToolbar.addEventListener("change", syncFiltersFromToolbar);
  filterToolbar.addEventListener("reset", () => {
    const setTimer = globalThis.window?.setTimeout || globalThis.setTimeout;
    setTimer(() => syncFiltersFromToolbar(), 0);
  });
  prevPageButton.addEventListener("click", () => changeUserPage(userPage - 1));
  nextPageButton.addEventListener("click", () => changeUserPage(userPage + 1));
  enhanceSelectDropdowns(filterToolbar);
  document.addEventListener("click", () => closeUserActionMenus());
  document.addEventListener("keydown", handleActionMenuKeydown);
  modal.addEventListener("keydown", handleModalKeydown);
  detailModal.addEventListener("keydown", handleDetailModalKeydown);
  deleteModal.addEventListener("keydown", handleDeleteModalKeydown);
  resetForm();
  loadUsers();
}

async function loadUsers() {
  setFeedback(shell.feedback, "Carregando usuarios...");
  try {
    users = await fetchAdminUsers();
    userPage = 0;
    renderUsers();
    setFeedback(shell.feedback, "");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function renderUsers() {
  const filtered = filterAndSortAdminUsers(users, userFilters);
  const page = paginateAdminUsers(filtered, userPage, PAGE_SIZE);
  userPage = page.page;
  updateFilterSummary(page, users.length);
  renderPagination(page);
  clearNode(userList);

  if (!page.totalItems) {
    userList.append(emptyState("Nenhum usuario encontrado", "Ajuste os filtros ou cadastre um administrador."));
    return;
  }

  userList.append(renderUserTable(page.items));
}

function renderUserTable(items) {
  const tbody = element("tbody", {}, items.map(renderUserRow));
  return element("div", { className: "admin-animal-table-wrap admin-user-table-wrap" }, [
    element("table", { className: "admin-animal-table admin-user-table" }, [
      element("colgroup", {}, [
        element("col", { className: "admin-user-col-name" }),
        element("col", { className: "admin-user-col-profile" }),
        element("col", { className: "admin-user-col-email" }),
        element("col", { className: "admin-user-col-cpf" }),
        element("col", { className: "admin-user-col-phone" }),
        element("col", { className: "admin-user-col-created" }),
        element("col", { className: "admin-user-col-actions" }),
      ]),
      element("thead", {}, [
        element("tr", {}, [
          tableHeader("Usuario"),
          tableHeader("Perfil"),
          tableHeader("E-mail"),
          tableHeader("CPF"),
          tableHeader("Telefone"),
          tableHeader("Cadastro"),
          tableHeader("Acoes", "admin-animal-actions-head"),
        ]),
      ]),
      tbody,
    ]),
  ]);
}

function renderUserRow(user) {
  return element("tr", { className: "admin-animal-table-row admin-user-table-row" }, [
    tableCell("Usuario", [
      element("div", { className: "admin-user-identity" }, [
        element("span", { className: "admin-user-avatar", text: initials(user.nome), "aria-hidden": "true" }),
        element("div", {}, [
          element("strong", { text: user.nome || "Usuario" }),
          element("span", { className: "muted", text: formatUserDisplayCode(user) }),
        ]),
      ]),
    ], "admin-user-name-cell"),
    tableCell("Perfil", [userStatusPill(user)]),
    tableCell("E-mail", [element("span", { className: "admin-user-email", text: user.email || "-" })]),
    tableCell("CPF", [element("span", { text: user.cpf || "-" })]),
    tableCell("Telefone", [element("span", { text: user.telefone || "-" })]),
    tableCell("Cadastro", [element("time", { dateTime: user.dataCadastro || "", text: formatDateTime(user.dataCadastro) })]),
    tableCell("Acoes", [userActionMenu(user)], "admin-animal-actions-cell"),
  ]);
}

function tableHeader(label, className = "") {
  return element("th", { scope: "col", className, text: label });
}

function tableCell(label, children, className = "") {
  return element("td", { className, "data-label": label }, children);
}

function userStatusPill(user) {
  const isAdmin = Boolean(user?.administrador);
  return element("span", { className: `admin-animal-status-pill admin-user-status-${isAdmin ? "admin" : "adopter"}` }, [
    element("span", { "aria-hidden": "true" }),
    element("strong", { text: isAdmin ? "Administrador" : "Adotante" }),
  ]);
}

function userActionMenu(user) {
  const menu = element("div", {
    className: "admin-animal-action-menu admin-user-action-menu",
    onClick(event) {
      event.stopPropagation();
    },
  });
  const trigger = element("button", {
    className: "admin-animal-action-trigger",
    type: "button",
    "aria-haspopup": "menu",
    "aria-expanded": "false",
    "aria-label": `Acoes de ${user.nome || "usuario"}`,
    title: "Acoes",
    onClick(event) {
      event.stopPropagation();
      toggleUserActionMenu(menu);
    },
  }, [icon("fa-ellipsis-vertical")]);
  const dropdown = element("div", {
    className: "admin-animal-action-dropdown",
    role: "menu",
    "aria-hidden": "true",
  }, [
    element("button", {
      className: "admin-animal-action-item",
      type: "button",
      role: "menuitem",
      onClick() {
        closeUserActionMenus();
        openUserModal(user);
      },
    }, [
      icon("fa-pen"),
      element("span", { text: "Editar" }),
    ]),
    element("button", {
      className: "admin-animal-action-item",
      type: "button",
      role: "menuitem",
      onClick() {
        closeUserActionMenus();
        openDetailModal(user);
      },
    }, [
      icon("fa-eye"),
      element("span", { text: "Detalhes" }),
    ]),
    element("button", {
      className: "admin-animal-action-item admin-animal-action-danger",
      type: "button",
      role: "menuitem",
      onClick() {
        closeUserActionMenus();
        removeUser(user);
      },
    }, [
      icon("fa-trash"),
      element("span", { text: "Excluir" }),
    ]),
  ]);

  menu.append(trigger, dropdown);
  return menu;
}

function toggleUserActionMenu(menu) {
  const isOpen = menu.classList.contains("admin-animal-action-menu-open");
  closeUserActionMenus(menu);
  setUserActionMenuOpen(menu, !isOpen);
}

function closeUserActionMenus(except = null) {
  for (const menu of document.querySelectorAll(".admin-user-action-menu")) {
    if (menu !== except) {
      setUserActionMenuOpen(menu, false);
    }
  }
}

function setUserActionMenuOpen(menu, isOpen) {
  if (isOpen) {
    updateUserActionMenuDirection(menu);
  } else {
    menu.classList.remove("admin-user-action-menu-up");
  }

  menu.classList.toggle("admin-animal-action-menu-open", isOpen);
  menu.querySelector(".admin-animal-action-trigger")?.setAttribute("aria-expanded", String(isOpen));
  menu.querySelector(".admin-animal-action-dropdown")?.setAttribute("aria-hidden", String(!isOpen));
}

function updateUserActionMenuDirection(menu) {
  const dropdown = menu.querySelector(".admin-animal-action-dropdown");
  if (!dropdown) {
    return;
  }

  const menuRect = menu.getBoundingClientRect();
  const dropdownHeight = Math.max(dropdown.scrollHeight, 132);
  const opensPastViewport = menuRect.bottom + dropdownHeight + 18 > window.innerHeight;
  const opensPastTable = menuRect.bottom + dropdownHeight > (userList.getBoundingClientRect().bottom + 8);

  menu.classList.toggle("admin-user-action-menu-up", opensPastViewport || opensPastTable);
}

function openCreateAdminModal() {
  editingUser = null;
  resetForm();
  setPasswordRequired(true);
  setAdminOnlyFormMode(true);
  modalTitle.textContent = "Cadastrar administrador";
  form.querySelector("[data-user-submit]").textContent = "Cadastrar administrador";
  modal.hidden = false;
  syncAdminModalOpenState();
  form.elements.namedItem("nome")?.focus();
}

function openUserModal(user) {
  editingUser = user;
  const isAdminOnly = isAdministratorUser(user);
  fillForm(user);
  setPasswordRequired(false);
  setAdminOnlyFormMode(isAdminOnly, user);
  modalTitle.textContent = isAdminOnly
    ? `Editar administrador ${user.nome || ""}`.trim()
    : `Editar ${user.nome || "usuario"}`;
  form.querySelector("[data-user-submit]").textContent = "Salvar alteracoes";
  modal.hidden = false;
  syncAdminModalOpenState();
  form.elements.namedItem("nome")?.focus();
}

function closeUserModal() {
  editingUser = null;
  modal.hidden = true;
  syncAdminModalOpenState();
  resetForm();
}

function openDetailModal(user) {
  detailUser = user;
  const isAdmin = isAdministratorUser(user);
  detailModalTitle.textContent = isAdmin ? "Detalhes do administrador" : "Detalhes do usuario";
  detailModal.classList.toggle("admin-user-detail-admin-mode", isAdmin);
  clearNode(detailModalBody);
  detailModalBody.append(renderUserDetail(user));
  detailModal.hidden = false;
  syncAdminModalOpenState();
  detailEditButton.focus();
}

function closeDetailModal() {
  detailUser = null;
  detailModal.hidden = true;
  detailModal.classList.remove("admin-user-detail-admin-mode");
  syncAdminModalOpenState();
}

function renderUserDetail(user) {
  return isAdministratorUser(user) ? renderAdminUserDetail(user) : renderAdopterUserDetail(user);
}

function renderAdminUserDetail(user) {
  return element("div", { className: "admin-animal-modal-layout admin-user-detail-layout admin-user-admin-detail" }, [
    renderUserProfileSide(user, { adminMode: true }),
    element("div", { className: "admin-animal-detail-main admin-user-detail-main" }, [
      element("section", { className: "admin-user-admin-detail-hero" }, [
        element("span", { className: "admin-user-admin-detail-icon", "aria-hidden": "true" }, [
          icon("fa-user-shield"),
        ]),
        element("div", {}, [
          element("h3", { text: "Acesso administrativo" }),
          element("p", { text: "Este cadastro e apenas administrativo, usado para acessar e gerenciar o painel." }),
        ]),
      ]),
      detailSection("Identificacao", [
        detailRow("Nome", user?.nome),
        detailRow("E-mail", user?.email),
        detailRow("CPF", user?.cpf),
        detailRow("Codigo", formatUserDisplayCode(user)),
        detailRow("Admin ID", user?.adminId ? formatAdminCode(user.adminId) : "-"),
      ]),
      adminPermissionSection(),
    ]),
  ]);
}

function renderAdopterUserDetail(user) {
  return element("div", { className: "admin-animal-modal-layout admin-user-detail-layout" }, [
    renderUserProfileSide(user),
    element("div", { className: "admin-animal-detail-main admin-user-detail-main" }, [
      detailSection("Resumo", [
        detailRow("Nome", user?.nome),
        detailRow("Perfil", user?.administrador ? "Administrador" : "Adotante"),
        detailRow("ID", formatUserDisplayCode(user)),
        detailRow("Admin ID", user?.adminId ? formatAdminCode(user.adminId) : "-"),
      ]),
      detailSection("Contato", [
        detailRow("E-mail", user?.email),
        detailRow("CPF", user?.cpf),
        detailRow("Telefone", user?.telefone),
        detailRow("Endereco", user?.endereco),
      ]),
      detailSection("Preferencias", [
        detailRow("Moradia", formatEnum(user?.tipoMoradia)),
        detailRow("Atividade", formatEnum(user?.nivelAtividade)),
        detailRow("Porte preferido", formatEnum(user?.preferenciaPorte)),
        detailRow("Especie preferida", speciesLabel(user?.preferenciaEspecie)),
      ]),
      detailSection("Convivencia", [
        detailRow("Tem criancas", formatBoolean(user?.temCriancas)),
        detailRow("Tem outros animais", formatBoolean(user?.temOutrosAnimais)),
        detailRow("Cadastro", formatDateTime(user?.dataCadastro)),
      ]),
    ]),
  ]);
}

function detailSection(title, rows) {
  return element("section", { className: "admin-animal-detail-section" }, [
    element("h3", { text: title }),
    element("dl", { className: "admin-animal-detail-list" }, rows),
  ]);
}

function adminPermissionSection() {
  return element("section", { className: "admin-animal-detail-section admin-user-admin-permissions" }, [
    element("h3", { text: "Permissoes" }),
    adminPermissionList(),
  ]);
}

function adminPermissionList() {
  return element("ul", { className: "admin-user-admin-permission-list" }, [
    adminPermissionItem("fa-table-columns", "Acessar painel administrativo"),
    adminPermissionItem("fa-paw", "Gerenciar animais cadastrados"),
    adminPermissionItem("fa-rectangle-list", "Acompanhar solicitacoes de adocao"),
    adminPermissionItem("fa-user-gear", "Gerenciar usuarios e administradores"),
  ]);
}

function adminPermissionItem(iconName, text) {
  return element("li", {}, [
    icon(iconName),
    element("span", { text }),
  ]);
}

function detailRow(label, value) {
  return element("div", { className: "admin-animal-detail-row" }, [
    element("dt", { text: label }),
    element("dd", { text: displayValue(value) }),
  ]);
}

function renderUserProfileSide(user = null, { adminMode = isAdministratorUser(user) } = {}) {
  const profileUser = user || {
    nome: "Novo administrador",
    administrador: true,
  };
  const facts = adminMode
    ? [
      profileFact("fa-envelope", "E-mail", profileUser.email),
      profileFact("fa-id-card", "CPF", profileUser.cpf),
      profileFact("fa-user-shield", "Admin ID", profileUser.adminId ? formatAdminCode(profileUser.adminId) : formatUserDisplayCode(profileUser)),
      profileFact("fa-key", "Acesso", "Administrador"),
    ]
    : [
      profileFact("fa-envelope", "E-mail", profileUser.email),
      profileFact("fa-id-card", "CPF", profileUser.cpf),
      profileFact("fa-phone", "Telefone", profileUser.telefone),
      profileFact("fa-house", "Moradia", formatEnum(profileUser.tipoMoradia)),
      profileFact("fa-person-running", "Atividade", formatEnum(profileUser.nivelAtividade)),
    ];

  return element("aside", { className: "admin-animal-profile-side admin-user-profile-side" }, [
    element("span", { className: "admin-user-profile-avatar", text: initials(profileUser.nome), "aria-hidden": "true" }),
    element("div", { className: "admin-animal-profile-heading" }, [
      element("h3", { text: profileUser.nome || "Usuario" }),
      userStatusPill(profileUser),
      element("span", { className: "admin-animal-profile-code", text: formatUserDisplayCode(profileUser) }),
    ]),
    element("dl", { className: "admin-animal-profile-facts" }, facts),
  ]);
}

function profileFact(iconName, label, value) {
  return element("div", { className: "admin-animal-profile-fact" }, [
    icon(iconName),
    element("dt", { text: label }),
    element("dd", { text: displayValue(value) }),
  ]);
}

function renderFormSide(user = null, { adminMode = isAdministratorUser(user) } = {}) {
  clearNode(formSide);
  formSide.append(renderUserProfileSide(user, { adminMode }));
}

async function submitUser(event) {
  event.preventDefault();
  const data = new FormData(form);
  const isEditing = Boolean(editingUser);
  setFeedback(shell.feedback, isEditing ? "Salvando usuario..." : "Cadastrando administrador...");

  try {
    if (isEditing) {
      await updateUserRecord(editingUser, buildUserPayload(data, { createAdmin: false, user: editingUser }));
      setFeedback(shell.feedback, "Usuario atualizado.", "success");
    } else {
      await createAdminUser(buildUserPayload(data, { createAdmin: true }));
      setFeedback(shell.feedback, "Administrador cadastrado.", "success");
    }
    closeUserModal();
    await loadUsers();
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function buildUserPayload(data, { createAdmin = false, user = null } = {}) {
  return {
    nome: data.get("nome"),
    cpf: data.get("cpf"),
    senha: data.get("senha") || "",
    email: data.get("email"),
    telefone: data.get("telefone") || "-",
    endereco: data.get("endereco") || "-",
    tipoMoradia: data.get("tipoMoradia") || "apartamento",
    temCriancas: toFormBoolean(data, "temCriancas"),
    temOutrosAnimais: toFormBoolean(data, "temOutrosAnimais"),
    nivelAtividade: data.get("nivelAtividade") || "moderado",
    preferenciaPorte: data.get("preferenciaPorte") || "indiferente",
    preferenciaEspecie: data.get("preferenciaEspecie") || "indiferente",
    administrador: createAdmin ? true : Boolean(user?.administrador),
  };
}

function updateUserRecord(user, payload) {
  if (isStandaloneAdmin(user)) {
    return updateStandaloneAdminUser(user.adminId, payload);
  }
  return updateAdminUser(user.id, payload);
}

function fillForm(user) {
  setValue("id", userRecordKey(user));
  setValue("nome", user.nome);
  setValue("cpf", user.cpf);
  setValue("email", user.email);
  setValue("telefone", user.telefone);
  setValue("senha", "");
  setValue("endereco", user.endereco);
  setValue("tipoMoradia", user.tipoMoradia || "apartamento");
  setValue("nivelAtividade", user.nivelAtividade || "moderado");
  setValue("preferenciaPorte", user.preferenciaPorte || "indiferente");
  setValue("preferenciaEspecie", user.preferenciaEspecie || "indiferente");
  setChecked("temCriancas", user.temCriancas);
  setChecked("temOutrosAnimais", user.temOutrosAnimais);
  formCodeInput.value = formatUserDisplayCode(user);
}

function resetForm() {
  form.reset();
  setValue("id", "");
  setValue("tipoMoradia", "apartamento");
  setValue("nivelAtividade", "moderado");
  setValue("preferenciaPorte", "indiferente");
  setValue("preferenciaEspecie", "indiferente");
  setAdminOnlyFormMode(false);
  setPasswordRequired(false);
  formCodeInput.value = formatUserCode(null);
  modalTitle.textContent = "Cadastrar administrador";
  form.querySelector("[data-user-submit]").textContent = "Cadastrar administrador";
}

function setPasswordRequired(required) {
  const passwordInput = form.elements.namedItem("senha");
  if (!passwordInput) {
    return;
  }
  passwordInput.required = required;
}

function setAdminOnlyFormMode(isAdminOnly, user = null) {
  modal.classList.toggle("admin-user-modal-admin-mode", isAdminOnly);
  form.classList.toggle("admin-user-form-admin-mode", isAdminOnly);
  form.querySelector(".admin-user-phone-field")?.toggleAttribute("hidden", isAdminOnly);
  form.querySelector(".admin-user-profile-section")?.toggleAttribute("hidden", isAdminOnly);
  form.querySelector(".admin-user-check-section")?.toggleAttribute("hidden", isAdminOnly);
  renderUserFormIntro(user, { adminMode: isAdminOnly });
  renderFormSide(user, { adminMode: isAdminOnly });

  for (const fieldName of ["telefone", "endereco", "tipoMoradia", "nivelAtividade", "preferenciaPorte", "preferenciaEspecie", "temCriancas", "temOutrosAnimais"]) {
    const control = form.elements.namedItem(fieldName);
    if (control) {
      control.disabled = isAdminOnly;
    }
  }
}

function renderUserFormIntro(user = null, { adminMode = false } = {}) {
  clearNode(formIntro);
  formIntro.hidden = !adminMode;

  if (!adminMode) {
    return;
  }

  formIntro.append(renderAdminUserFormIntro(user));
}

function renderAdminUserFormIntro(user = null) {
  return element("section", { className: "admin-user-admin-edit-summary" }, [
    element("span", { className: "admin-user-admin-edit-icon", "aria-hidden": "true" }, [
      icon("fa-user-shield"),
    ]),
    element("div", {}, [
      element("h3", { text: "Acesso administrativo" }),
      element("p", { text: "Este cadastro e apenas administrativo. Edite nome, CPF, e-mail e senha de acesso ao painel." }),
      element("span", {
        className: "admin-user-admin-edit-code",
        text: user ? formatUserDisplayCode(user) : "Novo administrador",
      }),
    ]),
  ]);
}

function removeUser(user) {
  openDeleteModal(user);
}

function openDeleteModal(user) {
  userPendingDeletion = user;
  deleteModalTitle.textContent = `Remover ${user?.nome || "usuario"}?`;
  deleteModalMessage.textContent = "A exclusao remove o usuario, acessos administrativos e vinculos cadastrados.";
  setDeleteModalBusy(false);
  deleteModal.hidden = false;
  syncAdminModalOpenState();
  deleteCancelButton.focus();
}

function closeDeleteModal() {
  if (deleteIsSubmitting) {
    return;
  }

  userPendingDeletion = null;
  deleteModal.hidden = true;
  syncAdminModalOpenState();
}

async function confirmUserDeletion() {
  if (!userPendingDeletion || deleteIsSubmitting) {
    return;
  }

  const user = userPendingDeletion;
  setDeleteModalBusy(true);
  setFeedback(shell.feedback, "Excluindo usuario...");
  try {
    await deleteUserRecord(user);
    userPendingDeletion = null;
    deleteModal.hidden = true;
    syncAdminModalOpenState();
    await loadUsers();
    setFeedback(shell.feedback, "Usuario excluido.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  } finally {
    setDeleteModalBusy(false);
  }
}

function deleteUserRecord(user) {
  if (isStandaloneAdmin(user)) {
    return deleteStandaloneAdminUser(user.adminId);
  }
  return deleteAdminUser(user.id);
}

function setDeleteModalBusy(isBusy) {
  deleteIsSubmitting = isBusy;
  deleteBackdrop.disabled = isBusy;
  deleteCloseButton.disabled = isBusy;
  deleteCancelButton.disabled = isBusy;
  deleteConfirmButton.disabled = isBusy;
  deleteConfirmButton.textContent = isBusy ? "Excluindo..." : "Excluir";
}

function syncFiltersFromToolbar() {
  userFilters.query = toolbarSearch.value;
  userFilters.perfil = readFilterValue("perfil");
  userFilters.moradia = readFilterValue("moradia");
  userFilters.atividade = readFilterValue("atividade");
  userFilters.ordem = readFilterValue("ordem") || "mais_recentes";
  userPage = 0;
  renderUsers();
}

function changeUserPage(page) {
  userPage = page;
  renderUsers();
}

function readFilterValue(name) {
  return filterToolbar.elements.namedItem(name)?.value || "";
}

function renderPagination(page) {
  pageStatus.textContent = page.totalPages
    ? `Pagina ${page.page + 1} de ${page.totalPages} - ${page.totalItems} usuarios`
    : "Nenhuma pagina disponivel";
  prevPageButton.disabled = page.first || page.totalPages <= 1;
  nextPageButton.disabled = page.last || page.totalPages <= 1;
}

function updateFilterSummary(page, totalCount) {
  if (!totalCount) {
    filterSummary.textContent = "Nenhum usuario cadastrado.";
    return;
  }

  if (!page.totalItems) {
    filterSummary.textContent = "Nenhum usuario encontrado para os filtros atuais.";
    return;
  }

  if (page.totalItems === totalCount) {
    filterSummary.textContent = `${page.from}-${page.to} de ${totalCount} usuarios exibidos.`;
    return;
  }

  filterSummary.textContent = `${page.from}-${page.to} de ${page.totalItems} usuarios filtrados (${totalCount} no total).`;
}

function handleActionMenuKeydown(event) {
  if (event.key === "Escape") {
    closeUserActionMenus();
  }
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    closeUserModal();
  }
}

function handleDetailModalKeydown(event) {
  if (event.key === "Escape") {
    closeDetailModal();
  }
}

function handleDeleteModalKeydown(event) {
  if (event.key === "Escape") {
    closeDeleteModal();
  }
}

function syncAdminModalOpenState() {
  document.body.classList.toggle("modal-open", !modal.hidden || !detailModal.hidden || !deleteModal.hidden);
}

function setValue(name, value) {
  const control = form.elements.namedItem(name);
  if (control) {
    control.value = value ?? "";
  }
}

function setChecked(name, value) {
  const control = form.elements.namedItem(name);
  if (control) {
    control.checked = Boolean(value);
  }
}

function initials(name = "") {
  const parts = String(name || "US").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "S");
}

function speciesLabel(value) {
  const species = String(value || "").toLowerCase();
  if (species === "cao") {
    return "Cao";
  }
  if (species === "gato") {
    return "Gato";
  }
  return formatEnum(value);
}

function isStandaloneAdmin(user) {
  return Boolean(user?.somenteAdministrador && user?.adminId);
}

function isAdministratorUser(user) {
  return Boolean(user?.administrador || isStandaloneAdmin(user));
}

function userRecordKey(user) {
  return isStandaloneAdmin(user) ? `admin:${user.adminId}` : String(user?.id || "");
}

function formatUserDisplayCode(user) {
  return isStandaloneAdmin(user) ? formatAdminCode(user.adminId) : formatUserCode(user?.id);
}

function formatUserCode(id) {
  const numericId = Number(id);
  if (Number.isInteger(numericId) && numericId >= 0) {
    return `#U-${String(numericId).padStart(4, "0")}`;
  }
  return id ? `#U-${id}` : "#U-0000";
}

function formatAdminCode(id) {
  const numericId = Number(id);
  if (Number.isInteger(numericId) && numericId >= 0) {
    return `#AD-${String(numericId).padStart(4, "0")}`;
  }
  return id ? `#AD-${id}` : "-";
}

function displayValue(value) {
  const cleanValue = String(value ?? "").trim();
  return cleanValue || "-";
}
