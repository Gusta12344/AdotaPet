import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildChecklistPayload,
  buildDecisaoPayload,
  canApproveSolicitacao,
  normalizeModeracaoFilters,
  selectFirstSolicitacao,
  syncQueueAnimalImage,
} from "../js/admin-moderacao-state.js";
import {
  fetchModeracaoFila,
  fetchModeracaoSolicitacoesLista,
} from "../js/admin-moderacao-api.js";
import {
  renderModeracaoDecision,
  renderModeracaoDetail,
  renderModeracaoQueue,
} from "../js/admin-moderacao-render.js";

class TestElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.className = "";
    this.textContent = "";
    this.listeners = new Map();
    this.hidden = false;
    this.value = "";
  }

  append(...children) {
    for (const child of children) {
      if (child && typeof child === "object") {
        child.parentNode = this;
      }
      this.children.push(child);
    }
  }

  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
  }

  get firstChild() {
    return this.children[0] || null;
  }

  set src(value) {
    this.setAttribute("src", value);
  }

  get src() {
    return this.getAttribute("src") || "";
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "hidden") {
      this.hidden = true;
    }
    if (name === "name") {
      this.name = String(value);
    }
    if (name === "checked") {
      this.checked = true;
    }
    if (name === "disabled") {
      this.disabled = true;
    }
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  querySelector(selector) {
    return findAllBySelector(this, selector)[0] || null;
  }

  querySelectorAll(selector) {
    return findAllBySelector(this, selector);
  }
}

function documentMock() {
  return {
    createElement(tagName) {
      return new TestElement(tagName);
    },
    createElementNS(_namespace, tagName) {
      return new TestElement(tagName);
    },
  };
}

function withDocument(callback) {
  const previous = globalThis.document;
  globalThis.document = documentMock();
  try {
    return callback();
  } finally {
    globalThis.document = previous;
  }
}

async function flushImageUpdates() {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
}

async function withFetchDisabled(callback) {
  const previous = globalThis.fetch;
  globalThis.fetch = undefined;
  try {
    return await callback();
  } finally {
    globalThis.fetch = previous;
  }
}

async function withFetchMock(fetchImpl, callback) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await callback();
  } finally {
    globalThis.fetch = previous;
  }
}

function textTree(node) {
  if (!node || typeof node === "string") {
    return String(node || "");
  }
  return `${node.textContent || ""}${(node.children || []).map(textTree).join("")}`;
}

function findAllBySelector(node, selector, matches = []) {
  if (!node || typeof node === "string") {
    return matches;
  }
  if (selector.startsWith(".") && String(node.className || "").split(/\s+/).includes(selector.slice(1))) {
    matches.push(node);
  }
  const dataAttr = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
  if (dataAttr && Object.prototype.hasOwnProperty.call(node.attributes, dataAttr[1])) {
    if (dataAttr[2] === undefined || node.attributes[dataAttr[1]] === dataAttr[2]) {
      matches.push(node);
    }
  }
  for (const child of node.children || []) {
    findAllBySelector(child, selector, matches);
  }
  return matches;
}

const gruposFixture = [{
  animalId: 3,
  animalNome: "Luna",
  especie: "cao",
  animalResumo: "SRD - 2 anos - femea",
  animalStatus: "em_analise",
  imagemUrl: "/uploads/animais/luna.jpg",
  totalAtivas: 2,
  solicitacoes: [{
    id: 12,
    status: "pendente",
    adotanteNome: "Lucas Martins",
    adotanteEmail: "lucas@email.com",
    dataSolicitacao: "2026-06-07T09:15:00",
    posicaoFila: 1,
    podeAprovar: true,
  }],
}];

const detalheFixture = {
  id: 12,
  status: "em_analise",
  dataSolicitacao: "2026-06-07T09:15:00",
  posicaoFila: 1,
  podeAprovar: true,
  animal: {
    id: 3,
    nome: "Luna",
    especie: "cao",
    raca: "SRD",
    idadeMeses: 24,
    sexo: "femea",
    porte: "medio",
    status: "em_analise",
    imagemUrl: "/uploads/animais/luna.jpg",
  },
  adotante: {
    nome: "Lucas Martins",
    email: "lucas@email.com",
    telefone: "(11) 98765-4321",
    endereco: "Sao Paulo, SP",
    tipoMoradia: "casa_com_quintal",
    temCriancas: false,
    temOutrosAnimais: true,
  },
  checklist: {
    dadosAdotanteConferidos: true,
    animalDisponivelConferido: true,
    contatoRevisado: true,
  },
  eventos: [{
    tipo: "solicitacao_enviada",
    titulo: "Solicitacao enviada",
    dataEvento: "2026-06-07T09:15:00",
    descricao: "Solicitacao enviada pelo adotante.",
  }],
};

