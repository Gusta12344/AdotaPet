package com.adotapet.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.SolicitacaoRequest;
import com.adotapet.backend.dto.SolicitacaoResponse;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.model.SolicitacaoModeracaoEvento;
import com.adotapet.backend.model.TipoEventoModeracao;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.queue.FilaManual;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;
import com.adotapet.backend.repository.SolicitacaoModeracaoEventoRepository;

@Service
public class SolicitacaoAdocaoService {

    private final SolicitacaoAdocaoRepository solicitacaoRepository;
    private final AnimalRepository animalRepository;
    private final AdotanteRepository adotanteRepository;
    private final NotificacaoService notificacaoService;
    private final SolicitacaoModeracaoEventoRepository eventoRepository;

    public SolicitacaoAdocaoService(SolicitacaoAdocaoRepository solicitacaoRepository,
            AnimalRepository animalRepository, AdotanteRepository adotanteRepository,
            NotificacaoService notificacaoService, SolicitacaoModeracaoEventoRepository eventoRepository) {
        this.solicitacaoRepository = solicitacaoRepository;
        this.animalRepository = animalRepository;
        this.adotanteRepository = adotanteRepository;
        this.notificacaoService = notificacaoService;
        this.eventoRepository = eventoRepository;
    }

    @Transactional
    public SolicitacaoResponse criar(SolicitacaoRequest request) {
        Animal animal = animalRepository.findById(request.animalId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Animal nao encontrado"));
        Adotante adotante = adotanteRepository.findById(request.adotanteId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Adotante nao encontrado"));

        if (animal.getStatus() == StatusAnimal.adotado) {
            throw new RegraNegocioException("Animal ja foi adotado");
        }
        if (solicitacaoRepository.existsByAnimalIdAndAdotanteIdAndStatusIn(
                animal.getId(), adotante.getId(), List.of(StatusSolicitacao.pendente, StatusSolicitacao.em_analise))) {
            throw new RegraNegocioException("Este adotante ja esta na fila deste animal");
        }

        SolicitacaoAdocao solicitacao = new SolicitacaoAdocao();
        solicitacao.setAnimal(animal);
        solicitacao.setAdotante(adotante);
        solicitacao.setStatus(StatusSolicitacao.pendente);

        animal.setStatus(StatusAnimal.em_analise);

        SolicitacaoAdocao salva = solicitacaoRepository.save(solicitacao);
        registrarEvento(salva, TipoEventoModeracao.solicitacao_enviada, "Solicitacao enviada pelo adotante.");
        notificacaoService.criar(adotante, TipoNotificacao.adocao, "Solicitacao enviada",
                "Sua solicitacao para adotar " + animal.getNome() + " foi enviada e esta em analise.",
                "solicitacao_adocao", salva.getId());
        return SolicitacaoResponse.fromEntity(salva);
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponse> listarFilaPendente() {
        FilaManual<SolicitacaoAdocao> fila = new FilaManual<>();
        for (SolicitacaoAdocao solicitacao : solicitacaoRepository.findByStatusOrderByDataSolicitacaoAsc(StatusSolicitacao.pendente)) {
            fila.enfileirar(solicitacao);
        }

        return fila.paraLista()
                .stream()
                .map(SolicitacaoResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponse> listarPorAdotante(Integer adotanteId) {
        if (!adotanteRepository.existsById(adotanteId)) {
            throw new RecursoNaoEncontradoException("Adotante nao encontrado");
        }

        return solicitacaoRepository.findByAdotanteIdOrderByDataSolicitacaoDesc(adotanteId)
                .stream()
                .map(SolicitacaoResponse::fromEntity)
                .toList();
    }

    @Transactional
    public SolicitacaoResponse atualizarStatus(Integer id, StatusSolicitacao novoStatus) {
        SolicitacaoAdocao solicitacao = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitacao nao encontrada"));

        if (!isAtiva(solicitacao.getStatus())) {
            throw new RegraNegocioException("Somente solicitacoes ativas podem ser processadas");
        }
        if (novoStatus == StatusSolicitacao.pendente || novoStatus == StatusSolicitacao.em_analise) {
            throw new RegraNegocioException("Informe aprovada ou recusada para processar a solicitacao");
        }

        if (novoStatus == StatusSolicitacao.aprovada) {
            aprovar(solicitacao);
        } else {
            recusar(solicitacao);
        }

        solicitacao.getAnimal().getNome();
        solicitacao.getAdotante().getNome();
        return SolicitacaoResponse.fromEntity(solicitacao);
    }

    private void aprovar(SolicitacaoAdocao solicitacao) {
        Animal animal = solicitacao.getAnimal();
        solicitacao.setStatus(StatusSolicitacao.aprovada);
        solicitacao.setDataDecisao(java.time.LocalDateTime.now());
        animal.setStatus(StatusAnimal.adotado);
        notificacaoService.criar(solicitacao.getAdotante(), TipoNotificacao.adocao, "Solicitacao aprovada",
                "Sua solicitacao para adotar " + animal.getNome() + " foi aprovada.",
                "solicitacao_adocao", solicitacao.getId());
        registrarEvento(solicitacao, TipoEventoModeracao.aprovada, "Solicitacao aprovada pelo painel legado.");

        for (SolicitacaoAdocao outra : solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(
                animal.getId(), List.of(StatusSolicitacao.pendente, StatusSolicitacao.em_analise))) {
            if (!outra.getId().equals(solicitacao.getId())) {
                outra.setStatus(StatusSolicitacao.recusada);
                outra.setDataDecisao(java.time.LocalDateTime.now());
                outra.setObservacaoAdmin("Recusa automatica por aprovacao de outra solicitacao do mesmo animal.");
                notificacaoService.criar(outra.getAdotante(), TipoNotificacao.adocao, "Solicitacao recusada",
                        "Sua solicitacao para adotar " + animal.getNome() + " foi recusada.",
                        "solicitacao_adocao", outra.getId());
                registrarEvento(outra, TipoEventoModeracao.recusa_automatica,
                        "Recusa automatica por aprovacao de outra solicitacao.");
            }
        }
    }

    private void recusar(SolicitacaoAdocao solicitacao) {
        solicitacao.setStatus(StatusSolicitacao.recusada);
        solicitacao.setDataDecisao(java.time.LocalDateTime.now());
        boolean temOutrasAtivas = solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(
                solicitacao.getAnimal().getId(), List.of(StatusSolicitacao.pendente, StatusSolicitacao.em_analise))
                .stream()
                .anyMatch(outra -> !outra.getId().equals(solicitacao.getId()));
        solicitacao.getAnimal().setStatus(temOutrasAtivas ? StatusAnimal.em_analise : StatusAnimal.disponivel);
        notificacaoService.criar(solicitacao.getAdotante(), TipoNotificacao.adocao, "Solicitacao recusada",
                "Sua solicitacao para adotar " + solicitacao.getAnimal().getNome() + " foi recusada.",
                "solicitacao_adocao", solicitacao.getId());
        registrarEvento(solicitacao, TipoEventoModeracao.recusada, "Solicitacao recusada pelo painel legado.");
    }

    private void registrarEvento(SolicitacaoAdocao solicitacao, TipoEventoModeracao tipo, String observacao) {
        SolicitacaoModeracaoEvento evento = new SolicitacaoModeracaoEvento();
        evento.setSolicitacao(solicitacao);
        evento.setTipo(tipo);
        evento.setObservacao(observacao);
        eventoRepository.save(evento);
    }

    private boolean isAtiva(StatusSolicitacao status) {
        return status == StatusSolicitacao.pendente || status == StatusSolicitacao.em_analise;
    }
}
