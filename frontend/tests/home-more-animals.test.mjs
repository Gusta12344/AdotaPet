import test from "node:test";
import assert from "node:assert/strict";

class TestElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = new Map();
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.hidden = false;
    this.disabled = false;
  }

  get firstChild() {
    return this.children[0] || null;
  }

  append(...children) {
    const validChildren = children.filter((child) => child !== null && child !== undefined);
    for (const child of validChildren) {
      child.parentNode = this;
    }
    this.children.push(...validChildren);
  }

  prepend(...children) {
    const validChildren = children.filter((child) => child !== null && child !== undefined);
    for (const child of validChildren) {
      child.parentNode = this;
    }
    this.children.unshift(...validChildren);
  }

  removeChild(child) {
    child.parentNode = null;
    this.children = this.children.filter((item) => item !== child);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "hidden") {
      this.hidden = true;
    }
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

  click() {
    for (const handler of this.listeners.get("click") || []) {
      handler({ currentTarget: this });
    }
  }
}

function createDocumentMock(elements) {
  return {
    createElement(tagName) {
      return new TestElement(tagName);
    },
    querySelector(selector) {
      return elements.get(selector) || null;
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

function animal(id) {
  return {
    id,
    nome: `Animal ${id}`,
    especie: id % 2 === 0 ? "cao" : "gato",
    porte: "pequeno",
    idadeMeses: 18,
    nivelEnergia: "medio",
    status: "disponivel",
    bomComCaes: true,
    bomComGatos: true,
    precisaEspaco: false,
    imagemUrls: [`/uploads/animais/animal-${id}.jpg`],
  };
}

function homeElements() {
  const list = new TestElement("div");
  const feedback = new TestElement("p");
  const toolbar = new TestElement("form");
  const search = new TestElement("input");
  const statusFilter = new TestElement("select");
  const speciesFilter = new TestElement("select");
  const sizeFilter = new TestElement("select");
  const ageFilter = new TestElement("select");
  const moreButton = new TestElement("button");
  const lessButton = new TestElement("button");
  const endMessage = new TestElement("p");

  return {
    list,
    feedback,
    toolbar,
    search,
    statusFilter,
    speciesFilter,
    sizeFilter,
    ageFilter,
    moreButton,
    lessButton,
    endMessage,
    elements: new Map([
      ["#animais-preview", list],
      ["#home-feedback", feedback],
      [".animal-toolbar", toolbar],
      ["#animal-search", search],
      ["#animal-status-filter", statusFilter],
      ["#animal-species-filter", speciesFilter],
      ["#animal-size-filter", sizeFilter],
      ["#animal-age-filter", ageFilter],
      [".more-button", moreButton],
      [".less-button", lessButton],
      ["#animais-end-message", endMessage],
    ]),
  };
}

async function waitFor(condition) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.ok(condition(), "condition should become true");
}

test("home page uses the recommendation score for the signed-in adopter", async () => {
  const { list, feedback, elements } = homeElements();
  const requestedUrls = [];
  const previousSetInterval = globalThis.setInterval;

  globalThis.document = createDocumentMock(elements);
  globalThis.setInterval = null;
  globalThis.sessionStorage = storageMock({
    "adotapet.currentUser": JSON.stringify({
      id: 42,
      nome: "Mariana Costa",
      cpf: "777.777.777-77",
      email: "mariana@email.com",
      tipo: "adotante",
    }),
  });
  globalThis.localStorage = storageMock({ "adotapet.adotanteId": "42" });
  globalThis.window = {
    setTimeout(callback) {
      return setTimeout(callback, 0);
    },
  };
  globalThis.fetch = async (url) => {
    requestedUrls.push(url);
    if (url === "http://localhost:8080/animais") {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify([animal(8)]);
        },
      };
    }
    if (url === "http://localhost:8080/animais/recomendados/42") {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify([{ animal: animal(8), score: 60 }]);
        },
      };
    }
    if (url === "http://localhost:8080/adotantes/42/favoritos") {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify([]);
        },
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    await import(`../js/pages/index.js?test=${Date.now()}-recommendation-score`);
    await waitFor(() => list.children.length === 1);

    assert.ok(requestedUrls.includes("http://localhost:8080/animais/recomendados/42"));
    assert.match(textTree(findByClass(list.children[0], "score")), /60%/);
    assert.doesNotMatch(textTree(findByClass(list.children[0], "score")), /83%/);
  } finally {
    globalThis.setInterval = previousSetInterval;
    delete globalThis.sessionStorage;
    delete globalThis.localStorage;
  }
});