test("normalizeModeracaoFilters aplica defaults seguros", () => {
  assert.deepEqual(normalizeModeracaoFilters({ status: "x", ordem: "y", q: "  luna  " }), {
    status: "pendente",
    ordem: "mais_antigas",
    q: "luna",
  });
});

test("normalizeModeracaoFilters permite listar todas as solicitacoes", () => {
  assert.deepEqual(normalizeModeracaoFilters({ status: "", ordem: "mais_recentes", q: "" }), {
    status: "",
    ordem: "mais_recentes",
    q: "",
  });
});

test("selectFirstSolicitacao escolhe a primeira solicitacao do primeiro grupo", () => {
  assert.equal(selectFirstSolicitacao(gruposFixture), 12);
  assert.equal(selectFirstSolicitacao([]), null);
});

test("syncQueueAnimalImage reaproveita imagem do detalhe no grupo selecionado", () => {
  const grupos = [{
    ...gruposFixture[0],
    imagemUrl: "",
    imagemUrls: [],
  }];

  const synced = syncQueueAnimalImage(grupos, {
    animal: {
      id: 3,
      imagemUrl: "/uploads/animais/luna-detalhe.jpg",
    },
  });

  assert.equal(synced[0].imagemUrl, "/uploads/animais/luna-detalhe.jpg");
  assert.deepEqual(synced[0].imagemUrls, ["/uploads/animais/luna-detalhe.jpg"]);
  assert.equal(grupos[0].imagemUrl, "");
});

test("syncQueueAnimalImage reaproveita especie do detalhe mesmo sem imagem cadastrada", () => {
  const grupos = [{
    ...gruposFixture[0],
    especie: undefined,
    imagemUrl: "",
    imagemUrls: [],
  }];

  const synced = syncQueueAnimalImage(grupos, {
    animal: {
      id: 3,
      especie: "cao",
      imagemUrl: null,
    },
  });

  assert.equal(synced[0].especie, "cao");
  assert.equal(synced[0].imagemUrl, "");
  assert.equal(grupos[0].especie, undefined);
});

test("buildChecklistPayload normaliza booleans e observacao", () => {
  assert.deepEqual(buildChecklistPayload({
    dadosAdotanteConferidos: true,
    animalDisponivelConferido: false,
    contatoRevisado: 1,
    observacaoAdmin: "  Contato feito  ",
  }), {
    dadosAdotanteConferidos: true,
    animalDisponivelConferido: false,
    contatoRevisado: true,
    observacaoAdmin: "Contato feito",
  });
});

test("buildDecisaoPayload gera payload esperado", () => {
  assert.deepEqual(buildDecisaoPayload("aprovada", {
    dadosAdotanteConferidos: true,
    animalDisponivelConferido: true,
    contatoRevisado: true,
    observacaoAdmin: "  Pode seguir  ",
  }), {
    status: "aprovada",
    observacaoAdmin: "Pode seguir",
  });
});

test("canApproveSolicitacao depende apenas da permissao da API", () => {
  assert.equal(canApproveSolicitacao(detalheFixture), true);
  assert.equal(canApproveSolicitacao({ ...detalheFixture, podeAprovar: false }), false);
  assert.equal(canApproveSolicitacao({
    ...detalheFixture,
    checklist: { ...detalheFixture.checklist, contatoRevisado: false },
  }), true);
});

test("fetchModeracaoFila usa endpoint administrativo com filtros", async () => {
  const calls = [];
  await fetchModeracaoFila({ status: "pendente", q: "luna", ordem: "mais_antigas" }, {
    async get(path, options) {
      calls.push({ path, options });
      return [];
    },
  });

  assert.equal(calls[0].path, "/admin/moderacao/solicitacoes?status=pendente&q=luna&ordem=mais_antigas");
  assert.equal(calls[0].options.auth, true);
});

test("fetchModeracaoSolicitacoesLista usa endpoint paginado com filtros de atencao", async () => {
  const calls = [];
  await fetchModeracaoSolicitacoesLista({
    status: "pendente",
    atencao: "alta",
    especie: "cao",
    perfil: "com_fila",
    q: "thor",
    ordem: "atencao",
    pagina: 1,
    tamanho: 10,
  }, {
    async get(path, options) {
      calls.push({ path, options });
      return { itens: [] };
    },
  });

  assert.equal(
    calls[0].path,
    "/admin/moderacao/solicitacoes/lista?status=pendente&atencao=alta&especie=cao&perfil=com_fila&q=thor&ordem=atencao&pagina=1&tamanho=10"
  );
  assert.equal(calls[0].options.auth, true);
});

