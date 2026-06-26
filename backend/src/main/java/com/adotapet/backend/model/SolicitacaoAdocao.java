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

    @Column(name = "data_inicio_analise")
    private LocalDateTime dataInicioAnalise;

    @Column(name = "data_decisao")
    private LocalDateTime dataDecisao;

    @Column(name = "data_finalizacao")
    private LocalDateTime dataFinalizacao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_responsavel_id")
    private Admin adminResponsavel;

    @Column(name = "dados_adotante_conferidos", nullable = false)
    private boolean dadosAdotanteConferidos;

    @Column(name = "animal_disponivel_conferido", nullable = false)
    private boolean animalDisponivelConferido;

    @Column(name = "contato_revisado", nullable = false)
    private boolean contatoRevisado;

    @Column(name = "observacao_admin", columnDefinition = "TEXT")
    private String observacaoAdmin;

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

    public LocalDateTime getDataInicioAnalise() {
        return dataInicioAnalise;
    }

    public void setDataInicioAnalise(LocalDateTime dataInicioAnalise) {
        this.dataInicioAnalise = dataInicioAnalise;
    }

    public LocalDateTime getDataDecisao() {
        return dataDecisao;
    }

    public void setDataDecisao(LocalDateTime dataDecisao) {
        this.dataDecisao = dataDecisao;
    }

    public LocalDateTime getDataFinalizacao() {
        return dataFinalizacao;
    }

    public void setDataFinalizacao(LocalDateTime dataFinalizacao) {
        this.dataFinalizacao = dataFinalizacao;
    }

    public Admin getAdminResponsavel() {
        return adminResponsavel;
    }

    public void setAdminResponsavel(Admin adminResponsavel) {
        this.adminResponsavel = adminResponsavel;
    }

    public boolean isDadosAdotanteConferidos() {
        return dadosAdotanteConferidos;
    }

    public void setDadosAdotanteConferidos(boolean dadosAdotanteConferidos) {
        this.dadosAdotanteConferidos = dadosAdotanteConferidos;
    }

    public boolean isAnimalDisponivelConferido() {
        return animalDisponivelConferido;
    }

    public void setAnimalDisponivelConferido(boolean animalDisponivelConferido) {
        this.animalDisponivelConferido = animalDisponivelConferido;
    }

    public boolean isContatoRevisado() {
        return contatoRevisado;
    }

    public void setContatoRevisado(boolean contatoRevisado) {
        this.contatoRevisado = contatoRevisado;
    }

    public String getObservacaoAdmin() {
        return observacaoAdmin;
    }

    public void setObservacaoAdmin(String observacaoAdmin) {
        this.observacaoAdmin = observacaoAdmin;
    }
}
