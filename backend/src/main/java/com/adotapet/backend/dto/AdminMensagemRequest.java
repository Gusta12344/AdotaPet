package com.adotapet.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminMensagemRequest(
        @NotNull Integer adotanteId,
        @NotBlank String titulo,
        @NotBlank String mensagem
) {
}
