import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminUpdatePayload,
  buildAdotantePayload,
  buildAdotanteUpdatePayload,
  buildAnimalFormData,
  buildAnimalPayload,
  validateRequiredFields,
} from "../js/forms.js";
import {
  chooseAnimalImageUrl,
} from "../js/images.js";
import {
  enhanceSelectDropdown,
} from "../js/dropdowns.js";
import {
  createHeaderAuthController,
  formatCpfForLogin,
  getHeaderAuthViewState,
} from "../js/header-auth.js";
import {
  renderSharedAuthShell,
} from "../js/shared-auth-shell.js";
import {
  buildBasicAuthHeader,
  readAdminCredentials,
  saveAdminCredentials,
  clearAdminCredentials,
} from "../js/auth.js";
import {
  readAdotanteId,
  readAuthenticatedAdotanteId,
  clearCurrentUser,
  consumeLoginOnHome,
  readCurrentUser,
  requestLoginOnHome,
  saveAdotanteId,
  saveCurrentUser,
} from "../js/state.js";
import {
  applyFavoriteButtonState,
  getFavoriteButtonState,
  toggleFavorite,
} from "../js/favorites.js";
import {
  galleryUrls,
} from "../js/animal-gallery.js";
import {
  filterAndSortAdminAnimals,
} from "../js/admin-animal-filters.js";
import {
  adoptionStatusNotification,
  createNotificationCenter,
  showToast,
} from "../js/notifications.js";
import {
  formatAge,
  formatBoolean,
  formatEnum,
  getScoreLabel,
  renderAnimalCard,
} from "../js/ui.js";
import {
  ApiError,
  createApiClient,
  getErrorMessage,
} from "../js/api.js";

function formData(entries) {
  return new Map(entries);
}

function formElementMock(entries, files = []) {
  return {
    _data: formData(entries),
    elements: {
      imagens: { files },
    },
  };
}

function storageMock(entries = {}) {
  const data = new Map(Object.entries(entries));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

class TestElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.className = "";
    this.classList = createClassList(this);
    this.dataset = {};
    this.textContent = "";
    this.value = "";
    this.listeners = new Map();
    this.hidden = false;
  }

  append(...children) {
    for (const child of children) {
      if (child && typeof child === "object") {
        child.parentNode = this;
        child.parentElement = this;
      }
      this.children.push(child);
    }
  }

  prepend(...children) {
    for (const child of children.reverse()) {
      if (child && typeof child === "object") {
        child.parentNode = this;
        child.parentElement = this;
      }
      this.children.unshift(child);
    }
  }

  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    if (child && typeof child === "object") {
      child.parentNode = null;
      child.parentElement = null;
    }
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
      this.parentElement = null;
    }
  }

  get firstChild() {
    return this.children[0] || null;
  }

    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "hidden") {
        this.hidden = true;
      }
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === "hidden") {
      this.hidden = false;
    }
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatchEvent(event) {
    for (const handler of this.listeners.get(event.type) || []) {
      handler(event);
    }
  }

  click() {
    this.dispatchEvent({
      type: "click",
      currentTarget: this,
      preventDefault() {},
      stopPropagation() {},
    });
  }
}

function documentMock() {
  const body = new TestElement("body");
  const documentRef = {
    body,
    createElement(tagName) {
      const element = new TestElement(tagName);
      element.ownerDocument = documentRef;
      return element;
    },
    createElementNS(_namespace, tagName) {
      const element = new TestElement(tagName);
      element.ownerDocument = documentRef;
      return element;
    },
    querySelector(selector) {
      return findBySelector(body, selector);
    },
    querySelectorAll(selector) {
      return findAllBySelector(body, selector);
    },
  };
  body.ownerDocument = documentRef;
  return documentRef;
}

function notificationRootMock() {
  const root = documentMock();
  const host = root.createElement("div");
  const toggle = root.createElement("button");
  const badge = root.createElement("span");
  host.append(toggle);
  root.body.append(host);
  root.querySelector = (selector) => {
    if (selector === "[data-notifications-toggle]") {
      return toggle;
    }
    if (selector === "[data-notification-badge]") {
      return badge;
    }
    return findByClass(root.body, selector.startsWith(".") ? selector.slice(1) : selector);
  };
  root.addEventListener = () => {};
  return { root, host, toggle, badge };
}

function withDocumentMock(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = documentMock();
  try {
    return callback();
  } finally {
    globalThis.document = previousDocument;
  }
}

function textTree(node) {
  if (typeof node === "string") {
    return node;
  }
  return `${node?.textContent || ""}${(node?.children || []).map(textTree).join("")}`;
}

function findByClass(node, className) {
  if (!node || typeof node === "string") {
    return null;
  }
  const classes = String(node.className || "").split(/\s+/);
  if (classes.includes(className)) {
    return node;
  }
  for (const child of node.children || []) {
    const match = findByClass(child, className);
    if (match) {
      return match;
    }
  }
  return null;
}

function findAllByClass(node, className, matches = []) {
  if (!node || typeof node === "string") {
    return matches;
  }
  const classes = String(node.className || "").split(/\s+/);
  if (classes.includes(className)) {
    matches.push(node);
  }
  for (const child of node.children || []) {
    findAllByClass(child, className, matches);
  }
  return matches;
}

