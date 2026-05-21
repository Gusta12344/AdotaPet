package com.adotapet.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "adotante")
public class Adotante extends Pessoa {

    @Column(nullable = false, unique = true, length = 14)
    private String cpf;

    @Column(nullable = false, length = 255)
    private String endereco;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_moradia", nullable = false)
    private TipoMoradia tipoMoradia;

    @Column(name = "tem_criancas", nullable = false)
    private boolean temCriancas;

    @Column(name = "tem_outros_animais", nullable = false)
    private boolean temOutrosAnimais;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_atividade", nullable = false)
    private NivelAtividade nivelAtividade;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferencia_porte", nullable = false)
    private Porte preferenciaPorte = Porte.indiferente;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferencia_especie", nullable = false)
    private Especie preferenciaEspecie = Especie.indiferente;

    @Column(name = "data_cadastro", nullable = false, updatable = false)
    private LocalDateTime dataCadastro;

    @PrePersist
    public void prePersist() {
        if (dataCadastro == null) {
            dataCadastro = LocalDateTime.now();
        }
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public TipoMoradia getTipoMoradia() {
        return tipoMoradia;
    }

    public void setTipoMoradia(TipoMoradia tipoMoradia) {
        this.tipoMoradia = tipoMoradia;
    }

    public boolean isTemCriancas() {
        return temCriancas;
    }

    public void setTemCriancas(boolean temCriancas) {
        this.temCriancas = temCriancas;
    }

    public boolean isTemOutrosAnimais() {
        return temOutrosAnimais;
    }

    public void setTemOutrosAnimais(boolean temOutrosAnimais) {
        this.temOutrosAnimais = temOutrosAnimais;
    }

    public NivelAtividade getNivelAtividade() {
        return nivelAtividade;
    }

    public void setNivelAtividade(NivelAtividade nivelAtividade) {
        this.nivelAtividade = nivelAtividade;
    }

    public Porte getPreferenciaPorte() {
        return preferenciaPorte;
    }

    public void setPreferenciaPorte(Porte preferenciaPorte) {
        this.preferenciaPorte = preferenciaPorte;
    }

    public Especie getPreferenciaEspecie() {
        return preferenciaEspecie;
    }

    public void setPreferenciaEspecie(Especie preferenciaEspecie) {
        this.preferenciaEspecie = preferenciaEspecie;
    }

    public LocalDateTime getDataCadastro() {
        return dataCadastro;
    }

    public void setDataCadastro(LocalDateTime dataCadastro) {
        this.dataCadastro = dataCadastro;
    }
}
