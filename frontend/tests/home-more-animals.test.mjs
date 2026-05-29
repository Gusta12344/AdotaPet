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

function animal(id) {
  return {
    id,
    nome: `Animal ${id}`,
    especie: id % 2 === 0 ? "cao" : "gato",
    porte: "pequeno",
    idadeMeses: 18,
    nivelEnergia: "medio",
    status: "disponivel",
    bomComAnimais: true,
    precisaEspaco: false,
    imagemUrls: [`/uploads/animais/animal-${id}.jpg`],
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