function createClassList(element) {
  function classes() {
    return new Set(String(element.className || "").split(/\s+/).filter(Boolean));
  }

  function write(nextClasses) {
    element.className = Array.from(nextClasses).join(" ");
  }

  return {
    contains(className) {
      return classes().has(className);
    },
    add(...classNames) {
      const nextClasses = classes();
      for (const className of classNames) {
        nextClasses.add(className);
      }
      write(nextClasses);
    },
    remove(...classNames) {
      const nextClasses = classes();
      for (const className of classNames) {
        nextClasses.delete(className);
      }
      write(nextClasses);
    },
    toggle(className, force) {
      const nextClasses = classes();
      const shouldAdd = force ?? !nextClasses.has(className);
      if (shouldAdd) {
        nextClasses.add(className);
      } else {
        nextClasses.delete(className);
      }
      write(nextClasses);
      return shouldAdd;
    },
  };
}

function findBySelector(node, selector) {
  return findAllBySelector(node, selector)[0] || null;
}

function findAllBySelector(node, selector, matches = []) {
  if (!node || typeof node === "string") {
    return matches;
  }

  if (matchesSelector(node, selector)) {
    matches.push(node);
  }

  for (const child of node.children || []) {
    findAllBySelector(child, selector, matches);
  }

  return matches;
}

function matchesSelector(node, selector) {
  if (selector.startsWith(".")) {
    return String(node.className || "").split(/\s+/).includes(selector.slice(1));
  }

  const dataAttribute = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
  if (dataAttribute) {
    const [, name, expectedValue] = dataAttribute;
    if (!Object.prototype.hasOwnProperty.call(node.attributes, name)) {
      return false;
    }
    return expectedValue === undefined || node.attributes[name] === expectedValue;
  }

  return String(node.tagName || "").toLowerCase() === selector.toLowerCase();
}

const animalCardFixture = {
  id: 8,
  nome: "Nina",
  especie: "gato",
  porte: "pequeno",
  idadeMeses: 14,
  status: "disponivel",
  nivelEnergia: "medio",
  castrado: true,
  vacinado: true,
  vermifugado: true,
  bomComCaes: false,
  bomComGatos: true,
  precisaEspaco: false,
  descricao: "Nina e curiosa, sociavel e gosta de observar tudo pela janela.",
  imagemUrls: ["/uploads/animais/nina.jpg"],
};

test("buildAdotantePayload normalizes text, booleans and enum values accepted by the API", () => {
  const payload = buildAdotantePayload(formData([
    ["nome", "  Maria Oliveira  "],
    ["cpf", " 111.111.111-11 "],
    ["senha", " maria123 "],
    ["email", " MARIA@EMAIL.COM "],
    ["telefone", " (47) 99901-0001 "],
    ["endereco", " Rua das Flores, 100 "],
    ["tipoMoradia", "apartamento"],
    ["temCriancas", "on"],
    ["nivelAtividade", "moderado"],
    ["preferenciaPorte", "pequeno"],
    ["preferenciaEspecie", "gato"],
  ]));

  assert.deepEqual(payload, {
    nome: "Maria Oliveira",
    cpf: "111.111.111-11",
    senha: "maria123",
    email: "maria@email.com",
    telefone: "(47) 99901-0001",
    endereco: "Rua das Flores, 100",
    tipoMoradia: "apartamento",
    temCriancas: true,
    temOutrosAnimais: false,
    nivelAtividade: "moderado",
    preferenciaPorte: "pequeno",
    preferenciaEspecie: "gato",
  });
});

test("buildAdotantePayload rejects enum values outside the backend contract", () => {
  assert.throws(
    () => buildAdotantePayload(formData([
      ["nome", "Maria"],
      ["cpf", "111.111.111-11"],
      ["senha", "maria123"],
      ["email", "maria@email.com"],
      ["telefone", "47999010001"],
      ["endereco", "Rua A"],
      ["tipoMoradia", "kitnet"],
      ["nivelAtividade", "moderado"],
      ["preferenciaPorte", "pequeno"],
      ["preferenciaEspecie", "gato"],
    ])),
    /tipoMoradia/
  );
});

test("buildAdotanteUpdatePayload keeps profile edits within the API contract", () => {
  const payload = buildAdotanteUpdatePayload(formData([
    ["nome", "  Maria Souza  "],
    ["email", " MARIA.SOUZA@EMAIL.COM "],
    ["telefone", " (47) 98888-0000 "],
    ["endereco", " Rua Nova, 22 "],
    ["tipoMoradia", "casa_com_quintal"],
    ["temCriancas", "on"],
    ["temOutrosAnimais", "on"],
    ["nivelAtividade", "ativo"],
    ["preferenciaPorte", "grande"],
    ["preferenciaEspecie", "cao"],
    ["senhaAtual", " maria123 "],
    ["novaSenha", " nova123 "],
  ]));

  assert.deepEqual(payload, {
    nome: "Maria Souza",
    email: "maria.souza@email.com",
    telefone: "(47) 98888-0000",
    endereco: "Rua Nova, 22",
    tipoMoradia: "casa_com_quintal",
    temCriancas: true,
    temOutrosAnimais: true,
    nivelAtividade: "ativo",
    preferenciaPorte: "grande",
    preferenciaEspecie: "cao",
    senhaAtual: "maria123",
    novaSenha: "nova123",
  });
});

