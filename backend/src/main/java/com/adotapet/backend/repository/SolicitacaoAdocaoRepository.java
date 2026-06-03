package com.adotapet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.StatusSolicitacao;

public interface SolicitacaoAdocaoRepository extends JpaRepository<SolicitacaoAdocao, Integer> {

    @EntityGraph(attributePaths = {"animal", "adotante"})
    List<SolicitacaoAdocao> findByStatusOrderByDataSolicitacaoAsc(StatusSolicitacao status);

    @EntityGraph(attributePaths = {"animal", "adotante"})
    List<SolicitacaoAdocao> findAllByOrderByDataSolicitacaoAsc();

    @EntityGraph(attributePaths = {"animal", "adotante"})
    List<SolicitacaoAdocao> findByAdotanteIdOrderByDataSolicitacaoDesc(Integer adotanteId);

    @EntityGraph(attributePaths = {"animal", "adotante"})
    List<SolicitacaoAdocao> findByAnimalIdAndStatus(Integer animalId, StatusSolicitacao status);

    boolean existsByAnimalIdAndAdotanteIdAndStatus(Integer animalId, Integer adotanteId, StatusSolicitacao status);
}