test("renderizacao da fila cria elementos sem innerHTML e mostra posicao", async () => {
  const script = fs.readFileSync("frontend/js/admin-moderacao-render.js", "utf8");
  assert.doesNotMatch(script, /innerHTML/);

  const target = withDocument(() => {
    const node = new TestElement("div");
    renderModeracaoQueue(node, { grupos: gruposFixture, selectedId: 12 });
    return node;
  });

  assert.match(textTree(target), /Luna/);
  assert.match(textTree(target), /Lucas Martins/);
  assert.equal(target.querySelector(".moderation-thumb").tagName, "img");
  await flushImageUpdates();
  assert.equal(target.querySelector(".moderation-thumb").getAttribute("src"), "http://localhost:8080/uploads/animais/luna.jpg");
  assert.match(textTree(target), /1º da fila/);
});

test("renderizacao da fila aceita imagemUrls no mesmo formato das paginas publicas", async () => {
  const target = withDocument(() => {
    const node = new TestElement("div");
    renderModeracaoQueue(node, {
      grupos: [{
        ...gruposFixture[0],
        imagemUrl: "",
        imagemUrls: [" /uploads/animais/luna-publica.jpg "],
      }],
      selectedId: 12,
    });
    return node;
  });

  await flushImageUpdates();
  assert.equal(target.querySelector(".moderation-thumb").getAttribute("src"), "http://localhost:8080/uploads/animais/luna-publica.jpg");
});

test("renderizacao do detalhe mostra animal, adotante e timeline", async () => {
  const target = withDocument(() => {
    const node = new TestElement("section");
    renderModeracaoDetail(node, detalheFixture);
    return node;
  });

  const text = textTree(target);
  assert.match(text, /Luna/);
  assert.match(text, /Lucas Martins/);
  assert.match(text, /Linha do tempo/);
  assert.equal(target.querySelector(".moderation-detail-image").tagName, "img");
  await flushImageUpdates();
  assert.equal(target.querySelector(".moderation-detail-image").getAttribute("src"), "http://localhost:8080/uploads/animais/luna.jpg");
  assert.match(text, /Solicitação enviada/);
});

test("renderizacao da fila e detalhe compartilham fallback resolvido do mesmo animal", async () => {
  let calls = 0;
  const fallbackUrl = "https://images.example.com/thor-fallback.jpg";

  const rendered = await withFetchMock(async () => {
    calls += 1;
    return {
      ok: true,
      async json() {
        return { message: fallbackUrl };
      },
    };
  }, async () => {
    const nodes = withDocument(() => {
      const queue = new TestElement("div");
      const detail = new TestElement("section");
      const grupo = {
        ...gruposFixture[0],
        animalId: 2,
        animalNome: "Thor",
        especie: "cao",
        imagemUrl: "",
        imagemUrls: [],
      };
      const detalhe = {
        ...detalheFixture,
        animal: {
          ...detalheFixture.animal,
          id: 2,
          nome: "Thor",
          especie: "cao",
          imagemUrl: "",
        },
      };

      renderModeracaoQueue(queue, { grupos: [grupo], selectedId: 12 });
      renderModeracaoDetail(detail, detalhe);
      return { queue, detail };
    });
    await flushImageUpdates();
    return nodes;
  });

  assert.equal(calls, 1);
  assert.equal(rendered.queue.querySelector(".moderation-thumb").getAttribute("src"), fallbackUrl);
  assert.equal(rendered.detail.querySelector(".moderation-detail-image").getAttribute("src"), fallbackUrl);
});

test("renderizacao usa fallback compartilhado quando o animal ainda nao tem upload", async () => {
  const target = await withFetchDisabled(async () => {
    const rendered = withDocument(() => {
      const node = new TestElement("div");
      renderModeracaoQueue(node, {
        grupos: [{ ...gruposFixture[0], imagemUrl: "" }],
        selectedId: 12,
      });
      return node;
    });
    await flushImageUpdates();
    return rendered;
  });

  const image = target.querySelector(".moderation-thumb");
  assert.equal(image.tagName, "img");
  assert.equal(image.getAttribute("src"), "assets/adotapet-mark.svg");
  assert.equal(image.getAttribute("alt"), "Foto de Luna");
});

test("painel de decisao permite aprovar mesmo sem checklist completo", () => {
  const target = withDocument(() => {
    const node = new TestElement("aside");
    renderModeracaoDecision(node, {
      ...detalheFixture,
      checklist: { ...detalheFixture.checklist, contatoRevisado: false },
    });
    return node;
  });

  const approveButton = target.querySelector(".moderation-approve-button");
  assert.equal(approveButton.disabled, undefined);
});