test("buildAdminUpdatePayload keeps admin profile edits within the API contract", () => {
  const payload = buildAdminUpdatePayload(formData([
    ["nome", "  Gestor AdotaPet  "],
    ["email", " GESTOR@ADOTAPET.COM "],
    ["senhaAtual", " admin123 "],
    ["novaSenha", " nova123 "],
  ]));

  assert.deepEqual(payload, {
    nome: "Gestor AdotaPet",
    email: "gestor@adotapet.com",
    senhaAtual: "admin123",
    novaSenha: "nova123",
  });
});

test("buildAdminUpdatePayload rejects admin passwords outside the backend limit", () => {
  assert.throws(
    () => buildAdminUpdatePayload(formData([
      ["nome", "Gestor AdotaPet"],
      ["email", "gestor@adotapet.com"],
      ["senhaAtual", "admin123"],
      ["novaSenha", "a".repeat(73)],
    ])),
    /entre 6 e 72 caracteres/
  );
});

test("buildAnimalPayload keeps admin-created animals within the API enum contract", () => {
  const payload = buildAnimalPayload(formData([
    ["nome", "Thor"],
    ["especie", "cao"],
    ["raca", ""],
    ["idadeMeses", "36"],
    ["porte", "grande"],
    ["sexo", "macho"],
    ["dataResgate", "2025-08-14"],
    ["nivelEnergia", "alto"],
    ["bomComCriancas", "on"],
    ["bomComCaes", "on"],
    ["precisaEspaco", "on"],
    ["microchip", "on"],
    ["castrado", "on"],
    ["vermifugado", "on"],
    ["vacinado", "on"],
    ["descricao", " Precisa de quintal. "],
    ["protetorId", "2"],
  ]));

  assert.deepEqual(payload, {
    nome: "Thor",
    especie: "cao",
    raca: "SRD",
    idadeMeses: 36,
    porte: "grande",
    sexo: "macho",
    dataResgate: "2025-08-14",
    nivelEnergia: "alto",
    bomComCriancas: true,
    bomComCaes: true,
    bomComGatos: false,
    precisaEspaco: true,
    microchip: true,
    castrado: true,
    vermifugado: true,
    vacinado: true,
    descricao: "Precisa de quintal.",
    protetorId: 2,
  });
});

test("buildAnimalFormData appends normalized animal fields and uploaded image files", async () => {
  const png = new File(["image-bytes"], "mimi.png", { type: "image/png" });
  const jpg = new File(["image-bytes"], "mimi.jpg", { type: "image/jpeg" });
  const payload = buildAnimalFormData(formElementMock([
    ["nome", "Mimi"],
    ["especie", "gato"],
    ["raca", "SRD"],
    ["idadeMeses", "12"],
    ["porte", "pequeno"],
    ["sexo", "femea"],
    ["dataResgate", "2026-01-20"],
    ["nivelEnergia", "baixo"],
    ["descricao", ""],
    ["protetorId", "1"],
  ], [png, jpg]));

  assert.equal(payload.get("nome"), "Mimi");
  assert.equal(payload.get("raca"), "SRD");
  assert.equal(payload.get("idadeMeses"), "12");
  assert.equal(payload.get("sexo"), "femea");
  assert.equal(payload.get("dataResgate"), "2026-01-20");
  assert.equal(payload.get("bomComCriancas"), "false");
  assert.equal(payload.get("bomComCaes"), "false");
  assert.equal(payload.get("bomComGatos"), "false");
  assert.equal(payload.get("bomComAnimais"), "false");
  assert.equal(payload.get("microchip"), "false");
  assert.equal(payload.get("castrado"), "false");
  assert.equal(payload.get("vermifugado"), "false");
  assert.equal(payload.get("vacinado"), "false");
  assert.equal(payload.getAll("imagens").length, 2);
  assert.equal(payload.getAll("imagens")[0].name, "mimi.png");
  assert.equal(payload.getAll("imagens")[1].name, "mimi.jpg");
});

test("filterAndSortAdminAnimals combines admin animal filters without mutating the source list", () => {
  const animals = [
    { id: 1, nome: "Thor", especie: "cao", porte: "grande", idadeMeses: 36, status: "disponivel", raca: "SRD", dataResgate: "2025-02-10" },
    { id: 2, nome: "Mimi", especie: "gato", porte: "pequeno", idadeMeses: 8, status: "adotado", raca: "Siamês", dataResgate: "2025-03-11" },
    { id: 3, nome: "Nina", especie: "gato", porte: "pequeno", idadeMeses: 15, status: "disponivel", raca: "SRD", dataResgate: "2025-04-12" },
  ];

  const filtered = filterAndSortAdminAnimals(animals, {
    query: "srd",
    status: "disponivel",
    especie: "gato",
    porte: "pequeno",
    idade: "adulto",
    ordem: "mais_recentes",
  });

  assert.notEqual(filtered, animals);
  assert.deepEqual(filtered.map((animal) => animal.nome), ["Nina"]);
  assert.deepEqual(animals.map((animal) => animal.nome), ["Thor", "Mimi", "Nina"]);
});

