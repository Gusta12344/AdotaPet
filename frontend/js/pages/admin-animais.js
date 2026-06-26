import {
  createAdminAnimal,
  deleteAdminAnimal,
  fetchAdminAnimals,
  updateAdminAnimal,
  updateAdminAnimalStatus,
} from "../admin-api.js";
import { filterAndSortAdminAnimals, paginateAdminAnimals } from "../admin-animal-filters.js";
import {
  adminCheckField as checkField,
  adminField as field,
  adminFilterField as filterField,
  adminFilterSelect as filterSelect,
  adminFormSection as formSection,
  adminIcon as icon,
  adminSelect as select,
  emptyState,
  showError,
  toFormBoolean,
} from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { enhanceSelectDropdowns } from "../dropdowns.js";
import { clearNode, element, formatAge, formatEnum, renderAnimalImage, setFeedback } from "../ui.js";

const PAGE_SIZE = 10;
const animalList = element("div", { className: "admin-animal-table-region", "data-animal-list": "" });
const animalFilters = {
  query: "",
  status: "",
  especie: "",
  porte: "",
  idade: "",
  ordem: "mais_recentes",
};
const toolbarSearch = element("input", {
  id: "admin-animal-search",
  name: "busca",
  autocomplete: "off",
  placeholder: "Buscar por nome, especie ou ONG",
});
const filterSummary = element("p", {
  className: "admin-animal-filter-summary muted",
  "data-animal-filter-summary": "",
});
const pageStatus = element("span", { "data-animal-page-status": "" });
const prevPageButton = element("button", {
  className: "button button-secondary",
  type: "button",
  "data-animal-page-prev": "",
}, [
  icon("fa-chevron-left"),
  element("span", { text: "Anterior" }),
]);
const nextPageButton = element("button", {
  className: "button",
  type: "button",
  "data-animal-page-next": "",
}, [
  element("span", { text: "Proxima" }),
  icon("fa-chevron-right"),
]);
const pagination = element("nav", { className: "admin-pagination admin-animal-pagination", "aria-label": "Paginacao dos animais" }, [
  pageStatus,
  element("div", { className: "admin-pagination-actions" }, [
    prevPageButton,
    nextPageButton,
  ]),
]);
const filterToolbar = element("form", {
  className: "animal-toolbar admin-animal-toolbar",
  "aria-label": "Filtros dos animais cadastrados",
}, [
  element("label", { className: "search-field admin-animal-search-field" }, [
    icon("fa-magnifying-glass"),
    toolbarSearch,
  ]),
  filterField("Especie", filterSelect("especie", [
    ["", "Todas"],
    ["cao", "Cao"],
    ["gato", "Gato"],
    ["outro", "Outro"],
  ])),
  filterField("Status", filterSelect("status", [
    ["", "Todos"],
    ["disponivel", "Disponiveis"],
    ["em_analise", "Em analise"],
    ["adotado", "Adotados"],
  ])),
  filterField("Porte", filterSelect("porte", [
    ["", "Todos"],
    ["pequeno", "Pequeno"],
    ["medio", "Medio"],
    ["grande", "Grande"],
  ])),
  filterField("Idade", filterSelect("idade", [
    ["", "Todas"],
    ["filhote", "Filhote"],
    ["adulto", "Adulto"],
    ["senior", "Senior"],
  ])),
  filterField("Ordenar", filterSelect("ordem", [
    ["mais_recentes", "Mais recentes"],
    ["mais_antigos", "Mais antigos"],
    ["nome_az", "Nome A-Z"],
    ["nome_za", "Nome Z-A"],
    ["idade_menor", "Menor idade"],
    ["idade_maior", "Maior idade"],
  ])),
  element("button", { className: "filter-button", type: "reset" }, [
    icon("fa-filter"),
    element("span", { text: "Limpar" }),
  ]),
]);
const modalTitle = element("h2", { id: "admin-animal-modal-title", "data-animal-form-title": "", text: "Cadastrar novo animal" });
const formCodeInput = element("input", {
  type: "text",
  value: formatAnimalCode(null),
  disabled: "disabled",
  "aria-label": "Codigo do animal",
});
const formImageInput = element("input", {
  className: "admin-animal-photo-input",
  name: "imagens",
  type: "file",
  accept: "image/png,image/jpeg,image/webp",
  multiple: "multiple",
  onChange() {
    syncPhotoFileLabel();
  },
});
const formImageLabel = element("span", { className: "admin-animal-photo-file", text: "Nenhuma foto selecionada" });
const formSide = element("aside", { className: "admin-animal-modal-side", "data-animal-form-side": "" });
const form = element("form", { className: "admin-form admin-animal-form", id: "novo", "data-animal-form": "" }, [
  element("input", { type: "hidden", name: "id" }),
  formSide,
  element("div", { className: "admin-animal-form-main" }, [
    formSection("Identificacao", [
      field("Nome", element("input", { name: "nome", required: "required" }), "admin-field-span-2"),
      field("ID (codigo)", formCodeInput),
      field("Especie", select("especie", [
        ["cao", "Cao"],
        ["gato", "Gato"],
        ["outro", "Outro"],
      ])),
      field("Sexo", select("sexo", [
        ["macho", "Macho"],
        ["femea", "Femea"],
      ])),
      field("Data de resgate", element("input", { name: "dataResgate", type: "date", required: "required" })),
      field("Status", select("status", [
        ["disponivel", "Disponivel"],
        ["em_analise", "Em analise"],
        ["adotado", "Adotado"],
      ])),
      field("Protetor ID", element("input", { name: "protetorId", type: "number", min: "1", value: "1", required: "required" })),
    ]),
    formSection("Caracteristicas", [
      field("Porte", select("porte", [
        ["pequeno", "Pequeno"],
        ["medio", "Medio"],
        ["grande", "Grande"],
      ])),
      field("Idade em meses", element("input", { name: "idadeMeses", type: "number", min: "0", required: "required" })),
      field("Raca", element("input", { name: "raca", placeholder: "SRD" })),
      field("Energia", select("nivelEnergia", [
        ["baixo", "Baixo"],
        ["medio", "Medio"],
        ["alto", "Alto"],
      ])),
    ]),
    formSection("Convivencia", [
      checkField("Com criancas", "bomComCriancas"),
      checkField("Com caes", "bomComCaes"),
      checkField("Com gatos", "bomComGatos"),
      checkField("Precisa de espaco", "precisaEspaco"),
    ], "admin-animal-check-section"),
    formSection("Cuidados", [
      checkField("Microchip", "microchip"),
      checkField("Castrado", "castrado"),
      checkField("Vermifugado", "vermifugado"),
      checkField("Vacinado", "vacinado"),
    ], "admin-animal-check-section"),
    formSection("Observacoes", [
      field("Descricao", element("textarea", { name: "descricao", rows: "4", placeholder: "Resumo do perfil do animal" }), "admin-field-full"),
    ]),
    element("div", { className: "admin-form-actions admin-animal-modal-actions" }, [
      element("button", {
        className: "button button-secondary",
        type: "button",
        text: "Cancelar",
        onClick() {
          closeAnimalModal();
        },
      }),
      element("button", { className: "button", type: "submit", "data-animal-submit": "", text: "Cadastrar animal" }),
    ]),
  ]),
]);
const modal = element("div", { className: "admin-animal-modal", "data-animal-modal": "", hidden: "hidden" }, [
  element("button", {
    className: "login-backdrop",
    type: "button",
    "aria-label": "Fechar cadastro de animal",
    onClick() {
      closeAnimalModal();
    },
  }),
  element("section", { className: "admin-animal-dialog admin-animal-edit-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "admin-animal-modal-title" }, [
    element("button", {
      className: "modal-close",
      type: "button",
      "aria-label": "Fechar",
      onClick() {
        closeAnimalModal();
      },
    }, [icon("fa-xmark")]),
    element("div", { className: "admin-modal-header" }, [
      modalTitle,
    ]),
    form,
  ]),
]);
const detailModalTitle = element("h2", { id: "admin-animal-detail-title", text: "Detalhes do animal" });
const detailModalBody = element("div", { className: "admin-animal-detail-body", "data-animal-detail-body": "" });
let detailAnimal = null;
const detailEditButton = element("button", {
  className: "admin-animal-header-action",
  type: "button",
  onClick() {
    if (!detailAnimal) {
      return;
    }
    const animal = detailAnimal;
    closeDetailModal();
    openAnimalModal(animal);
  },
}, [
  icon("fa-pen"),
  element("span", { text: "Editar" }),
]);
const detailDeleteButton = element("button", {
  className: "admin-animal-header-action admin-animal-header-action-danger",
  type: "button",
  onClick() {
    if (!detailAnimal) {
      return;
    }
    const animal = detailAnimal;
    closeDetailModal();
    removeAnimal(animal);
  },
}, [
  icon("fa-trash"),
  element("span", { text: "Excluir" }),
]);
const detailModal = element("div", {
  className: "admin-animal-modal admin-animal-detail-modal",
  "data-animal-detail-modal": "",
  hidden: "hidden",
}, [
  element("button", {
    className: "login-backdrop",
    type: "button",
    "aria-label": "Fechar detalhes do animal",
    onClick() {
      closeDetailModal();
    },
  }),
  element("section", {
    className: "admin-animal-dialog admin-animal-detail-dialog",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "admin-animal-detail-title",
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
const deleteModalTitle = element("h2", { id: "admin-animal-delete-title", text: "Remover animal da lista?" });
const deleteModalMessage = element("p", {
  className: "admin-animal-delete-copy",
  id: "admin-animal-delete-copy",
  text: "A exclusao e permanente e remove o cadastro do animal.",
});
const deleteBackdrop = element("button", {
  className: "login-backdrop",
  type: "button",
  "aria-label": "Cancelar exclusao de animal",
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
    confirmAnimalDeletion();
  },
});
const deleteModal = element("div", {
  className: "admin-animal-modal admin-animal-delete-modal",
  "data-animal-delete-modal": "",
  hidden: "hidden",
}, [
  deleteBackdrop,
  element("section", {
    className: "admin-animal-delete-dialog",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "admin-animal-delete-title",
    "aria-describedby": "admin-animal-delete-copy",
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
const content = element("main", { className: "admin-page admin-animals-page" }, [
  element("section", { className: "admin-card" }, [
    element("div", { className: "admin-card-header" }, [
      element("h2", { text: "Animais cadastrados" }),
      element("span", { className: "admin-table-page-size", text: `${PAGE_SIZE} por pagina` }),
    ]),
    filterToolbar,
    filterSummary,
    animalList,
    pagination,
  ]),
]);
const shell = createAdminShell({
  active: "animals",
  title: "Animais",
  subtitle: "Gerencie cadastro, status e informacoes dos animais.",
  showSearch: false,
  content,
});
let animals = [];
let animalPage = 0;
let animalPendingDeletion = null;
let deleteIsSubmitting = false;

if (shell) {
  document.body.append(modal, detailModal, deleteModal);
  form.addEventListener("submit", submitAnimal);
  filterToolbar.addEventListener("submit", (event) => event.preventDefault());
  filterToolbar.addEventListener("input", syncFiltersFromToolbar);
  filterToolbar.addEventListener("change", syncFiltersFromToolbar);
  filterToolbar.addEventListener("reset", () => {
    const setTimer = globalThis.window?.setTimeout || globalThis.setTimeout;
    setTimer(() => syncFiltersFromToolbar(), 0);
  });
  prevPageButton.addEventListener("click", () => changeAnimalPage(animalPage - 1));
  nextPageButton.addEventListener("click", () => changeAnimalPage(animalPage + 1));
  enhanceSelectDropdowns(filterToolbar);
  document.addEventListener("click", () => closeAnimalActionMenus());
  document.addEventListener("keydown", handleActionMenuKeydown);
  modal.addEventListener("keydown", handleModalKeydown);
  detailModal.addEventListener("keydown", handleDetailModalKeydown);
  deleteModal.addEventListener("keydown", handleDeleteModalKeydown);
  bindPrimaryAction();
  resetForm();
  loadAnimals();
}

async function loadAnimals() {
  setFeedback(shell.feedback, "Carregando animais...");
  try {
    animals = await fetchAdminAnimals();
    animalPage = 0;
    renderAnimals();
    setFeedback(shell.feedback, "");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function renderAnimals() {
  const filtered = filterAndSortAdminAnimals(animals, animalFilters);
  const page = paginateAdminAnimals(filtered, animalPage, PAGE_SIZE);
  animalPage = page.page;
  updateFilterSummary(page, animals.length);
  renderPagination(page);
  clearNode(animalList);

  if (!page.totalItems) {
    animalList.append(emptyState("Nenhum animal encontrado", "Ajuste os filtros ou cadastre um animal."));
    return;
  }

  animalList.append(renderAnimalTable(page.items));
}

function renderAnimalTable(items) {
  const tbody = element("tbody", {}, items.map(renderAnimalRow));
  return element("div", { className: "admin-animal-table-wrap" }, [
    element("table", { className: "admin-animal-table" }, [
      element("thead", {}, [
        element("tr", {}, [
          tableHeader("Foto"),
          tableHeader("Animal"),
          tableHeader("Especie"),
          tableHeader("Porte"),
          tableHeader("Idade"),
          tableHeader("Status"),
          tableHeader("ONG"),
          tableHeader("Atualizado"),
          tableHeader("Acoes", "admin-animal-actions-head"),
        ]),
      ]),
      tbody,
    ]),
  ]);
}

function renderAnimalRow(animal) {
  return element("tr", { className: "admin-animal-table-row" }, [
    tableCell("Foto", [
      renderAnimalImage(animal, { className: "admin-animal-thumb" }),
    ], "admin-animal-photo-cell"),
    tableCell("Animal", [
      element("div", { className: "admin-animal-identity" }, [
        element("strong", { text: animal.nome || "Animal" }),
        element("span", { className: "muted", text: formatAnimalCode(animal.id) }),
      ]),
    ], "admin-animal-name-cell"),
    tableCell("Especie", [
      element("span", { className: "admin-animal-species" }, [
        icon(speciesIcon(animal.especie)),
        element("span", { text: speciesLabel(animal.especie) }),
      ]),
    ]),
    tableCell("Porte", [element("span", { text: formatEnum(animal.porte) })]),
    tableCell("Idade", [element("span", { text: formatAge(animal.idadeMeses) })]),
    tableCell("Status", [animalStatusPill(animal.status)]),
    tableCell("ONG", [element("span", { className: "admin-animal-organization", text: organizationLabel(animal) })]),
    tableCell("Atualizado", [updatedAtTime(animal)]),
    tableCell("Acoes", [animalActionMenu(animal)], "admin-animal-actions-cell"),
  ]);
}

function tableHeader(label, className = "") {
  return element("th", { scope: "col", className, text: label });
}

function tableCell(label, children, className = "") {
  return element("td", { className, "data-label": label }, children);
}

function animalStatusPill(status) {
  const normalized = String(status || "").toLowerCase();
  const tone = normalized.includes("dispon")
    ? "success"
    : normalized.includes("analise")
      ? "info"
      : normalized.includes("adotado")
        ? "neutral"
        : "warning";

  return element("span", { className: `admin-animal-status-pill admin-animal-status-${tone}` }, [
    element("span", { "aria-hidden": "true" }),
    element("strong", { text: formatEnum(status) }),
  ]);
}

function animalActionMenu(animal) {
  const menu = element("div", {
    className: "admin-animal-action-menu",
    onClick(event) {
      event.stopPropagation();
    },
  });
  const trigger = element("button", {
    className: "admin-animal-action-trigger",
    type: "button",
    "aria-haspopup": "menu",
    "aria-expanded": "false",
    "aria-label": `Acoes de ${animal.nome || "animal"}`,
    title: "Acoes",
    onClick(event) {
      event.stopPropagation();
      toggleAnimalActionMenu(menu);
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
        closeAnimalActionMenus();
        openAnimalModal(animal);
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
        closeAnimalActionMenus();
        openDetailModal(animal);
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
        closeAnimalActionMenus();
        removeAnimal(animal);
      },
    }, [
      icon("fa-trash"),
      element("span", { text: "Excluir" }),
    ]),
  ]);

  menu.append(trigger, dropdown);
  return menu;
}

function toggleAnimalActionMenu(menu) {
  const isOpen = menu.classList.contains("admin-animal-action-menu-open");
  closeAnimalActionMenus(menu);
  setAnimalActionMenuOpen(menu, !isOpen);
}

function closeAnimalActionMenus(except = null) {
  for (const menu of document.querySelectorAll(".admin-animal-action-menu")) {
    if (menu !== except) {
      setAnimalActionMenuOpen(menu, false);
    }
  }
}

function setAnimalActionMenuOpen(menu, isOpen) {
  menu.classList.toggle("admin-animal-action-menu-open", isOpen);
  menu.querySelector(".admin-animal-action-trigger")?.setAttribute("aria-expanded", String(isOpen));
  menu.querySelector(".admin-animal-action-dropdown")?.setAttribute("aria-hidden", String(!isOpen));
}

function openDetailModal(animal) {
  detailAnimal = animal;
  detailModalTitle.textContent = "Detalhes do animal";
  clearNode(detailModalBody);
  detailModalBody.append(renderAnimalDetail(animal));
  detailModal.hidden = false;
  syncAdminModalOpenState();
  detailEditButton.focus();
}

function closeDetailModal() {
  detailAnimal = null;
  detailModal.hidden = true;
  syncAdminModalOpenState();
}

function renderAnimalDetail(animal) {
  return element("div", { className: "admin-animal-modal-layout admin-animal-detail-layout" }, [
    renderAnimalProfileSide(animal),
    element("div", { className: "admin-animal-detail-main" }, [
      detailSection("Resumo", [
        detailRow("Data de entrada", formatDate(animal?.dataCadastro || animal?.dataResgate)),
        detailRow("Protetor", organizationLabel(animal)),
        detailRow("Situacao atual", formatEnum(animal?.status)),
        detailRow("ID", formatAnimalCode(animal?.id)),
      ]),
      detailSection("Caracteristicas", [
        detailRow("Especie", speciesLabel(animal?.especie)),
        detailRow("Raca", animal?.raca || "SRD"),
        detailRow("Sexo", formatEnum(animal?.sexo)),
        detailRow("Porte", formatEnum(animal?.porte)),
        detailRow("Idade", formatAge(animal?.idadeMeses)),
        detailRow("Energia", formatEnum(animal?.nivelEnergia)),
      ]),
      detailSection("Saude", [
        detailRow("Vacinacao", yesNo(animal?.vacinado)),
        detailRow("Vermifugacao", yesNo(animal?.vermifugado)),
        detailRow("Castrado", yesNo(animal?.castrado)),
        detailRow("Microchip", yesNo(animal?.microchip)),
      ]),
      detailSection("Convivencia", [
        detailRow("Com criancas", convivenciaLabel(animal?.bomComCriancas)),
        detailRow("Com caes", convivenciaLabel(animal?.bomComCaes)),
        detailRow("Com gatos", convivenciaLabel(animal?.bomComGatos)),
        detailRow("Ambiente ideal", animal?.precisaEspaco ? "Casa com quintal" : "Apartamento ou casa"),
      ]),
      detailSection("Historico", [
        detailRow("Resgatado em", formatDate(animal?.dataResgate)),
        detailRow("Registrado em", formatDate(animal?.dataCadastro)),
        detailRow("Atualizado em", formatUpdatedAt(animal?.dataAtualizacao)),
        detailRow("Observacoes", animal?.descricao || "Nenhuma observacao registrada.", "admin-animal-detail-row-wide"),
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

function detailRow(label, value, extraClass = "") {
  return element("div", { className: ["admin-animal-detail-row", extraClass].filter(Boolean).join(" ") }, [
    element("dt", { text: label }),
    element("dd", { text: displayValue(value) }),
  ]);
}

function renderAnimalProfileSide(animal, { editable = false } = {}) {
  const profileAnimal = animal || {
    nome: "Novo animal",
    especie: form?.elements?.namedItem("especie")?.value || "outro",
    status: form?.elements?.namedItem("status")?.value || "disponivel",
  };
  const side = element("aside", { className: "admin-animal-profile-side" }, [
    renderAnimalImage(profileAnimal, { className: "admin-animal-modal-photo" }),
    element("div", { className: "admin-animal-profile-heading" }, [
      element("h3", { text: profileAnimal.nome || "Animal" }),
      animalStatusPill(profileAnimal.status),
      element("span", { className: "admin-animal-profile-code", text: formatAnimalCode(profileAnimal.id) }),
    ]),
    element("dl", { className: "admin-animal-profile-facts" }, [
      profileFact("fa-paw", "Especie", speciesLabel(profileAnimal.especie)),
      profileFact("fa-ruler-combined", "Porte", formatEnum(profileAnimal.porte)),
      profileFact("fa-venus-mars", "Sexo", formatEnum(profileAnimal.sexo)),
      profileFact("fa-cake-candles", "Idade", formatAge(profileAnimal.idadeMeses)),
      profileFact("fa-house-medical", "Protetor", organizationLabel(profileAnimal)),
    ]),
  ]);

  if (editable) {
    side.append(element("label", { className: "admin-animal-photo-button" }, [
      formImageInput,
      icon("fa-camera"),
      element("span", { text: "Alterar foto" }),
    ]));
    side.append(formImageLabel);
  }

  return side;
}

function profileFact(iconName, label, value) {
  return element("div", { className: "admin-animal-profile-fact" }, [
    icon(iconName),
    element("dt", { text: label }),
    element("dd", { text: displayValue(value) }),
  ]);
}

function handleActionMenuKeydown(event) {
  if (event.key === "Escape") {
    closeAnimalActionMenus();
  }
}

function updatedAtTime(animal) {
  const value = animal?.dataAtualizacao
    || animal?.atualizadoEm
    || animal?.dataAtualizado
    || animal?.dataModificacao
    || animal?.dataCadastro
    || animal?.dataResgate;

  return element("time", {
    dateTime: value || "",
    text: formatUpdatedAt(value),
  });
}

function formatUpdatedAt(value) {
  if (!value) {
    return "-";
  }

  const date = parseDateTime(value);
  if (!date || Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date).replace(",", "");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = parseDateTime(value);
  if (!date || Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

function parseDateTime(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
}

function displayValue(value) {
  const cleanValue = String(value ?? "").trim();
  return cleanValue || "-";
}

function yesNo(value) {
  return value ? "Sim" : "Nao";
}

function convivenciaLabel(value) {
  return value ? "Convive bem" : "Nao convive";
}

function organizationLabel(animal) {
  return animal?.ongNome
    || animal?.organizacaoNome
    || animal?.protetorNome
    || "-";
}

function formatAnimalCode(id) {
  const numericId = Number(id);
  if (Number.isInteger(numericId) && numericId >= 0) {
    return `#A-${String(numericId).padStart(4, "0")}`;
  }
  return id ? `#A-${id}` : "#A-0000";
}

function speciesLabel(value) {
  const species = String(value || "").toLowerCase();
  if (species === "cao" || species === "cachorro") {
    return "Cachorro";
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

function removeAnimal(animal) {
  openDeleteModal(animal);
}

function openDeleteModal(animal) {
  animalPendingDeletion = animal;
  deleteModalTitle.textContent = `Remover ${animal?.nome || "animal"} da lista?`;
  deleteModalMessage.textContent = "A exclusao e permanente e remove o cadastro do animal.";
  setDeleteModalBusy(false);
  deleteModal.hidden = false;
  syncAdminModalOpenState();
  deleteCancelButton.focus();
}

function closeDeleteModal() {
  if (deleteIsSubmitting) {
    return;
  }

  animalPendingDeletion = null;
  deleteModal.hidden = true;
  syncAdminModalOpenState();
}

async function confirmAnimalDeletion() {
  if (!animalPendingDeletion || deleteIsSubmitting) {
    return;
  }

  const animal = animalPendingDeletion;
  setDeleteModalBusy(true);
  setFeedback(shell.feedback, "Excluindo animal...");
  try {
    await deleteAdminAnimal(animal.id);
    animalPendingDeletion = null;
    deleteModal.hidden = true;
    syncAdminModalOpenState();
    await loadAnimals();
    setFeedback(shell.feedback, "Animal excluido.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  } finally {
    setDeleteModalBusy(false);
  }
}

function setDeleteModalBusy(isBusy) {
  deleteIsSubmitting = isBusy;
  deleteBackdrop.disabled = isBusy;
  deleteCloseButton.disabled = isBusy;
  deleteCancelButton.disabled = isBusy;
  deleteConfirmButton.disabled = isBusy;
  deleteConfirmButton.textContent = isBusy ? "Excluindo..." : "Excluir";
}

async function submitAnimal(event) {
  event.preventDefault();
  const data = new FormData(form);
  const id = String(data.get("id") || "").trim();
  setFeedback(shell.feedback, id ? "Salvando animal..." : "Cadastrando animal...");

  try {
    if (id) {
      const payload = buildAnimalPayload(data);
      await updateAdminAnimal(id, payload);
      await updateAdminAnimalStatus(id, data.get("status"));
      setFeedback(shell.feedback, "Animal atualizado.", "success");
    } else {
      const files = form.elements.namedItem("imagens")?.files || [];
      if (files.length) {
        await createAdminAnimal(buildAnimalFormData(data, files), { hasFiles: true });
      } else {
        await createAdminAnimal(buildAnimalPayload(data));
      }
      setFeedback(shell.feedback, "Animal cadastrado.", "success");
    }
    closeAnimalModal();
    await loadAnimals();
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function buildAnimalPayload(data) {
  return {
    nome: data.get("nome"),
    especie: data.get("especie"),
    raca: data.get("raca") || "SRD",
    idadeMeses: Number(data.get("idadeMeses")),
    porte: data.get("porte"),
    sexo: data.get("sexo"),
    dataResgate: data.get("dataResgate"),
    nivelEnergia: data.get("nivelEnergia"),
    bomComCriancas: toFormBoolean(data, "bomComCriancas"),
    bomComCaes: toFormBoolean(data, "bomComCaes"),
    bomComGatos: toFormBoolean(data, "bomComGatos"),
    precisaEspaco: toFormBoolean(data, "precisaEspaco"),
    microchip: toFormBoolean(data, "microchip"),
    castrado: toFormBoolean(data, "castrado"),
    vermifugado: toFormBoolean(data, "vermifugado"),
    vacinado: toFormBoolean(data, "vacinado"),
    descricao: data.get("descricao"),
    protetorId: Number(data.get("protetorId")),
  };
}

function buildAnimalFormData(data, files) {
  const formData = new FormData();
  const payload = buildAnimalPayload(data);
  for (const [key, value] of Object.entries(payload)) {
    formData.append(key, value);
  }
  for (const file of files) {
    formData.append("imagens", file);
  }
  return formData;
}

function renderFormSide(animal = null) {
  clearNode(formSide);
  formSide.append(renderAnimalProfileSide(animal, { editable: true }));
}

function syncPhotoFileLabel() {
  const files = formImageInput.files || [];
  if (!files.length) {
    formImageLabel.textContent = "Nenhuma foto selecionada";
    return;
  }

  formImageLabel.textContent = files.length === 1
    ? files[0].name
    : `${files.length} fotos selecionadas`;
}

function fillForm(animal) {
  setValue("id", animal.id);
  setValue("nome", animal.nome);
  setValue("especie", animal.especie);
  setValue("raca", animal.raca || "SRD");
  setValue("idadeMeses", animal.idadeMeses);
  setValue("porte", animal.porte);
  setValue("sexo", animal.sexo);
  setValue("dataResgate", animal.dataResgate || "");
  setValue("nivelEnergia", animal.nivelEnergia);
  setValue("status", animal.status);
  setValue("protetorId", animal.protetorId || 1);
  setValue("descricao", animal.descricao || "");
  setChecked("bomComCriancas", animal.bomComCriancas);
  setChecked("bomComCaes", animal.bomComCaes);
  setChecked("bomComGatos", animal.bomComGatos);
  setChecked("precisaEspaco", animal.precisaEspaco);
  setChecked("microchip", animal.microchip);
  setChecked("castrado", animal.castrado);
  setChecked("vermifugado", animal.vermifugado);
  setChecked("vacinado", animal.vacinado);
  form.querySelector("[data-animal-submit]").textContent = "Salvar alteracoes";
  modalTitle.textContent = `Editar ${animal.nome}`;
  formCodeInput.value = formatAnimalCode(animal.id);
  renderFormSide(animal);
  syncPhotoFileLabel();
}

function resetForm() {
  form.reset();
  setValue("id", "");
  setValue("dataResgate", new Date().toISOString().slice(0, 10));
  setValue("protetorId", 1);
  setValue("status", "disponivel");
  form.querySelector("[data-animal-submit]").textContent = "Cadastrar animal";
  modalTitle.textContent = "Cadastrar novo animal";
  formCodeInput.value = formatAnimalCode(null);
  renderFormSide();
  syncPhotoFileLabel();
}

function openAnimalModal(animal = null) {
  if (animal) {
    fillForm(animal);
  } else {
    resetForm();
  }

  modal.hidden = false;
  syncAdminModalOpenState();
  form.elements.namedItem("nome")?.focus();
}

function closeAnimalModal() {
  modal.hidden = true;
  syncAdminModalOpenState();
  resetForm();
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    closeAnimalModal();
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

function bindPrimaryAction() {
  const primaryAction = document.querySelector(".admin-primary-action");
  if (!primaryAction) {
    return;
  }

  primaryAction.setAttribute("href", "#novo");
  primaryAction.addEventListener("click", (event) => {
    event.preventDefault();
    openAnimalModal();
  });
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

function syncFiltersFromToolbar() {
  animalFilters.query = toolbarSearch.value;
  animalFilters.status = readFilterValue("status");
  animalFilters.especie = readFilterValue("especie");
  animalFilters.porte = readFilterValue("porte");
  animalFilters.idade = readFilterValue("idade");
  animalFilters.ordem = readFilterValue("ordem") || "mais_recentes";
  animalPage = 0;
  if (shell?.search && shell.search.value !== animalFilters.query) {
    shell.search.value = animalFilters.query;
  }
  renderAnimals();
}

function changeAnimalPage(page) {
  animalPage = page;
  renderAnimals();
}

function readFilterValue(name) {
  return filterToolbar.elements.namedItem(name)?.value || "";
}

function renderPagination(page) {
  pageStatus.textContent = page.totalPages
    ? `Pagina ${page.page + 1} de ${page.totalPages} - ${page.totalItems} animais`
    : "Nenhuma pagina disponivel";
  prevPageButton.disabled = page.first || page.totalPages <= 1;
  nextPageButton.disabled = page.last || page.totalPages <= 1;
}

function updateFilterSummary(page, totalCount) {
  if (!totalCount) {
    filterSummary.textContent = "Nenhum animal cadastrado.";
    return;
  }

  if (!page.totalItems) {
    filterSummary.textContent = "Nenhum animal encontrado para os filtros atuais.";
    return;
  }

  if (page.totalItems === totalCount) {
    filterSummary.textContent = `${page.from}-${page.to} de ${totalCount} animais exibidos.`;
    return;
  }

  filterSummary.textContent = `${page.from}-${page.to} de ${page.totalItems} animais filtrados (${totalCount} no total).`;
}
