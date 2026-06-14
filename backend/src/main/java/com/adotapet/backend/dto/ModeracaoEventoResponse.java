package com.adotapet.backend.dto;

import java.time.LocalDateTime;

import com.adotapet.backend.model.TipoEventoModeracao;

public record ModeracaoEventoResponse(
        Integer id,
        TipoEventoModeracao tipo,
        String titulo,
        String descricao,
        LocalDateTime dataEvento,
        String adminNome
) {
}
