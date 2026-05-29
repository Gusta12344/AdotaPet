package com.adotapet.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String cpf,
        @NotBlank String senha
) {
}
