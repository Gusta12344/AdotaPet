package com.adotapet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.adotapet.backend.model.Notificacao;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Integer> {

    List<Notificacao> findByAdotanteIdOrderByDataCriacaoDesc(Integer adotanteId);

    List<Notificacao> findByAdotanteIdAndLidaFalseOrderByDataCriacaoDesc(Integer adotanteId);

    List<Notificacao> findTop5ByLidaFalseOrderByDataCriacaoDesc();

    void deleteByAdotanteId(Integer adotanteId);
}
