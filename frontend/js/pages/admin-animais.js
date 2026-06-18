import {
  createAdminAnimal,
  deleteAdminAnimal,
  fetchAdminAnimals,
  updateAdminAnimal,
  updateAdminAnimalStatus,
} from "../admin-api.js";
import { filterAndSortAdminAnimals } from "../admin-animal-filters.js";
import {
  describeAnimal,
  emptyState,
  renderRows,
  showError,
  statusPill,
  toFormBoolean,
} from "../admin-components.js";
import { createAdminShell } from "../admin-shell.js";
import { enhanceSelectDropdowns } from "../dropdowns.js";
import { element, formatEnum, renderAnimalImage, setFeedback } from "../ui.js";

const animalList = element("div", { className: "admin-list", "data-animal-list": "" });
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
  placeholder: "Buscar por nome, especie...",
});
const filterSummary = element("p", {
  className: "admin-animal-filter-summary muted",
  "data-animal-filter-summary": "",
});
const filterToolbar = element("form", {
  className: "animal-toolbar admin-animal-toolbar",
  "aria-label": "Filtros dos animais cadastrados",
}, [
  filterField("Tipo", filterSelect("status", [
    ["", "Todos"],
    ["disponivel", "Disponiveis"],
    ["em_analise", "Em analise"],
    ["adotado", "Adotados"],
  ])),
  filterField("Especie", filterSelect("especie", [
    ["", "Todas"],
    ["cao", "Cao"],
    ["gato", "Gato"],
    ["outro", "Outro"],
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
  filterField("Ordem", filterSelect("ordem", [
    ["mais_recentes", "Mais recentes"],
    ["mais_antigos", "Mais antigos"],
    ["nome_az", "Nome A-Z"],
    ["nome_za", "Nome Z-A"],
    ["idade_menor", "Menor idade"],
    ["idade_maior", "Maior idade"],
  ])),
  element("label", { className: "search-field admin-animal-search-field" }, [
    icon("fa-magnifying-glass"),
    toolbarSearch,
  ]),
  element("button", { className: "filter-button", type: "reset" }, [
    icon("fa-filter"),
    element("span", { text: "Limpar" }),
  ]),
]);
const modalTitle = element("h2", { id: "admin-animal-modal-title", "data-animal-form-title": "", text: "Cadastrar novo animal" });
const form = element("form", { className: "admin-form admin-form-grid admin-animal-form", id: "novo", "data-animal-form": "" }, [
  element("input", { type: "hidden", name: "id" }),
  field("Nome", element("input", { name: "nome", required: "required" }), "admin-field-wide"),
  field("Especie", select("especie", [
    ["cao", "Cao"],
    ["gato", "Gato"],
    ["outro", "Outro"],
  ])),
  field("Raca", element("input", { name: "raca", placeholder: "SRD" })),
  field("Idade em meses", element("input", { name: "idadeMeses", type: "number", min: "0", required: "required" })),
  field("Porte", select("porte", [
    ["pequeno", "Pequeno"],
    ["medio", "Medio"],
    ["grande", "Grande"],
  ])),
  field("Sexo", select("sexo", [
    ["macho", "Macho"],
    ["femea", "Femea"],
  ])),
  field("Data de resgate", element("input", { name: "dataResgate", type: "date", required: "required" })),
  field("Energia", select("nivelEnergia", [
    ["baixo", "Baixo"],
    ["medio", "Medio"],
    ["alto", "Alto"],
  ])),
  field("Status", select("status", [
    ["disponivel", "Disponivel"],
    ["em_analise", "Em analise"],
    ["adotado", "Adotado"],
  ])),
  field("Protetor ID", element("input", { name: "protetorId", type: "number", min: "1", value: "1", required: "required" })),
  field("Imagens", element("input", { name: "imagens", type: "file", accept: "image/png,image/jpeg,image/webp", multiple: "multiple" }), "admin-field-full admin-animal-file-field"),
  field("Descricao", element("textarea", { name: "descricao", rows: "4", placeholder: "Resumo do perfil do animal" }), "admin-field-full"),
  element("section", { className: "admin-animal-checks admin-field-full", "aria-labelledby": "admin-animal-checks-title" }, [
    element("div", { className: "admin-animal-checks-header" }, [
      element("h3", { id: "admin-animal-checks-title", text: "Cuidados e convivencia" }),
      element("p", { text: "Marque os pontos ja validados no cadastro do animal." }),
    ]),
    element("div", { className: "admin-animal-check-grid" }, [
      checkField("Bom com criancas", "bomComCriancas"),
      checkField("Bom com caes", "bomComCaes"),
      checkField("Bom com gatos", "bomComGatos"),
      checkField("Precisa de espaco", "precisaEspaco"),
      checkField("Microchip", "microchip"),
      checkField("Castrado", "castrado"),
      checkField("Vermifugado", "vermifugado"),
      checkField("Vacinado", "vacinado"),
    ]),
  ]),
  element("div", { className: "admin-form-actions" }, [
    element("button", { className: "button", type: "submit", "data-animal-submit": "", text: "Cadastrar animal" }),
    element("button", {
      className: "button button-secondary",
      type: "button",
      text: "Cancelar",
      onClick() {
        closeAnimalModal();
      },
    }),
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
  element("section", { className: "admin-animal-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "admin-animal-modal-title" }, [
    element("button", {
      className: "modal-close",
      type: "button",
      "aria-label": "Fechar",
      onClick() {
        closeAnimalModal();
      },
    }, [icon("fa-xmark")]),
    element("div", { className: "admin-modal-header" }, [
      element("span", { className: "admin-modal-mark" }, [icon("fa-paw")]),
      element("div", { className: "admin-modal-title-group" }, [
        element("span", { className: "admin-modal-kicker", text: "Cadastro de animal" }),
        modalTitle,
        element("p", { text: "Preencha as informacoes principais, fotos e cuidados para manter o perfil pronto para adocao." }),
      ]),
    ]),
    form,
  ]),
]);
const content = element("main", { className: "admin-page" }, [
  element("section", { className: "admin-card" }, [
    element("div", { className: "admin-card-header" }, [
      element("h2", { text: "Animais cadastrados" }),
    ]),
    filterToolbar,
    filterSummary,
    animalList,
  ]),
]);
const shell = createAdminShell({
  active: "animals",
  title: "Animais",
  subtitle: "Gerencie cadastro, status e informacoes dos animais.",
  searchPlaceholder: "Buscar animal",
  onSearch(value) {
    updateQueryFilter(value);
  },
  content,
});
let animals = [];

if (shell) {
  document.body.append(modal);
  form.addEventListener("submit", submitAnimal);
  filterToolbar.addEventListener("submit", (event) => event.preventDefault());
  filterToolbar.addEventListener("input", syncFiltersFromToolbar);
  filterToolbar.addEventListener("change", syncFiltersFromToolbar);
  filterToolbar.addEventListener("reset", () => {
    const setTimer = globalThis.window?.setTimeout || globalThis.setTimeout;
    setTimer(() => syncFiltersFromToolbar(), 0);
  });
  enhanceSelectDropdowns(filterToolbar);
  modal.addEventListener("keydown", handleModalKeydown);
  bindPrimaryAction();
  resetForm();
  loadAnimals();
}

async function loadAnimals() {
  setFeedback(shell.feedback, "Carregando animais...");
  try {
    animals = await fetchAdminAnimals();
    renderAnimals();
    setFeedback(shell.feedback, "");
  } catch (error) {
    showError(shell.feedback, error);
  }
}

function renderAnimals() {
  const filtered = filterAndSortAdminAnimals(animals, animalFilters);
  updateFilterSummary(filtered.length, animals.length);
  renderRows(animalList, filtered, renderAnimalRow, emptyState("Nenhum animal encontrado", "Ajuste os filtros ou cadastre um animal."));
}

function renderAnimalRow(animal) {
  return element("article", { className: "admin-list-row admin-animal-row" }, [
    element("div", { className: "admin-animal-summary" }, [
      renderAnimalImage(animal, { className: "admin-animal-thumb" }),
      element("div", {}, [
        element("strong", { text: animal.nome }),
        element("span", { className: "muted", text: describeAnimal(animal) }),
        element("small", { text: `Protetor: ${animal.protetorNome || "-"} - ${formatEnum(animal.nivelEnergia)}` }),
      ]),
    ]),
    statusPill(animal.status),
    element("div", { className: "admin-row-actions" }, [
      element("button", {
        className: "button button-secondary",
        type: "button",
        text: "Editar",
        onClick() {
          openAnimalModal(animal);
        },
      }),
      element("button", {
        className: "admin-icon-action admin-delete-action",
        type: "button",
        title: "Excluir",
        "aria-label": `Excluir ${animal.nome || "animal"}`,
        onClick() {
          removeAnimal(animal);
        },
      }, [icon("fa-trash")]),
    ]),
  ]);
}

async function removeAnimal(animal) {
  const confirmed = window.confirm(`Excluir ${animal.nome || "este animal"}? Esta acao nao pode ser desfeita.`);
  if (!confirmed) {
    return;
  }

  setFeedback(shell.feedback, "Excluindo animal...");
  try {
    await deleteAdminAnimal(animal.id);
    await loadAnimals();
    setFeedback(shell.feedback, "Animal excluido.", "success");
  } catch (error) {
    showError(shell.feedback, error);
  }
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
}

function resetForm() {
  form.reset();
  setValue("id", "");
  setValue("dataResgate", new Date().toISOString().slice(0, 10));
  setValue("protetorId", 1);
  setValue("status", "disponivel");
  form.querySelector("[data-animal-submit]").textContent = "Cadastrar animal";
  modalTitle.textContent = "Cadastrar novo animal";
}

function openAnimalModal(animal = null) {
  if (animal) {
    fillForm(animal);
  } else {
    resetForm();
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
  form.elements.namedItem("nome")?.focus();
}

function closeAnimalModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  resetForm();
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    closeAnimalModal();
  }
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
  if (shell?.search && shell.search.value !== animalFilters.query) {
    shell.search.value = animalFilters.query;
  }
  renderAnimals();
}

function updateQueryFilter(value) {
  animalFilters.query = value;
  if (toolbarSearch.value !== value) {
    toolbarSearch.value = value;
  }
  renderAnimals();
}

function readFilterValue(name) {
  return filterToolbar.elements.namedItem(name)?.value || "";
}

function updateFilterSummary(visibleCount, totalCount) {
  if (!totalCount) {
    filterSummary.textContent = "Nenhum animal cadastrado.";
    return;
  }

  if (visibleCount === totalCount) {
    filterSummary.textContent = `${totalCount} ${totalCount === 1 ? "animal cadastrado" : "animais cadastrados"}.`;
    return;
  }

  filterSummary.textContent = `${visibleCount} de ${totalCount} animais exibidos.`;
}

function field(label, control, extraClass = "") {
  return element("label", { className: ["admin-field", extraClass].filter(Boolean).join(" ") }, [
    element("span", { text: label }),
    control,
  ]);
}

function filterField(label, control) {
  return element("label", { className: "filter-field" }, [
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

function filterSelect(name, options) {
  return element("select", { name }, options.map(([value, label]) => (
    element("option", { value, text: label })
  )));
}

function select(name, options) {
  return element("select", { name, required: "required" }, options.map(([value, label]) => (
    element("option", { value, text: label })
  )));
}

function icon(name) {
  return element("i", { className: `fa-solid ${name} library-icon`, "aria-hidden": "true" });
}
