package com.adotapet.backend.dto;

import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.TipoMoradia;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdotanteRequest(
        @NotBlank String nome,
        @NotBlank String cpf,
        @NotBlank @Email String email,
        @NotBlank String telefone,
        @NotBlank String endereco,
        @NotNull TipoMoradia tipoMoradia,
        boolean temCriancas,
        boolean temOutrosAnimais,
        @NotNull NivelAtividade nivelAtividade,
        @NotNull Porte preferenciaPorte,
        @NotNull Especie preferenciaEspecie
) {
}
