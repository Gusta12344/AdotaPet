package com.adotapet.backend.dto;

public record LoginResponse(
        boolean autenticado,
        String tipo,
        Integer id,
        String nome,
        String cpf,
        String email,
        String telefone,
        String endereco,
        String tipoMoradia,
        boolean temCriancas,
        boolean temOutrosAnimais,
        String nivelAtividade,
        String preferenciaPorte,
        String preferenciaEspecie,
        String mensagem
) {
}
