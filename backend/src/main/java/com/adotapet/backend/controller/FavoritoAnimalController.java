package com.adotapet.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.service.FavoritoAnimalService;

@RestController
@RequestMapping("/adotantes/{adotanteId}/favoritos")
public class FavoritoAnimalController {

    private final FavoritoAnimalService favoritoAnimalService;

    public FavoritoAnimalController(FavoritoAnimalService favoritoAnimalService) {
        this.favoritoAnimalService = favoritoAnimalService;
    }

    @GetMapping
    public List<AnimalResponse> listar(@PathVariable Integer adotanteId) {
        return favoritoAnimalService.listar(adotanteId);
    }

    @PostMapping("/{animalId}")
    public ResponseEntity<AnimalResponse> favoritar(@PathVariable Integer adotanteId, @PathVariable Integer animalId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(favoritoAnimalService.favoritar(adotanteId, animalId));
    }

    @DeleteMapping("/{animalId}")
    public ResponseEntity<Void> remover(@PathVariable Integer adotanteId, @PathVariable Integer animalId) {
        favoritoAnimalService.remover(adotanteId, animalId);
        return ResponseEntity.noContent().build();
    }
}
