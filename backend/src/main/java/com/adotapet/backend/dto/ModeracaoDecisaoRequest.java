package com.adotapet.backend.dto;

import com.adotapet.backend.model.StatusSolicitacao;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ModeracaoDecisaoRequest(
        @NotNull StatusSolicitacao status,
        @NotNull Boolean dadosAdotanteConferidos,
        @NotNull Boolean animalDisponivelConferido,
        @NotNull Boolean contatoRevisado,
        @Size(max = 500) String observacaoAdmin
) {
}
