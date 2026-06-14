package com.adotapet.backend.dto;

import java.time.LocalDateTime;

import com.adotapet.backend.model.StatusSolicitacao;

public record ModeracaoSolicitacaoFilaResponse(
        Integer id,
        StatusSolicitacao status,
        String adotanteNome,
        String adotanteEmail,
        LocalDateTime dataSolicitacao,
        int posicaoFila,
        boolean podeAprovar
) {
}
