package com.adotapet.backend.dto;

import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.model.StatusAnimal;

public record ModeracaoAnimalDetalheResponse(
        Integer id,
        String nome,
        Especie especie,
        String raca,
        Integer idadeMeses,
        Porte porte,
        Sexo sexo,
        StatusAnimal status,
        String imagemUrl,
        boolean bomComCriancas,
        boolean bomComCaes,
        boolean bomComGatos,
        boolean precisaEspaco,
        boolean castrado,
        boolean vacinado,
        boolean vermifugado
) {
}
