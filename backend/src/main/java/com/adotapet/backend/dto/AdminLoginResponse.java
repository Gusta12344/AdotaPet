package com.adotapet.backend.dto;

public record AdminLoginResponse(
        boolean autenticado,
        Integer adminId,
        String nome,
        String email,
        String mensagem
) {
}
