package com.adotapet.backend.dto;

import com.adotapet.backend.model.TipoFinalizacaoAdocao;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ModeracaoFinalizacaoRequest(
        @NotNull TipoFinalizacaoAdocao resultado,
        @Size(max = 500) String observacaoAdmin
) {
}
