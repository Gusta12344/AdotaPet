package com.adotapet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.adotapet.backend.model.SolicitacaoModeracaoEvento;

public interface SolicitacaoModeracaoEventoRepository extends JpaRepository<SolicitacaoModeracaoEvento, Integer> {

    @EntityGraph(attributePaths = {"admin"})
    List<SolicitacaoModeracaoEvento> findBySolicitacaoIdOrderByDataEventoAsc(Integer solicitacaoId);

    @Modifying
    @Query("""
            delete from SolicitacaoModeracaoEvento evento
             where evento.solicitacao.id = :solicitacaoId
            """)
    void deleteBySolicitacaoId(@Param("solicitacaoId") Integer solicitacaoId);

    @Modifying
    @Query("""
            delete from SolicitacaoModeracaoEvento evento
             where evento.solicitacao.animal.id = :animalId
            """)
    void deleteBySolicitacaoAnimalId(@Param("animalId") Integer animalId);

    @Modifying
    @Query("""
            delete from SolicitacaoModeracaoEvento evento
             where evento.solicitacao.adotante.id = :adotanteId
            """)
    void deleteBySolicitacaoAdotanteId(@Param("adotanteId") Integer adotanteId);
}
