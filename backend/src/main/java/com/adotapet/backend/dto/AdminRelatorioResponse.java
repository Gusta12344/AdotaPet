package com.adotapet.backend.dto;

import java.time.LocalDateTime;

public record AdminRelatorioResponse(
        String formato,
        String mimeType,
        String filename,
        String conteudo,
        LocalDateTime geradoEm
) {
}
