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
@Table(name = "animal")
public class Animal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Especie especie;

    @Column(length = 100)
    private String raca = "SRD";

    @Column(name = "idade_meses", nullable = false)
    private Integer idadeMeses;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Porte porte;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_energia", nullable = false)
    private NivelEnergia nivelEnergia;

    @Column(name = "bom_com_criancas", nullable = false)
    private boolean bomComCriancas;

    @Column(name = "bom_com_animais", nullable = false)
    private boolean bomComAnimais;

    @Column(name = "precisa_espaco", nullable = false)
    private boolean precisaEspaco;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusAnimal status = StatusAnimal.disponivel;

    @Column(name = "data_cadastro", nullable = false, updatable = false)
    private LocalDateTime dataCadastro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "protetor_id", nullable = false)
    private Protetor protetor;

    @PrePersist
    public void prePersist() {
        if (dataCadastro == null) {
            dataCadastro = LocalDateTime.now();
        }
        if (status == null) {
            status = StatusAnimal.disponivel;
        }
        if (raca == null || raca.isBlank()) {
            raca = "SRD";
        }
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Especie getEspecie() {
        return especie;
    }

    public void setEspecie(Especie especie) {
        this.especie = especie;
    }

    public String getRaca() {
        return raca;
    }

    public void setRaca(String raca) {
        this.raca = raca;
    }

    public Integer getIdadeMeses() {
        return idadeMeses;
    }

    public void setIdadeMeses(Integer idadeMeses) {
        this.idadeMeses = idadeMeses;
    }

    public Porte getPorte() {
        return porte;
    }

    public void setPorte(Porte porte) {
        this.porte = porte;
    }

    public NivelEnergia getNivelEnergia() {
        return nivelEnergia;
    }

    public void setNivelEnergia(NivelEnergia nivelEnergia) {
        this.nivelEnergia = nivelEnergia;
    }

    public boolean isBomComCriancas() {
        return bomComCriancas;
    }

    public void setBomComCriancas(boolean bomComCriancas) {
        this.bomComCriancas = bomComCriancas;
    }

    public boolean isBomComAnimais() {
        return bomComAnimais;
    }

    public void setBomComAnimais(boolean bomComAnimais) {
        this.bomComAnimais = bomComAnimais;
    }

    public boolean isPrecisaEspaco() {
        return precisaEspaco;
    }

    public void setPrecisaEspaco(boolean precisaEspaco) {
        this.precisaEspaco = precisaEspaco;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public StatusAnimal getStatus() {
        return status;
    }

    public void setStatus(StatusAnimal status) {
        this.status = status;
    }

    public LocalDateTime getDataCadastro() {
        return dataCadastro;
    }

    public void setDataCadastro(LocalDateTime dataCadastro) {
        this.dataCadastro = dataCadastro;
    }

    public Protetor getProtetor() {
        return protetor;
    }

    public void setProtetor(Protetor protetor) {
        this.protetor = protetor;
    }
}
