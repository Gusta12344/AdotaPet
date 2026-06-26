package com.adotapet.backend.service;

import java.time.LocalDateTime;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AdocaoFinalizadaCleanupJob {

    private final AnimalService animalService;

    public AdocaoFinalizadaCleanupJob(AnimalService animalService) {
        this.animalService = animalService;
    }

    @Scheduled(cron = "0 0 3 * * *")
    public void excluirAnimaisFinalizadosVencidos() {
        animalService.excluirAnimaisComExclusaoAgendada(LocalDateTime.now());
    }
}