test("filterAndSortAdminAnimals supports age groups and admin sort orders", () => {
  const animals = [
    { id: 1, nome: "Zeca", especie: "cao", porte: "medio", idadeMeses: 120, status: "disponivel", dataResgate: "2025-01-01" },
    { id: 2, nome: "Amora", especie: "cao", porte: "pequeno", idadeMeses: 6, status: "em_analise", dataResgate: "2025-05-01" },
    { id: 3, nome: "Bento", especie: "cao", porte: "grande", idadeMeses: 30, status: "disponivel", dataResgate: "2025-03-01" },
  ];

  assert.deepEqual(
    filterAndSortAdminAnimals(animals, { idade: "filhote", ordem: "nome_az" }).map((animal) => animal.nome),
    ["Amora"]
  );
  assert.deepEqual(
    filterAndSortAdminAnimals(animals, { idade: "senior", ordem: "idade_maior" }).map((animal) => animal.nome),
    ["Zeca"]
  );
  assert.deepEqual(
    filterAndSortAdminAnimals(animals, { ordem: "idade_menor" }).map((animal) => animal.nome),
    ["Amora", "Bento", "Zeca"]
  );
});

test("chooseAnimalImageUrl uses a registered animal image before calling random APIs", async () => {
  const url = await chooseAnimalImageUrl({
    especie: "cao",
    imagemUrls: [" /uploads/animais/thor.png "],
  }, {
    fetchImpl: async () => {
      throw new Error("random API should not be called");
    },
  });

  assert.equal(url, "http://localhost:8080/uploads/animais/thor.png");
});

test("chooseAnimalImageUrl fetches a random dog or cat image when the animal has no image", async () => {
  const dogUrl = await chooseAnimalImageUrl({ especie: "cao", imagemUrls: [] }, {
    fetchImpl: async (url) => {
      assert.equal(url, "https://dog.ceo/api/breeds/image/random");
      return {
        ok: true,
        async json() {
          return { message: "https://images.example.com/dog.jpg" };
        },
      };
    },
  });

  const catUrl = await chooseAnimalImageUrl({ especie: "gato", imagemUrls: [] }, {
    fetchImpl: async (url) => {
      assert.equal(url, "https://api.thecatapi.com/v1/images/search");
      return {
        ok: true,
        async json() {
          return [{ url: "https://images.example.com/cat.jpg" }];
        },
      };
    },
  });

  assert.equal(dogUrl, "https://images.example.com/dog.jpg");
  assert.equal(catUrl, "https://images.example.com/cat.jpg");
});

test("chooseAnimalImageUrl shares an in-flight fallback image for the same animal", async () => {
  const storage = storageMock();
  let calls = 0;
  const animal = { id: 2, nome: "Thor", especie: "cao", imagemUrls: [] };

  const [firstUrl, secondUrl] = await Promise.all([
    chooseAnimalImageUrl(animal, {
      storage,
      fetchImpl: async () => {
        calls += 1;
        return {
          ok: true,
          async json() {
            return { message: `https://images.example.com/dog-${calls}.jpg` };
          },
        };
      },
    }),
    chooseAnimalImageUrl(animal, {
      storage,
      fetchImpl: async () => {
        calls += 1;
        return {
          ok: true,
          async json() {
            return { message: `https://images.example.com/dog-${calls}.jpg` };
          },
        };
      },
    }),
  ]);

  assert.equal(calls, 1);
  assert.equal(firstUrl, "https://images.example.com/dog-1.jpg");
  assert.equal(secondUrl, "https://images.example.com/dog-1.jpg");
});

test("chooseAnimalImageUrl reuses cached fallback image URLs without calling random APIs again", async () => {
  const storage = storageMock();
  const animal = { id: 10, nome: "Luna", especie: "cao", imagemUrls: [] };
  const firstUrl = await chooseAnimalImageUrl(animal, {
    storage,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { message: "https://images.example.com/cached-dog.jpg" };
      },
    }),
  });

  const secondUrl = await chooseAnimalImageUrl(animal, {
    storage,
    fetchImpl: async () => {
      throw new Error("random API should not be called when a cached URL exists");
    },
  });

  assert.equal(firstUrl, "https://images.example.com/cached-dog.jpg");
  assert.equal(secondUrl, "https://images.example.com/cached-dog.jpg");
});

test("galleryUrls returns only the registered animal images", () => {
  assert.deepEqual(galleryUrls({
    imagemUrls: [" /uploads/animais/mimi-1.png ", "", "/uploads/animais/mimi-2.jpg"],
  }), [
    "/uploads/animais/mimi-1.png",
    "/uploads/animais/mimi-2.jpg",
  ]);
  assert.deepEqual(galleryUrls({ imagemUrls: ["/uploads/animais/mimi.png"] }), ["/uploads/animais/mimi.png"]);
  assert.equal(galleryUrls({
    imagemUrls: ["1.png", "2.png", "3.png", "4.png", "5.png", "6.png"],
  }).length, 6);
  assert.deepEqual(galleryUrls({ imagemUrls: [] }), [""]);
});

