package com.adotapet.backend.dto;

import com.adotapet.backend.model.Admin;

public record AdminResponse(
        Integer id,
        String nome,
        String cpf,
        String email
) {
    public static AdminResponse fromEntity(Admin admin) {
        return new AdminResponse(
                admin.getId(),
                admin.getNome(),
                admin.getCpf(),
                admin.getEmail()
        );
    }
}
