package com.adotapet.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.adotapet.backend.dto.NotificacaoResponse;
import com.adotapet.backend.service.NotificacaoService;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/notificacoes")
public class NotificacaoController {

    private final NotificacaoService notificacaoService;

    public NotificacaoController(NotificacaoService notificacaoService) {
        this.notificacaoService = notificacaoService;
    }

    @GetMapping("/adotantes/{adotanteId}")
    public List<NotificacaoResponse> listarPorAdotante(@PathVariable Integer adotanteId) {
        return notificacaoService.listarPorAdotante(adotanteId);
    }

    @PutMapping("/adotantes/{adotanteId}/lidas")
    public List<NotificacaoResponse> marcarTodasComoLidas(@PathVariable Integer adotanteId) {
        return notificacaoService.marcarTodasComoLidas(adotanteId);
    }

    @PutMapping("/{id}/lida")
    public NotificacaoResponse marcarComoLida(@PathVariable Integer id) {
        return notificacaoService.marcarComoLida(id);
    }
}
