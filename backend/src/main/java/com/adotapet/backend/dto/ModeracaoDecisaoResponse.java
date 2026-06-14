package com.adotapet.backend.dto;

public record ModeracaoDecisaoResponse(
        ModeracaoSolicitacaoDetalheResponse solicitacao,
        int solicitacoesRecusadasAutomaticamente,
        String mensagem
) {
}