test("renderAnimalCard presents recommendations as a professional match card", () => {
  const card = withDocumentMock(() => renderAnimalCard({
    animal: animalCardFixture,
    score: 100,
    isFavorite: true,
  }));
  const text = textTree(card);

  assert.match(card.className, /animal-card-match/);
  assert.match(text, /Alta compatibilidade/);
  assert.match(text, /Por que combina com voc\u00ea/);
  assert.match(text, /N\u00edvel de energia compat\u00edvel/);
  assert.match(text, /M\u00e9dio/);
  assert.match(text, /100%/);
  assert.equal(findByClass(card, "score"), null);
  assert.ok(findByClass(card, "match-score-panel"));
  assert.ok(findByClass(card, "match-meter"));
  assert.ok(findByClass(card, "match-meter-fill"));
  assert.ok(findByClass(card, "match-reasons"));
  assert.equal(findAllByClass(card, "match-reason-icon").length, 3);
  assert.equal(findAllByClass(card, "care-pill").length, 0);
  assert.ok(findByClass(card, "button-save-icon-only"));
  assert.equal(findByClass(card, "animal-facts"), null);
});

test("renderAnimalCard renders compact home cards like the visual reference", () => {
  const card = withDocumentMock(() => renderAnimalCard({
    animal: animalCardFixture,
    compact: true,
  }));
  const text = textTree(card);
  const score = findByClass(card, "score");

  assert.match(card.className, /animal-card-premium/);
  assert.match(card.className, /animal-card-compact/);
  assert.match(card.className, /animal-card-home/);
  assert.match(text, /Nina/);
  assert.match(text, /Gato/);
  assert.match(text, /Pequeno/);
  assert.ok(score);
  assert.equal(score.children[0].tagName, "strong");
  assert.ok(findByClass(card, "animal-size-tag"));
  assert.ok(findByClass(card, "care-pill-grid"));
  assert.equal(findAllByClass(card, "care-pill").length, 6);
  assert.equal(findAllByClass(card, "care-pill-icon").length, 6);
  assert.ok(findByClass(card, "animal-environment"));
  assert.ok(findByClass(card, "button-save-icon-only"));
  assert.equal(findByClass(card, "animal-card-chips"), null);
  assert.equal(findByClass(card, "animal-facts"), null);
});

test("renderAnimalCard routes the save CTA through favorite toggling", () => {
  let toggledAnimalId = null;
  const card = withDocumentMock(() => renderAnimalCard({
    animal: animalCardFixture,
    onFavoriteToggle({ animal }) {
      toggledAnimalId = animal.id;
    },
  }));

  findByClass(card, "button-save").click();

  assert.equal(toggledAnimalId, animalCardFixture.id);
});

test("enhanceSelectDropdown opens with animation state and syncs the native select", () => {
  const field = new TestElement("label");
  const select = new TestElement("select");
  select.value = "";
  select.options = [
    { value: "", textContent: "Todos" },
    { value: "disponivel", textContent: "Disponiveis" },
  ];
  let changed = false;
  select.addEventListener("change", () => {
    changed = true;
  });
  field.append(select);

  const dropdown = enhanceSelectDropdown(field, { documentRef: documentMock() });
  dropdown.button.click();

  assert.match(field.className, /filter-field-open/);
  assert.equal(dropdown.button.getAttribute("aria-expanded"), "true");

  dropdown.options[1].click();

  assert.equal(select.value, "disponivel");
  assert.equal(changed, true);
  assert.equal(dropdown.button.textContent, "Disponiveis");
  assert.doesNotMatch(field.className, /filter-field-open/);
  assert.equal(dropdown.button.getAttribute("aria-expanded"), "false");
});

test("validateRequiredFields returns only missing required field names", () => {
  const missing = validateRequiredFields({ nome: "Ana", email: "", idadeMeses: 0 }, ["nome", "email", "idadeMeses"]);

  assert.deepEqual(missing, ["email"]);
});

test("admin credentials are saved only in session-like storage and encoded for Basic auth", () => {
  const storage = storageMock();
  saveAdminCredentials(storage, " admin@adotapet.com ", " admin123 ");

  assert.deepEqual(readAdminCredentials(storage), {
    email: "admin@adotapet.com",
    senha: "admin123",
  });
  assert.equal(buildBasicAuthHeader("admin@adotapet.com", "admin123"), "Basic YWRtaW5AYWRvdGFwZXQuY29tOmFkbWluMTIz");

  clearAdminCredentials(storage);
  assert.equal(readAdminCredentials(storage), null);
});

test("current user session stores only display data for the home header", () => {
  const storage = storageMock();
  saveCurrentUser(storage, {
    id: 4,
    nome: "  Mariana Costa  ",
    cpf: " 777.777.777-77 ",
    email: " MARIANA@EMAIL.COM ",
    tipo: "adotante",
    senha: "nao-deve-ser-persistida",
  });

  assert.deepEqual(readCurrentUser(storage), {
    id: 4,
    nome: "Mariana Costa",
    cpf: "777.777.777-77",
    email: "mariana@email.com",
    tipo: "adotante",
  });
  assert.doesNotMatch(storage.getItem("adotapet.currentUser"), /nao-deve-ser-persistida/);

  clearCurrentUser(storage);
  assert.equal(readCurrentUser(storage), null);
});

