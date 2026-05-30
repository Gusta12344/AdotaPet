package com.adotapet.backend.dto;

import java.time.LocalDateTime;

import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.TipoMoradia;

public record AdotanteResponse(
        Integer id,
        String nome,
        String cpf,
        String email,
        String telefone,
        String endereco,
        TipoMoradia tipoMoradia,
        boolean temCriancas,
        boolean temOutrosAnimais,
        NivelAtividade nivelAtividade,
        Porte preferenciaPorte,
        Especie preferenciaEspecie,
        LocalDateTime dataCadastro
) {
    public static AdotanteResponse fromEntity(Adotante adotante) {
        return new AdotanteResponse(
                adotante.getId(),
                adotante.getNome(),
                adotante.getCpf(),
                adotante.getEmail(),
                adotante.getTelefone(),
                adotante.getEndereco(),
                adotante.getTipoMoradia(),
                adotante.isTemCriancas(),
                adotante.isTemOutrosAnimais(),
                adotante.getNivelAtividade(),
                adotante.getPreferenciaPorte(),
                adotante.getPreferenciaEspecie(),
                adotante.getDataCadastro()
        );
    }
}
