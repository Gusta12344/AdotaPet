package com.adotapet.backend.dto;

import java.time.LocalDateTime;

import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.StatusAnimal;

public record AnimalResponse(
        Integer id,
        String nome,
        Especie especie,
        String raca,
        Integer idadeMeses,
        Porte porte,
        NivelEnergia nivelEnergia,
        boolean bomComCriancas,
        boolean bomComAnimais,
        boolean precisaEspaco,
        String descricao,
        StatusAnimal status,
        LocalDateTime dataCadastro,
        Integer protetorId,
        String protetorNome
) {
    public static AnimalResponse fromEntity(Animal animal) {
        return new AnimalResponse(
                animal.getId(),
                animal.getNome(),
                animal.getEspecie(),
                animal.getRaca(),
                animal.getIdadeMeses(),
                animal.getPorte(),
                animal.getNivelEnergia(),
                animal.isBomComCriancas(),
                animal.isBomComAnimais(),
                animal.isPrecisaEspaco(),
                animal.getDescricao(),
                animal.getStatus(),
                animal.getDataCadastro(),
                animal.getProtetor().getId(),
                animal.getProtetor().getNome()
        );
    }
}