test("authenticated adopter id requires a current adopter session", () => {
  const sessionStorage = storageMock();
  const localStorage = storageMock({ "adotapet.adotanteId": "42" });

  assert.equal(readAuthenticatedAdotanteId({ sessionStorage, localStorage }), null);
  assert.equal(readAdotanteId(localStorage), null);

  saveCurrentUser(sessionStorage, {
    id: 7,
    nome: "Mariana Costa",
    cpf: "777.777.777-77",
    email: "mariana@email.com",
    tipo: "adotante",
  });
  saveAdotanteId(localStorage, 42);

  assert.equal(readAuthenticatedAdotanteId({ sessionStorage, localStorage }), 7);
  assert.equal(readAdotanteId(localStorage), 7);
});

test("login-on-home flag is consumed once", () => {
  const storage = storageMock();

  requestLoginOnHome(storage);

  assert.equal(consumeLoginOnHome(storage), true);
  assert.equal(consumeLoginOnHome(storage), false);
});

test("header auth state hides private actions until the user signs in", () => {
  assert.deepEqual(getHeaderAuthViewState(null), {
    isLoggedIn: false,
    isAdmin: false,
    loginHidden: false,
    privateActionsHidden: true,
    accountHidden: true,
    adminAreaHidden: true,
    greeting: "",
  });

  assert.deepEqual(getHeaderAuthViewState({ nome: "Mariana Costa", tipo: "adotante" }), {
    isLoggedIn: true,
    isAdmin: false,
    loginHidden: true,
    privateActionsHidden: false,
    accountHidden: false,
    adminAreaHidden: true,
    greeting: "Mariana Costa",
  });

  assert.deepEqual(getHeaderAuthViewState({ nome: "Administrador AdotaPet", tipo: "admin" }), {
    isLoggedIn: true,
    isAdmin: true,
    loginHidden: true,
    privateActionsHidden: true,
    accountHidden: false,
    adminAreaHidden: false,
    greeting: "Administrador AdotaPet",
  });
});

test("header auth controller notifies pages when the user logs out", () => {
  const storage = storageMock();
  saveCurrentUser(storage, {
    id: 4,
    nome: "Mariana Costa",
    cpf: "777.777.777-77",
    email: "mariana@email.com",
    tipo: "adotante",
  });

  const logoutButton = new TestElement("button");
  const root = documentMock();
  root.querySelector = (selector) => (selector === "[data-logout]" ? logoutButton : null);
  root.querySelectorAll = () => [];
  root.addEventListener = () => {};
  let logoutNotified = false;

  createHeaderAuthController({
    root,
    storage,
    onLogout() {
      logoutNotified = true;
    },
  });

  logoutButton.click();

  assert.equal(readCurrentUser(storage), null);
  assert.equal(logoutNotified, true);
});

test("header auth controller routes admins to the profile edit page", () => {
  const storage = storageMock();
  saveCurrentUser(storage, {
    id: 1,
    nome: "Administrador AdotaPet",
    cpf: "000.000.000-00",
    email: "admin@adotapet.com",
    tipo: "admin",
  });

  const editProfileButton = new TestElement("button");
  const root = documentMock();
  root.querySelector = (selector) => (selector === "[data-edit-profile]" ? editProfileButton : null);
  root.querySelectorAll = () => [];
  root.addEventListener = () => {};
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: {
      href: "admin-painel.html",
    },
  };

  try {
    createHeaderAuthController({ root, storage });
    editProfileButton.click();

    assert.equal(globalThis.window.location.href, "editar-dados.html");
  } finally {
    globalThis.window = previousWindow;
  }
});

test("shared auth shell renders reusable header and login modal", () => {
  const root = documentMock();
  const mount = root.createElement("div");
  mount.setAttribute("data-shared-auth-shell", "");
  root.body.append(mount);

  assert.equal(renderSharedAuthShell(root), true);
  assert.ok(root.querySelector("[data-auth-header]"));
  assert.ok(root.querySelector("[data-login-open]"));
  assert.ok(root.querySelector("[data-account-menu]"));
  assert.ok(root.querySelector("[data-login-modal]"));
  assert.ok(root.querySelector("[data-site-footer]"));
  assert.match(textTree(root.body), /Gustavo Maciel Huçulak/);
  assert.match(textTree(root.body), /IFC Campus Fraiburgo/);
  const githubLink = root.querySelector(".site-footer-github");
  assert.equal(githubLink.getAttribute("href"), "https://github.com/Gusta12344");
  assert.ok(findByClass(githubLink, "fa-github"));
  assert.equal(root.querySelectorAll("[data-login-close]").length, 2);
});

