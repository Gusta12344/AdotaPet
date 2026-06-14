package com.adotapet.backend.dto;

import java.util.List;

import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.StatusAnimal;

public record ModeracaoAnimalFilaResponse(
        Integer animalId,
        String animalNome,
        Especie especie,
        String animalResumo,
        StatusAnimal animalStatus,
        String imagemUrl,
        int totalAtivas,
        List<ModeracaoSolicitacaoFilaResponse> solicitacoes
) {
}
