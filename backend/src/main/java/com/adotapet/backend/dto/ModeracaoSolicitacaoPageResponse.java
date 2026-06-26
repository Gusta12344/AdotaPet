package com.adotapet.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ModeracaoSolicitacaoPageResponse(
        List<ModeracaoSolicitacaoListaResponse> itens,
        int pagina,
        int tamanho,
        long totalItens,
        int totalPaginas,
        boolean primeira,
        boolean ultima,
        long altaAtencao,
        long mediaAtencao,
        long baixaAtencao,
        long animaisComFila,
        long aguardandoDecisao,
        LocalDateTime atualizadoEm
) {
}
