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

import com.adotapet.backend.dto.SolicitacaoRequest;
import com.adotapet.backend.dto.SolicitacaoResponse;
import com.adotapet.backend.dto.SolicitacaoStatusRequest;
import com.adotapet.backend.service.SolicitacaoAdocaoService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/adocoes")
public class SolicitacaoAdocaoController {

    private final SolicitacaoAdocaoService solicitacaoService;

    public SolicitacaoAdocaoController(SolicitacaoAdocaoService solicitacaoService) {
        this.solicitacaoService = solicitacaoService;
    }

    @PostMapping
    public ResponseEntity<SolicitacaoResponse> criar(@Valid @RequestBody SolicitacaoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(solicitacaoService.criar(request));
    }

    @GetMapping
    public List<SolicitacaoResponse> listarFila() {
        return solicitacaoService.listarFilaPendente();
    }

    @GetMapping("/adotantes/{adotanteId}")
    public List<SolicitacaoResponse> listarPorAdotante(@PathVariable Integer adotanteId) {
        return solicitacaoService.listarPorAdotante(adotanteId);
    }

    @PutMapping("/{id}")
    public SolicitacaoResponse atualizarStatus(@PathVariable Integer id,
            @Valid @RequestBody SolicitacaoStatusRequest request) {
        return solicitacaoService.atualizarStatus(id, request.status());
    }
}
