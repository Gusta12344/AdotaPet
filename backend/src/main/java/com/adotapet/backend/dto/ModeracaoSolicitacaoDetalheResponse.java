package com.adotapet.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.adotapet.backend.model.StatusSolicitacao;

public record ModeracaoSolicitacaoDetalheResponse(
        Integer id,
        StatusSolicitacao status,
        LocalDateTime dataSolicitacao,
        LocalDateTime dataInicioAnalise,
        LocalDateTime dataDecisao,
        LocalDateTime dataFinalizacao,
        int posicaoFila,
        int totalAtivasAnimal,
        boolean podeAprovar,
        boolean podeReverterFinalizacao,
        ModeracaoAnimalDetalheResponse animal,
        ModeracaoAdotanteDetalheResponse adotante,
        ModeracaoChecklistResponse checklist,
        String observacaoAdmin,
        List<ModeracaoEventoResponse> eventos
) {
}
