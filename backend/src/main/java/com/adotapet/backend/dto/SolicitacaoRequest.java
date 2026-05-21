package com.adotapet.backend.dto;

import jakarta.validation.constraints.NotNull;

public record SolicitacaoRequest(
        @NotNull Integer animalId,
        @NotNull Integer adotanteId
) {
}
