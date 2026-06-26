package com.adotapet.backend.dto;

import com.adotapet.backend.model.StatusSolicitacao;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ModeracaoDecisaoRequest(
        @NotNull StatusSolicitacao status,
        @Size(max = 500) String observacaoAdmin
) {
    public ModeracaoDecisaoRequest(StatusSolicitacao status, Boolean dadosAdotanteConferidos,
            Boolean animalDisponivelConferido, Boolean contatoRevisado, String observacaoAdmin) {
        this(status, observacaoAdmin);
    }
}
