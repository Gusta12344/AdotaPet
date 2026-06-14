package com.adotapet.backend.dto;

public record ModeracaoChecklistResponse(
        boolean dadosAdotanteConferidos,
        boolean animalDisponivelConferido,
        boolean contatoRevisado
) {
}
