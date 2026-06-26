package com.adotapet.backend.dto;

import jakarta.validation.constraints.NotNull;

public record SolicitacaoCancelamentoRequest(@NotNull Integer adotanteId) {
}
