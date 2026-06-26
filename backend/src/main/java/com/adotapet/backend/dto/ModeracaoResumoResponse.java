package com.adotapet.backend.dto;

public record ModeracaoResumoResponse(
        long pendentes,
        long emAnalise,
        long aprovadas,
        long recusadas,
        long finalizadas,
        long aprovadasHoje
) {
}
