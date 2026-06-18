package com.adotapet.backend.dto;

import java.time.LocalDateTime;

import com.adotapet.backend.model.Notificacao;
import com.adotapet.backend.model.TipoNotificacao;

public record AdminMensagemResumoResponse(
        Integer id,
        TipoNotificacao tipo,
        String titulo,
        String mensagem,
        boolean lida,
        LocalDateTime dataCriacao,
        Integer adotanteId,
        String adotanteNome
) {
    public static AdminMensagemResumoResponse fromEntity(Notificacao notificacao) {
        return new AdminMensagemResumoResponse(
                notificacao.getId(),
                notificacao.getTipo(),
                notificacao.getTitulo(),
                notificacao.getMensagem(),
                notificacao.isLida(),
                notificacao.getDataCriacao(),
                notificacao.getAdotante().getId(),
                notificacao.getAdotante().getNome()
        );
    }
}
