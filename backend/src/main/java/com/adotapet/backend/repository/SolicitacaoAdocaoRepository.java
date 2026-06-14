package com.adotapet.backend.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.StatusSolicitacao;

public interface SolicitacaoAdocaoRepository extends JpaRepository<SolicitacaoAdocao, Integer> {

    @EntityGraph(attributePaths = {"animal", "animal.imagens", "adotante"})
    List<SolicitacaoAdocao> findByStatusOrderByDataSolicitacaoAsc(StatusSolicitacao status);

    @EntityGraph(attributePaths = {"animal", "animal.imagens", "adotante"})
    List<SolicitacaoAdocao> findAllByOrderByDataSolicitacaoAsc();

    @EntityGraph(attributePaths = {"animal", "animal.imagens", "adotante", "adminResponsavel"})
    @Query("select s from SolicitacaoAdocao s where s.id = :id")
    Optional<SolicitacaoAdocao> findDetalheById(Integer id);

    @EntityGraph(attributePaths = {"animal", "adotante"})
    List<SolicitacaoAdocao> findByAdotanteIdOrderByDataSolicitacaoDesc(Integer adotanteId);

    @EntityGraph(attributePaths = {"animal", "adotante"})
    List<SolicitacaoAdocao> findByAnimalIdAndStatus(Integer animalId, StatusSolicitacao status);

    @EntityGraph(attributePaths = {"animal", "adotante"})
    List<SolicitacaoAdocao> findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(Integer animalId,
            Collection<StatusSolicitacao> statuses);

    long countByStatus(StatusSolicitacao status);

    long countByStatusAndDataDecisaoBetween(StatusSolicitacao status, LocalDateTime inicio, LocalDateTime fim);

    boolean existsByAnimalIdAndAdotanteIdAndStatus(Integer animalId, Integer adotanteId, StatusSolicitacao status);

    boolean existsByAnimalIdAndAdotanteIdAndStatusIn(Integer animalId, Integer adotanteId,
            Collection<StatusSolicitacao> statuses);
}
