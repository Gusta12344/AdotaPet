import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDecisaoPayload,
  buildReversaoFinalizacaoPayload,
  canApproveSolicitacao,
  normalizeModeracaoFilters,
} from "../js/admin-moderacao-state.js";
import {
  canDeleteSolicitacao,
  groupRequestsByAnimal,
  getAnimatedDropdownTransition,
  getRequestReviewFlow,
} from "../js/admin-solicitacoes-state.js";

test("groupRequestsByAnimal agrupa solicitacoes por animal sem mutar a lista original", () => {
  const requests = [
    {
      id: 10,
      animalId: 3,
      animalNome: "Luna",
      especie: "cao",
      imagemUrl: "/uploads/luna.jpg",
      animalResumo: "SRD - 2 anos",
      totalAtivas: 2,
      adotanteNome: "Ana Paula",
      dataSolicitacao: "2026-06-01T10:00:00",
      posicaoFila: 1,
      podeAprovar: true,
      nivelAtencao: "alta",
    },
    {
      id: 11,
      animalId: 3,
      animalNome: "Luna",
      especie: "cao",
      animalResumo: "SRD - 2 anos",
      totalAtivas: 2,
      adotanteNome: "Bruno Lima",
      dataSolicitacao: "2026-06-02T10:00:00",
      posicaoFila: 2,
      podeAprovar: false,
      nivelAtencao: "media",
    },
    {
      id: 12,
      animalId: 8,
      animalNome: "Milo",
      especie: "gato",
      animalResumo: "Adulto",
      totalAtivas: 1,
      adotanteNome: "Carla Rocha",
      dataSolicitacao: "2026-06-03T10:00:00",
      posicaoFila: 1,
      podeAprovar: true,
      nivelAtencao: "baixa",
    },
  ];

  const grouped = groupRequestsByAnimal(requests);

  assert.notEqual(grouped[0].solicitacoes[0], requests[0]);
  assert.deepEqual(grouped.map((group) => group.animalNome), ["Luna", "Milo"]);
  assert.equal(grouped[0].totalSolicitacoes, 2);
  assert.equal(grouped[0].totalAtivas, 2);
  assert.equal(grouped[0].nivelAtencao, "alta");
  assert.deepEqual(grouped[0].solicitacoes.map((request) => request.adotanteNome), ["Ana Paula", "Bruno Lima"]);
  assert.equal(grouped[1].totalSolicitacoes, 1);
  assert.deepEqual(requests.map((request) => request.animalNome), ["Luna", "Luna", "Milo"]);
});

test("getAnimatedDropdownTransition descreve abertura, fechamento e troca fluida", () => {
  assert.deepEqual(getAnimatedDropdownTransition(null, "animal-3"), {
    nextExpandedKey: "animal-3",
    openingKey: "animal-3",
    closingKey: null,
  });

  assert.deepEqual(getAnimatedDropdownTransition("animal-3", "animal-3"), {
    nextExpandedKey: null,
    openingKey: null,
    closingKey: "animal-3",
  });

  assert.deepEqual(getAnimatedDropdownTransition("animal-3", "animal-8"), {
    nextExpandedKey: "animal-8",
    openingKey: "animal-8",
    closingKey: "animal-3",
  });
});

test("getRequestReviewFlow abre confirmacao antes da revisao apenas para pendentes", () => {
  assert.equal(getRequestReviewFlow("pendente"), "start_analysis");
  assert.equal(getRequestReviewFlow("PENDENTE"), "start_analysis");
  assert.equal(getRequestReviewFlow("em_analise"), "review");
  assert.equal(getRequestReviewFlow("aprovada"), "review");
  assert.equal(getRequestReviewFlow("recusada"), "review");
  assert.equal(getRequestReviewFlow(""), "review");
});

test("estado de solicitacoes aceita finalizada e aprova sem depender de checklist", () => {
  assert.equal(normalizeModeracaoFilters({ status: "finalizada" }).status, "finalizada");
  assert.equal(normalizeModeracaoFilters({ status: "cancelada" }).status, "cancelada");
  assert.equal(canApproveSolicitacao({ podeAprovar: true, checklist: {} }), true);
  assert.deepEqual(buildDecisaoPayload("aprovada", { observacaoAdmin: "Pode seguir" }), {
    status: "aprovada",
    observacaoAdmin: "Pode seguir",
  });
  assert.deepEqual(buildReversaoFinalizacaoPayload({ observacaoAdmin: "  Voltou no quinto dia. " }), {
    observacaoAdmin: "Voltou no quinto dia.",
  });
});

test("canDeleteSolicitacao permite exclusao apenas apos encerramento", () => {
  assert.equal(canDeleteSolicitacao({ status: "finalizada" }), true);
  assert.equal(canDeleteSolicitacao({ status: "cancelada" }), true);
  assert.equal(canDeleteSolicitacao({ status: "FINALIZADA" }), true);
  assert.equal(canDeleteSolicitacao({ status: "recusada" }), false);
  assert.equal(canDeleteSolicitacao({ status: "aprovada" }), false);
  assert.equal(canDeleteSolicitacao({ status: "pendente" }), false);
  assert.equal(canDeleteSolicitacao({ status: "em_analise" }), false);
});
