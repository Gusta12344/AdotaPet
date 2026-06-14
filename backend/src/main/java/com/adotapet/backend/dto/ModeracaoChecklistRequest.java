package com.adotapet.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ModeracaoChecklistRequest(
        @NotNull Boolean dadosAdotanteConferidos,
        @NotNull Boolean animalDisponivelConferido,
        @NotNull Boolean contatoRevisado,
        @Size(max = 500) String observacaoAdmin
) {
}
