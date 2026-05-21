package com.adotapet.backend.dto;

import com.adotapet.backend.model.StatusSolicitacao;

import jakarta.validation.constraints.NotNull;

public record SolicitacaoStatusRequest(@NotNull StatusSolicitacao status) {
}
