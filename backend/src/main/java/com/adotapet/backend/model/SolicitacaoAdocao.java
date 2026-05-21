package com.adotapet.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "solicitacao_adocao")
public class SolicitacaoAdocao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "animal_id", nullable = false)
    private Animal animal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adotante_id", nullable = false)
    private Adotante adotante;

    @Column(name = "data_solicitacao", nullable = false, updatable = false)
    private LocalDateTime dataSolicitacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusSolicitacao status = StatusSolicitacao.pendente;

    @PrePersist
    public void prePersist() {
        if (dataSolicitacao == null) {
            dataSolicitacao = LocalDateTime.now();
        }
        if (status == null) {
            status = StatusSolicitacao.pendente;
        }
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Animal getAnimal() {
        return animal;
    }

    public void setAnimal(Animal animal) {
        this.animal = animal;
    }

    public Adotante getAdotante() {
        return adotante;
    }

    public void setAdotante(Adotante adotante) {
        this.adotante = adotante;
    }

    public LocalDateTime getDataSolicitacao() {
        return dataSolicitacao;
    }

    public void setDataSolicitacao(LocalDateTime dataSolicitacao) {
        this.dataSolicitacao = dataSolicitacao;
    }

    public StatusSolicitacao getStatus() {
        return status;
    }

    public void setStatus(StatusSolicitacao status) {
        this.status = status;
    }
}
