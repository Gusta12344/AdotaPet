package com.adotapet.backend.dto;

public record LoginResponse(
        boolean autenticado,
        String tipo,
        Integer id,
        String nome,
        String cpf,
        String email,
        String mensagem
) {
}
