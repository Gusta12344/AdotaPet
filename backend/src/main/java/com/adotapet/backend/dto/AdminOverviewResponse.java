package com.adotapet.backend.dto;

public record AdminOverviewResponse(
        long totalAnimais,
        long animaisDisponiveis,
        long animaisEmAnalise,
        long animaisAdotados,
        long totalUsuarios,
        long totalAdministradores,
        long solicitacoesPendentes,
        long solicitacoesEmAnalise,
        long solicitacoesAprovadas,
        long solicitacoesRecusadas,
        long relatoriosGerados
) {
}
