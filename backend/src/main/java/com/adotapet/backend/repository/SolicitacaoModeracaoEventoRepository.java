package com.adotapet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.adotapet.backend.model.SolicitacaoModeracaoEvento;

public interface SolicitacaoModeracaoEventoRepository extends JpaRepository<SolicitacaoModeracaoEvento, Integer> {

    @EntityGraph(attributePaths = {"admin"})
    List<SolicitacaoModeracaoEvento> findBySolicitacaoIdOrderByDataEventoAsc(Integer solicitacaoId);
}
