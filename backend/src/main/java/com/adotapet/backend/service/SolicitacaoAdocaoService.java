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
import com.adotapet.backend.queue.FilaManual;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;

@Service
public class SolicitacaoAdocaoService {

    private final SolicitacaoAdocaoRepository solicitacaoRepository;
    private final AnimalRepository animalRepository;
    private final AdotanteRepository adotanteRepository;

    public SolicitacaoAdocaoService(SolicitacaoAdocaoRepository solicitacaoRepository,
            AnimalRepository animalRepository, AdotanteRepository adotanteRepository) {
        this.solicitacaoRepository = solicitacaoRepository;
        this.animalRepository = animalRepository;
        this.adotanteRepository = adotanteRepository;
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
        if (solicitacaoRepository.existsByAnimalIdAndAdotanteIdAndStatus(
                animal.getId(), adotante.getId(), StatusSolicitacao.pendente)) {
            throw new RegraNegocioException("Este adotante ja esta na fila deste animal");
        }

        SolicitacaoAdocao solicitacao = new SolicitacaoAdocao();
        solicitacao.setAnimal(animal);
        solicitacao.setAdotante(adotante);
        solicitacao.setStatus(StatusSolicitacao.pendente);

        animal.setStatus(StatusAnimal.em_analise);

        return SolicitacaoResponse.fromEntity(solicitacaoRepository.save(solicitacao));
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

    @Transactional
    public SolicitacaoResponse atualizarStatus(Integer id, StatusSolicitacao novoStatus) {
        SolicitacaoAdocao solicitacao = solicitacaoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitacao nao encontrada"));

        if (solicitacao.getStatus() != StatusSolicitacao.pendente) {
            throw new RegraNegocioException("Somente solicitacoes pendentes podem ser processadas");
        }
        if (novoStatus == StatusSolicitacao.pendente) {
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
        animal.setStatus(StatusAnimal.adotado);

        for (SolicitacaoAdocao outra : solicitacaoRepository.findByAnimalIdAndStatus(animal.getId(), StatusSolicitacao.pendente)) {
            if (!outra.getId().equals(solicitacao.getId())) {
                outra.setStatus(StatusSolicitacao.recusada);
            }
        }
    }

    private void recusar(SolicitacaoAdocao solicitacao) {
        solicitacao.setStatus(StatusSolicitacao.recusada);
        solicitacao.getAnimal().setStatus(StatusAnimal.disponivel);
    }
}
