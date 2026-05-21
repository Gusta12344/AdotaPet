package com.adotapet.backend.dto;

import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AnimalRequest(
        @NotBlank String nome,
        @NotNull Especie especie,
        String raca,
        @NotNull @Min(0) Integer idadeMeses,
        @NotNull Porte porte,
        @NotNull NivelEnergia nivelEnergia,
        boolean bomComCriancas,
        boolean bomComAnimais,
        boolean precisaEspaco,
        String descricao,
        @NotNull Integer protetorId
) {
}
