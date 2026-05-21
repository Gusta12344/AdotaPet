package com.adotapet.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.adotapet.backend.dto.AnimalRequest;
import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.dto.AnimalStatusRequest;
import com.adotapet.backend.dto.RecomendacaoAnimalResponse;
import com.adotapet.backend.service.AnimalService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/animais")
public class AnimalController {

    private final AnimalService animalService;

    public AnimalController(AnimalService animalService) {
        this.animalService = animalService;
    }

    @GetMapping
    public List<AnimalResponse> listarDisponiveis() {
        return animalService.listarDisponiveis();
    }

    @GetMapping("/{id}")
    public AnimalResponse buscarPorId(@PathVariable Integer id) {
        return animalService.buscarPorId(id);
    }

    @GetMapping("/recomendados/{adotanteId}")
    public List<RecomendacaoAnimalResponse> recomendar(@PathVariable Integer adotanteId) {
        return animalService.recomendarParaAdotante(adotanteId);
    }

    @PostMapping
    public ResponseEntity<AnimalResponse> cadastrar(@Valid @RequestBody AnimalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(animalService.cadastrar(request));
    }

    @PutMapping("/{id}/status")
    public AnimalResponse atualizarStatus(@PathVariable Integer id, @Valid @RequestBody AnimalStatusRequest request) {
        return animalService.atualizarStatus(id, request.status());
    }
}