test("favorites page uses recommendation scores and match cards for favorited animals", async () => {
  const list = new TestElement("div");
  const feedback = new TestElement("p");
  const requestedUrls = [];
  const previousSetInterval = globalThis.setInterval;
  const elements = new Map([
    ["#favoritos-list", list],
    ["#favoritos-feedback", feedback],
  ]);

  globalThis.document = createDocumentMock(elements);
  globalThis.setInterval = null;
  globalThis.sessionStorage = storageMock({
    "adotapet.currentUser": JSON.stringify({
      id: 42,
      nome: "Mariana Costa",
      cpf: "777.777.777-77",
      email: "mariana@email.com",
      tipo: "adotante",
    }),
  });
  globalThis.localStorage = storageMock({ "adotapet.adotanteId": "42" });
  globalThis.window = {
    location: {
      href: "favoritos.html",
    },
  };
  globalThis.fetch = async (url) => {
    requestedUrls.push(url);
    if (url === "http://localhost:8080/adotantes/42/favoritos") {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify([animal(8)]);
        },
      };
    }
    if (url === "http://localhost:8080/animais/recomendados/42") {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify([{ animal: animal(8), score: 60 }]);
        },
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    await import(`../js/pages/favoritos.js?test=${Date.now()}-recommendation-score`);
    await waitFor(() => list.children.length === 1);

    assert.ok(requestedUrls.includes("http://localhost:8080/animais/recomendados/42"));
    assert.match(list.children[0].className, /animal-card-match/);
    assert.match(textTree(list.children[0]), /60%/);
    assert.doesNotMatch(textTree(list.children[0]), /83%/);
  } finally {
    globalThis.setInterval = previousSetInterval;
    delete globalThis.document;
    delete globalThis.sessionStorage;
    delete globalThis.localStorage;
    delete globalThis.window;
    delete globalThis.fetch;
  }
});

test("home page reveals more animals in batches and shows an end message", async () => {
  const list = new TestElement("div");
  const feedback = new TestElement("p");
  const toolbar = new TestElement("form");
  const search = new TestElement("input");
  const statusFilter = new TestElement("select");
  const speciesFilter = new TestElement("select");
  const sizeFilter = new TestElement("select");
  const ageFilter = new TestElement("select");
  const moreButton = new TestElement("button");
  const lessButton = new TestElement("button");
  const endMessage = new TestElement("p");

  const elements = new Map([
    ["#animais-preview", list],
    ["#home-feedback", feedback],
    [".animal-toolbar", toolbar],
    ["#animal-search", search],
    ["#animal-status-filter", statusFilter],
    ["#animal-species-filter", speciesFilter],
    ["#animal-size-filter", sizeFilter],
    ["#animal-age-filter", ageFilter],
    [".more-button", moreButton],
    [".less-button", lessButton],
    ["#animais-end-message", endMessage],
  ]);

  globalThis.document = createDocumentMock(elements);
  globalThis.window = {
    setTimeout(callback) {
      return setTimeout(callback, 0);
    },
  };
  globalThis.fetch = async (url) => {
    assert.equal(url, "http://localhost:8080/animais");
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify(Array.from({ length: 12 }, (_, index) => animal(index + 1)));
      },
    };
  };

  await import(`../js/pages/index.js?test=${Date.now()}`);
  await waitFor(() => list.children.length === 5);
  const firstCard = list.children[0];
  const fifthCard = list.children[4];

  assert.equal(moreButton.hidden, false);
  assert.equal(lessButton.hidden, true);
  assert.equal(endMessage.textContent, "");

  moreButton.click();
  assert.equal(list.children.length, 10);
  assert.equal(list.children[0], firstCard);
  assert.equal(list.children[4], fifthCard);
  assert.equal(lessButton.hidden, false);
  assert.equal(endMessage.textContent, "");

  moreButton.click();
  assert.equal(list.children.length, 12);
  assert.equal(list.children[0], firstCard);
  assert.equal(list.children[4], fifthCard);
  assert.equal(moreButton.hidden, true);
  assert.equal(lessButton.hidden, false);
  assert.equal(endMessage.textContent, "Sem mais animais cadastrados.");

  lessButton.click();
  await waitFor(() => list.children.length === 7);
  assert.equal(list.children.length, 7);
  assert.equal(list.children[0], firstCard);
  assert.equal(list.children[4], fifthCard);
  assert.equal(moreButton.hidden, false);
  assert.equal(lessButton.hidden, false);
  assert.equal(endMessage.textContent, "");

  lessButton.click();
  await waitFor(() => list.children.length === 5);
  assert.equal(list.children.length, 5);
  assert.equal(list.children[0], firstCard);
  assert.equal(list.children[4], fifthCard);
  assert.equal(moreButton.hidden, false);
  assert.equal(lessButton.hidden, true);
  assert.equal(endMessage.textContent, "");
});

