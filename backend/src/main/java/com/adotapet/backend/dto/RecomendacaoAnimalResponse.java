package com.adotapet.backend.dto;

public record RecomendacaoAnimalResponse(
        AnimalResponse animal,
        int score
) {
}
