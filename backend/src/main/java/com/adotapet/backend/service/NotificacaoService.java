package com.adotapet.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.NotificacaoResponse;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Notificacao;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.NotificacaoRepository;

@Service
public class NotificacaoService {

    private final NotificacaoRepository notificacaoRepository;
    private final AdotanteRepository adotanteRepository;

    public NotificacaoService(NotificacaoRepository notificacaoRepository, AdotanteRepository adotanteRepository) {
        this.notificacaoRepository = notificacaoRepository;
        this.adotanteRepository = adotanteRepository;
    }

    @Transactional
    public NotificacaoResponse criar(Adotante adotante, TipoNotificacao tipo, String titulo, String mensagem,
            String referenciaTipo, Integer referenciaId) {
        Notificacao notificacao = new Notificacao();
        notificacao.setAdotante(adotante);
        notificacao.setTipo(tipo);
        notificacao.setTitulo(titulo);
        notificacao.setMensagem(mensagem);
        notificacao.setReferenciaTipo(referenciaTipo);
        notificacao.setReferenciaId(referenciaId);
        return NotificacaoResponse.fromEntity(notificacaoRepository.save(notificacao));
    }

    @Transactional(readOnly = true)
    public List<NotificacaoResponse> listarPorAdotante(Integer adotanteId) {
        validarAdotante(adotanteId);
        return notificacaoRepository.findByAdotanteIdOrderByDataCriacaoDesc(adotanteId)
                .stream()
                .map(NotificacaoResponse::fromEntity)
                .toList();
    }

    @Transactional
    public List<NotificacaoResponse> marcarTodasComoLidas(Integer adotanteId) {
        validarAdotante(adotanteId);
        for (Notificacao notificacao : notificacaoRepository.findByAdotanteIdAndLidaFalseOrderByDataCriacaoDesc(adotanteId)) {
            notificacao.setLida(true);
        }
        return listarPorAdotante(adotanteId);
    }

    @Transactional
    public void limparPorAdotante(Integer adotanteId) {
        validarAdotante(adotanteId);
        notificacaoRepository.deleteByAdotanteId(adotanteId);
    }

    @Transactional
    public NotificacaoResponse marcarComoLida(Integer id) {
        Notificacao notificacao = notificacaoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Notificacao nao encontrada"));
        notificacao.setLida(true);
        return NotificacaoResponse.fromEntity(notificacao);
    }

    private void validarAdotante(Integer adotanteId) {
        if (!adotanteRepository.existsById(adotanteId)) {
            throw new RecursoNaoEncontradoException("Adotante nao encontrado");
        }
    }
}
