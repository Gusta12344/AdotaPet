package com.adotapet.backend.dto;

import java.time.LocalDateTime;

import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;

public record SolicitacaoResponse(
        Integer id,
        LocalDateTime dataSolicitacao,
        StatusSolicitacao status,
        Integer animalId,
        String animalNome,
        StatusAnimal animalStatus,
        Integer adotanteId,
        String adotanteNome,
        String adotanteEmail
) {
    public static SolicitacaoResponse fromEntity(SolicitacaoAdocao solicitacao) {
        return new SolicitacaoResponse(
                solicitacao.getId(),
                solicitacao.getDataSolicitacao(),
                solicitacao.getStatus(),
                solicitacao.getAnimal().getId(),
                solicitacao.getAnimal().getNome(),
                solicitacao.getAnimal().getStatus(),
                solicitacao.getAdotante().getId(),
                solicitacao.getAdotante().getNome(),
                solicitacao.getAdotante().getEmail()
        );
    }
}
