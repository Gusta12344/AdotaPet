package com.adotapet.backend.dto;

import java.time.LocalDate;

import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Sexo;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AnimalRequest(
        @NotBlank String nome,
        @NotNull Especie especie,
        String raca,
        @NotNull @Min(0) Integer idadeMeses,
        @NotNull Porte porte,
        @NotNull Sexo sexo,
        @NotNull LocalDate dataResgate,
        @NotNull NivelEnergia nivelEnergia,
        boolean bomComCriancas,
        boolean bomComCaes,
        boolean bomComGatos,
        boolean precisaEspaco,
        boolean microchip,
        boolean castrado,
        boolean vermifugado,
        boolean vacinado,
        String descricao,
        @NotNull Integer protetorId
) {
}
