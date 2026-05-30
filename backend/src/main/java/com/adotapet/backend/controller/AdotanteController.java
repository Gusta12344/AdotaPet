package com.adotapet.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.adotapet.backend.dto.AdotanteRequest;
import com.adotapet.backend.dto.AdotanteResponse;
import com.adotapet.backend.dto.AdotanteUpdateRequest;
import com.adotapet.backend.service.AdotanteService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/adotantes")
public class AdotanteController {

    private final AdotanteService adotanteService;

    public AdotanteController(AdotanteService adotanteService) {
        this.adotanteService = adotanteService;
    }

    @PostMapping
    public ResponseEntity<AdotanteResponse> cadastrar(@Valid @RequestBody AdotanteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adotanteService.cadastrar(request));
    }

    @PutMapping("/{id}")
    public AdotanteResponse atualizar(@PathVariable Integer id, @Valid @RequestBody AdotanteUpdateRequest request) {
        return adotanteService.atualizar(id, request);
    }
}
