package com.adotapet.backend.dto;

import java.time.LocalDateTime;

import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtencao;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;

public record ModeracaoSolicitacaoListaResponse(
        Integer id,
        StatusSolicitacao status,
        LocalDateTime dataSolicitacao,
        Integer animalId,
        String animalNome,
        Especie especie,
        String animalResumo,
        StatusAnimal animalStatus,
        String imagemUrl,
        String adotanteNome,
        String adotanteEmail,
        int posicaoFila,
        int totalAtivas,
        boolean podeAprovar,
        NivelAtencao nivelAtencao,
        String motivoAtencao,
        int diasSolicitacao,
        int diasAnimalDisponivel
) {
}
