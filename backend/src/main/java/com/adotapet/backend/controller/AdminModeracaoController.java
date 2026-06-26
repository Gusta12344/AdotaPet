package com.adotapet.backend.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.adotapet.backend.dto.ModeracaoAnimalFilaResponse;
import com.adotapet.backend.dto.ModeracaoChecklistRequest;
import com.adotapet.backend.dto.ModeracaoDecisaoRequest;
import com.adotapet.backend.dto.ModeracaoDecisaoResponse;
import com.adotapet.backend.dto.ModeracaoFinalizacaoRequest;
import com.adotapet.backend.dto.ModeracaoReversaoFinalizacaoRequest;
import com.adotapet.backend.dto.ModeracaoResumoResponse;
import com.adotapet.backend.dto.ModeracaoSolicitacaoDetalheResponse;
import com.adotapet.backend.dto.ModeracaoSolicitacaoPageResponse;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtencao;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.service.ModeracaoAdocaoService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/admin/moderacao")
public class AdminModeracaoController {

    private final ModeracaoAdocaoService moderacaoService;

    public AdminModeracaoController(ModeracaoAdocaoService moderacaoService) {
        this.moderacaoService = moderacaoService;
    }

    @GetMapping("/resumo")
    public ModeracaoResumoResponse resumo() {
        return moderacaoService.resumo();
    }

    @GetMapping("/solicitacoes")
    public List<ModeracaoAnimalFilaResponse> solicitacoes(
            @RequestParam(required = false) StatusSolicitacao status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "mais_antigas") String ordem) {
        return moderacaoService.listarFila(status, q, ordem);
    }

    @GetMapping("/solicitacoes/lista")
    public ModeracaoSolicitacaoPageResponse solicitacoesLista(
            @RequestParam(required = false) StatusSolicitacao status,
            @RequestParam(required = false) NivelAtencao atencao,
            @RequestParam(required = false) Especie especie,
            @RequestParam(required = false) String perfil,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "atencao") String ordem,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho) {
        return moderacaoService.listarSolicitacoes(status, atencao, especie, perfil, q, ordem, pagina, tamanho);
    }

    @GetMapping("/solicitacoes/{id}")
    public ModeracaoSolicitacaoDetalheResponse detalhe(@PathVariable Integer id) {
        return moderacaoService.detalhe(id);
    }

    @PostMapping("/solicitacoes/{id}/analise")
    public ModeracaoSolicitacaoDetalheResponse iniciarAnalise(@PathVariable Integer id, Authentication authentication) {
        return moderacaoService.iniciarAnalise(id, authentication.getName());
    }

    @PutMapping("/solicitacoes/{id}/checklist")
    public ModeracaoSolicitacaoDetalheResponse salvarChecklist(@PathVariable Integer id,
            Authentication authentication, @Valid @RequestBody ModeracaoChecklistRequest request) {
        return moderacaoService.salvarChecklist(id, authentication.getName(), request);
    }

    @PostMapping("/solicitacoes/{id}/decisao")
    public ModeracaoDecisaoResponse decidir(@PathVariable Integer id, Authentication authentication,
            @Valid @RequestBody ModeracaoDecisaoRequest request) {
        return moderacaoService.decidir(id, authentication.getName(), request);
    }

    @PostMapping("/solicitacoes/{id}/finalizacao")
    public ModeracaoDecisaoResponse finalizar(@PathVariable Integer id, Authentication authentication,
            @Valid @RequestBody ModeracaoFinalizacaoRequest request) {
        return moderacaoService.finalizar(id, authentication.getName(), request);
    }

    @PostMapping("/solicitacoes/{id}/reversao-finalizacao")
    public ModeracaoDecisaoResponse reverterFinalizacao(@PathVariable Integer id, Authentication authentication,
            @Valid @RequestBody ModeracaoReversaoFinalizacaoRequest request) {
        return moderacaoService.reverterFinalizacao(id, authentication.getName(), request);
    }

    @DeleteMapping("/solicitacoes/{id}")
    public ResponseEntity<Void> excluirSolicitacao(@PathVariable Integer id) {
        moderacaoService.excluirSolicitacao(id);
        return ResponseEntity.noContent().build();
    }
}