test("admin shared auth shell replaces the sidebar brand with administrative context", () => {
  const root = documentMock();
  root.body.className = "admin-shell-page";
  const mount = root.createElement("div");
  mount.setAttribute("data-shared-auth-shell", "");
  root.body.append(mount);

  assert.equal(renderSharedAuthShell(root), true);
  assert.ok(findByClass(root.body, "admin-site-header"));
  assert.ok(findByClass(root.body, "brand-context"));
  assert.match(textTree(root.body), /Area Administrativa/);

  const navText = textTree(root.querySelector(".nav-links"));
  assert.match(navText, /Inicio/);
  assert.doesNotMatch(navText, /Recomendados/);
});

test("header auth controller mounts shared shell before wiring controls", () => {
  const root = documentMock();
  root.addEventListener = () => {};
  const mount = root.createElement("div");
  mount.setAttribute("data-shared-auth-shell", "");
  root.body.append(mount);
  const storage = storageMock();
  saveCurrentUser(storage, {
    id: 1,
    nome: "Administrador AdotaPet",
    cpf: "000.000.000-00",
    email: "admin@adotapet.com",
    tipo: "admin",
  });

  createHeaderAuthController({ root, storage });

  assert.equal(root.querySelector("[data-account-greeting]").textContent, "Administrador AdotaPet");
  assert.equal(root.querySelector("[data-login-open]").hidden, true);
  assert.equal(root.querySelector("[data-admin-area]").hidden, false);
});

test("favorite button state marks favorited animals with a pressed red heart", () => {
  assert.deepEqual(getFavoriteButtonState({ nome: "Mimi" }, true), {
    className: "favorite-toggle favorite-toggle-active",
    ariaLabel: "Remover Mimi dos favoritos",
    ariaPressed: "true",
    title: "Remover dos favoritos",
  });

  const button = new TestElement("button");
  applyFavoriteButtonState(button, { nome: "Mimi" }, true);

  assert.equal(button.className, "favorite-toggle favorite-toggle-active");
  assert.equal(button.getAttribute("aria-label"), "Remover Mimi dos favoritos");
  assert.equal(button.getAttribute("aria-pressed"), "true");
});

