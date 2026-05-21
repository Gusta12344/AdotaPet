package com.adotapet.backend.dto;

import com.adotapet.backend.model.StatusAnimal;

import jakarta.validation.constraints.NotNull;

public record AnimalStatusRequest(@NotNull StatusAnimal status) {
}
