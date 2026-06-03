package com.adotapet.backend.dto;

import java.time.LocalDateTime;

import com.adotapet.backend.model.Notificacao;
import com.adotapet.backend.model.TipoNotificacao;

public record NotificacaoResponse(
        Integer id,
        TipoNotificacao tipo,
        String titulo,
        String mensagem,
        boolean lida,
        LocalDateTime dataCriacao,
        String referenciaTipo,
        Integer referenciaId
) {
    public static NotificacaoResponse fromEntity(Notificacao notificacao) {
        return new NotificacaoResponse(
                notificacao.getId(),
                notificacao.getTipo(),
                notificacao.getTitulo(),
                notificacao.getMensagem(),
                notificacao.isLida(),
                notificacao.getDataCriacao(),
                notificacao.getReferenciaTipo(),
                notificacao.getReferenciaId()
        );
    }
}
