package com.adotapet.backend.dto;

import jakarta.validation.constraints.Size;

public record ModeracaoReversaoFinalizacaoRequest(
        @Size(max = 500) String observacaoAdmin
) {
}
