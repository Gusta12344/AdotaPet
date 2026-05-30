package com.adotapet.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.model.StatusAnimal;

public record AnimalResponse(
        Integer id,
        String nome,
        Especie especie,
        String raca,
        Integer idadeMeses,
        Porte porte,
        Sexo sexo,
        LocalDate dataResgate,
        NivelEnergia nivelEnergia,
        boolean bomComCriancas,
        boolean bomComAnimais,
        boolean precisaEspaco,
        boolean microchip,
        boolean castrado,
        boolean vermifugado,
        boolean vacinado,
        String descricao,
        StatusAnimal status,
        LocalDateTime dataCadastro,
        Integer protetorId,
        String protetorNome,
        List<String> imagemUrls
) {
    public static AnimalResponse fromEntity(Animal animal) {
        return new AnimalResponse(
                animal.getId(),
                animal.getNome(),
                animal.getEspecie(),
                animal.getRaca(),
                animal.getIdadeMeses(),
                animal.getPorte(),
                animal.getSexo(),
                animal.getDataResgate(),
                animal.getNivelEnergia(),
                animal.isBomComCriancas(),
                animal.isBomComAnimais(),
                animal.isPrecisaEspaco(),
                animal.isMicrochip(),
                animal.isCastrado(),
                animal.isVermifugado(),
                animal.isVacinado(),
                animal.getDescricao(),
                animal.getStatus(),
                animal.getDataCadastro(),
                animal.getProtetor().getId(),
                animal.getProtetor().getNome(),
                animal.getImagens()
                        .stream()
                        .map(imagem -> imagem.getUrl())
                        .toList()
        );
    }
}