test("home page does not show login error when public animal list returns unauthorized", async () => {
  const list = new TestElement("div");
  const feedback = new TestElement("p");
  const toolbar = new TestElement("form");
  const search = new TestElement("input");
  const statusFilter = new TestElement("select");
  const speciesFilter = new TestElement("select");
  const sizeFilter = new TestElement("select");
  const ageFilter = new TestElement("select");
  const moreButton = new TestElement("button");
  const lessButton = new TestElement("button");
  const endMessage = new TestElement("p");

  const elements = new Map([
    ["#animais-preview", list],
    ["#home-feedback", feedback],
    [".animal-toolbar", toolbar],
    ["#animal-search", search],
    ["#animal-status-filter", statusFilter],
    ["#animal-species-filter", speciesFilter],
    ["#animal-size-filter", sizeFilter],
    ["#animal-age-filter", ageFilter],
    [".more-button", moreButton],
    [".less-button", lessButton],
    ["#animais-end-message", endMessage],
  ]);

  globalThis.document = createDocumentMock(elements);
  globalThis.window = {
    setTimeout(callback) {
      return setTimeout(callback, 0);
    },
  };
  globalThis.fetch = async (url) => {
    assert.equal(url, "http://localhost:8080/animais");
    return {
      ok: false,
      status: 401,
      async text() {
        return "";
      },
    };
  };

  await import(`../js/pages/index.js?test=${Date.now()}-unauthorized`);
  await waitFor(() => feedback.textContent === "Nao foi possivel carregar a lista de animais. Essa lista e publica.");

  assert.notEqual(feedback.textContent, "CPF ou senha invalidos");
});

test("recommended page does not fetch or render animals without a signed-in adopter", async () => {
  const list = new TestElement("div");
  const feedback = new TestElement("p");
  const elements = new Map([
    ["#recomendados-list", list],
    ["#recomendados-feedback", feedback],
  ]);
  let fetchCalled = false;

  globalThis.document = createDocumentMock(elements);
  globalThis.sessionStorage = storageMock();
  globalThis.localStorage = storageMock();
  globalThis.window = {
    location: {
      href: "recomendados.html",
    },
  };
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Recommended animals should not be requested without login");
  };

  try {
    await import(`../js/pages/recomendados.js?test=${Date.now()}-guest`);
    await waitFor(() => globalThis.window.location.href === "index.html?login=required");

    assert.equal(fetchCalled, false);
    assert.equal(list.children.length, 0);
    assert.equal(feedback.textContent, "");
    assert.equal(globalThis.sessionStorage.getItem("adotapet.loginOnHome"), "1");
  } finally {
    delete globalThis.document;
    delete globalThis.sessionStorage;
    delete globalThis.localStorage;
    delete globalThis.window;
    delete globalThis.fetch;
  }
});
