package com.adotapet.backend.dto;

import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.TipoMoradia;

public record ModeracaoAdotanteDetalheResponse(
        Integer id,
        String nome,
        String email,
        String telefone,
        String endereco,
        TipoMoradia tipoMoradia,
        boolean temCriancas,
        boolean temOutrosAnimais,
        NivelAtividade nivelAtividade,
        Porte preferenciaPorte,
        Especie preferenciaEspecie
) {
}
