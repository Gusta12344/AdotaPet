package com.adotapet.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.adotapet.backend.dto.AdminMensagemRequest;
import com.adotapet.backend.dto.AdminMensagemResumoResponse;
import com.adotapet.backend.dto.AdminOverviewResponse;
import com.adotapet.backend.dto.AdminRelatorioResponse;
import com.adotapet.backend.dto.AdminUsuarioCreateRequest;
import com.adotapet.backend.dto.AdminUsuarioResponse;
import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.dto.NotificacaoResponse;
import com.adotapet.backend.service.AdminAreaService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/admin")
public class AdminAreaController {

    private final AdminAreaService adminAreaService;

    public AdminAreaController(AdminAreaService adminAreaService) {
        this.adminAreaService = adminAreaService;
    }

    @GetMapping("/resumo")
    public AdminOverviewResponse resumo() {
        return adminAreaService.resumo();
    }

    @GetMapping("/animais")
    public List<AnimalResponse> animais() {
        return adminAreaService.listarAnimais();
    }

    @GetMapping("/usuarios")
    public List<AdminUsuarioResponse> usuarios() {
        return adminAreaService.listarUsuarios();
    }

    @PostMapping("/usuarios")
    public ResponseEntity<AdminUsuarioResponse> cadastrarUsuario(@Valid @RequestBody AdminUsuarioCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminAreaService.cadastrarUsuario(request));
    }

    @PostMapping("/usuarios/{id}/promover")
    public AdminUsuarioResponse promoverUsuario(@PathVariable Integer id) {
        return adminAreaService.promoverUsuario(id);
    }

    @PostMapping("/mensagens")
    public ResponseEntity<NotificacaoResponse> enviarMensagem(@Valid @RequestBody AdminMensagemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminAreaService.enviarMensagem(request));
    }

    @GetMapping("/mensagens/nao-lidas")
    public List<AdminMensagemResumoResponse> mensagensNaoLidas() {
        return adminAreaService.listarMensagensNaoLidas();
    }

    @GetMapping("/relatorios")
    public AdminRelatorioResponse relatorio(@RequestParam(defaultValue = "csv") String formato) {
        return adminAreaService.gerarRelatorio(formato);
    }
}