test("toggleFavorite refreshes persisted notifications after favorite changes", async () => {
  const calls = [];
  const favoriteIds = new Set();
  const events = [];
  const previousWindow = globalThis.window;
  globalThis.window = {
    dispatchEvent(event) {
      events.push(event.type);
    },
  };
  const apiClient = {
    async post(path, body) {
      calls.push({ method: "POST", path, body });
      return {};
    },
  };

  try {
    const isFavorite = await toggleFavorite({ id: 3, nome: "Mimi" }, {
      adotanteId: 7,
      favoriteIds,
      apiClient,
    });

    assert.equal(isFavorite, true);
    assert.equal(calls[0].path, "/adotantes/7/favoritos/3");
    assert.deepEqual(events, ["adotapet:notifications-changed"]);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("adoptionStatusNotification turns approved requests into bell notifications", () => {
  const notification = adoptionStatusNotification({
    id: 12,
    animalNome: "Nina",
    status: "aprovada",
  });

  assert.equal(notification.id, "adocao-12-aprovada");
  assert.equal(notification.type, "success");
  assert.match(notification.title, /aprovada/);
  assert.match(notification.body, /Nina/);
});

test("showToast renders a dismissible notification toast", () => {
  const previousDocument = globalThis.document;
  const mock = documentMock();
  globalThis.document = mock;

  try {
    const toast = showToast({
      title: "Favoritos atualizados",
      body: "Mimi foi adicionada aos favoritos.",
      type: "success",
      duration: 0,
    });

    assert.ok(findByClass(mock.body, "toast-region"));
    assert.match(textTree(toast), /Favoritos atualizados/);
    assert.match(textTree(toast), /Mimi foi adicionada aos favoritos/);
    findByClass(toast, "toast-close").click();
    assert.equal(findByClass(mock.body, "toast-notification"), null);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("notification center reads persisted notifications and marks them read in the API", async () => {
  const { root, badge } = notificationRootMock();
  const calls = [];
  const previousSetInterval = globalThis.setInterval;
  globalThis.setInterval = null;
  const apiClient = {
    async get(path) {
      calls.push({ method: "GET", path });
      return [{
        id: 22,
        titulo: "Solicitacao aprovada",
        mensagem: "Sua solicitacao para adotar Nina foi aprovada.",
        tipo: "adocao",
        lida: false,
        dataCriacao: "2026-06-03T10:00:00",
      }];
    },
    async put(path, body) {
      calls.push({ method: "PUT", path, body });
      return [];
    },
  };

  try {
    const center = createNotificationCenter({ root, storage: storageMock(), apiClient });

    await center.sync({ id: 7, nome: "Maria", tipo: "adotante" });
    await center.openPanel();

    assert.deepEqual(calls, [
      { method: "GET", path: "/notificacoes/adotantes/7" },
      { method: "PUT", path: "/notificacoes/adotantes/7/lidas", body: {} },
    ]);
    assert.equal(badge.hidden, true);
  } finally {
    globalThis.setInterval = previousSetInterval;
  }
});

test("notification center clears notifications through the API", async () => {
  const { root, badge } = notificationRootMock();
  const calls = [];
  const previousSetInterval = globalThis.setInterval;
  globalThis.setInterval = null;
  const apiNotification = {
    id: 22,
    titulo: "Solicitacao aprovada",
    mensagem: "Sua solicitacao para adotar Nina foi aprovada.",
    tipo: "adocao",
    lida: false,
    dataCriacao: "2026-06-03T10:00:00",
  };
  const apiClient = {
    async get(path) {
      calls.push({ method: "GET", path });
      return [apiNotification];
    },
    async put(path, body) {
      calls.push({ method: "PUT", path, body });
      return [{ ...apiNotification, lida: true }];
    },
    async delete(path) {
      calls.push({ method: "DELETE", path });
      return null;
    },
  };

  try {
    const center = createNotificationCenter({ root, storage: storageMock(), apiClient });

    await center.sync({ id: 7, nome: "Maria", tipo: "adotante" });
    await center.openPanel();

    const clearButton = findByClass(root.body, "notification-clear-button");
    assert.ok(clearButton);
    clearButton.click();
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(calls, [
      { method: "GET", path: "/notificacoes/adotantes/7" },
      { method: "PUT", path: "/notificacoes/adotantes/7/lidas", body: {} },
      { method: "DELETE", path: "/notificacoes/adotantes/7" },
    ]);
    assert.equal(badge.hidden, true);
    assert.equal(findByClass(root.body, "notification-item"), null);
    assert.match(textTree(root.body), /Nenhuma notificacao nova por enquanto/);
  } finally {
    globalThis.setInterval = previousSetInterval;
  }
});

test("formatCpfForLogin masks CPF while the user types", () => {
  assert.equal(formatCpfForLogin("1"), "1");
  assert.equal(formatCpfForLogin("1111"), "111.1");
  assert.equal(formatCpfForLogin("11111111111"), "111.111.111-11");
  assert.equal(formatCpfForLogin("111.111.111-11"), "111.111.111-11");
  assert.equal(formatCpfForLogin("11111111111999"), "111.111.111-11");
  assert.equal(formatCpfForLogin("cpf 111a222b333c44"), "111.222.333-44");
});

test("format helpers produce readable labels without changing API values", () => {
  assert.equal(formatAge(1), "1 mes");
  assert.equal(formatAge(12), "1 ano");
  assert.equal(formatAge(25), "2 anos e 1 mes");
  assert.equal(formatBoolean(true), "Sim");
  assert.equal(formatBoolean(false), "Nao");
  assert.equal(formatEnum("casa_com_quintal"), "Casa com quintal");
  assert.equal(getScoreLabel(85), "Alta compatibilidade");
  assert.equal(getScoreLabel(55), "Compatibilidade moderada");
});

test("getErrorMessage prefers API messages and includes field validation details", () => {
  assert.equal(getErrorMessage({
    message: "Dados invalidos",
    fields: {
      email: "must be a well-formed email address",
      nome: "must not be blank",
    },
  }), "Dados invalidos: email - must be a well-formed email address; nome - must not be blank");
});

test("getErrorMessage uses a readable fallback for unauthorized responses without JSON body", () => {
  assert.equal(getErrorMessage(null, { status: 401 }), "CPF ou senha invalidos");
});

test("createApiClient sends JSON requests and converts error responses to ApiError", async () => {
  const calls = [];
  const client = createApiClient({
    baseUrl: "http://localhost:8080",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: false,
        status: 400,
        async text() {
          return JSON.stringify({ message: "Animal ja foi adotado" });
        },
      };
    },
  });

  await assert.rejects(
    () => client.post("/adocoes", { animalId: 1, adotanteId: 2 }),
    (error) => error instanceof ApiError && error.status === 400 && error.message === "Animal ja foi adotado"
  );

  assert.equal(calls[0].url, "http://localhost:8080/adocoes");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Content-Type"], "application/json");
  assert.equal(calls[0].options.body, JSON.stringify({ animalId: 1, adotanteId: 2 }));
});

test("createApiClient sends multipart form data without forcing JSON headers", async () => {
  const calls = [];
  const multipart = new FormData();
  multipart.append("nome", "Mimi");
  const storage = storageMock();
  saveAdminCredentials(storage, "admin@adotapet.com", "admin123");
  const client = createApiClient({
    baseUrl: "http://localhost:8080",
    storage,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 201,
        async text() {
          return JSON.stringify({ id: 1 });
        },
      };
    },
  });

  await client.postForm("/animais", multipart, { auth: true });

  assert.equal(calls[0].url, "http://localhost:8080/animais");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.body, multipart);
  assert.equal(calls[0].options.headers["Content-Type"], undefined);
  assert.match(calls[0].options.headers.Authorization, /^Basic /);
});

test("createApiClient sends DELETE requests without a JSON body", async () => {
  const calls = [];
  const client = createApiClient({
    baseUrl: "http://localhost:8080",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 204,
        async text() {
          return "";
        },
      };
    },
  });

  await client.delete("/adotantes/7/favoritos/3");

  assert.equal(calls[0].url, "http://localhost:8080/adotantes/7/favoritos/3");
  assert.equal(calls[0].options.method, "DELETE");
  assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[0].options.headers["Content-Type"], undefined);
});
