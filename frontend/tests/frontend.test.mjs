import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdotantePayload,
  buildAnimalFormData,
  buildAnimalPayload,
  validateRequiredFields,
} from "../js/forms.js";
import {
  chooseAnimalImageUrl,
} from "../js/images.js";
import {
  buildBasicAuthHeader,
  readAdminCredentials,
  saveAdminCredentials,
  clearAdminCredentials,
} from "../js/auth.js";
import {
  formatAge,
  formatBoolean,
  formatEnum,
  getScoreLabel,
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

function storageMock() {
  const data = new Map();
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

test("buildAdotantePayload normalizes text, booleans and enum values accepted by the API", () => {
  const payload = buildAdotantePayload(formData([
    ["nome", "  Maria Oliveira  "],
    ["cpf", " 111.111.111-11 "],
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

test("buildAnimalPayload keeps admin-created animals within the API enum contract", () => {
  const payload = buildAnimalPayload(formData([
    ["nome", "Thor"],
    ["especie", "cao"],
    ["raca", ""],
    ["idadeMeses", "36"],
    ["porte", "grande"],
    ["nivelEnergia", "alto"],
    ["bomComCriancas", "on"],
    ["precisaEspaco", "on"],
    ["descricao", " Precisa de quintal. "],
    ["protetorId", "2"],
  ]));

  assert.deepEqual(payload, {
    nome: "Thor",
    especie: "cao",
    raca: "SRD",
    idadeMeses: 36,
    porte: "grande",
    nivelEnergia: "alto",
    bomComCriancas: true,
    bomComAnimais: false,
    precisaEspaco: true,
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
    ["nivelEnergia", "baixo"],
    ["descricao", ""],
    ["protetorId", "1"],
  ], [png, jpg]));

  assert.equal(payload.get("nome"), "Mimi");
  assert.equal(payload.get("raca"), "SRD");
  assert.equal(payload.get("idadeMeses"), "12");
  assert.equal(payload.get("bomComCriancas"), "false");
  assert.equal(payload.getAll("imagens").length, 2);
  assert.equal(payload.getAll("imagens")[0].name, "mimi.png");
  assert.equal(payload.getAll("imagens")[1].name, "mimi.jpg");
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
