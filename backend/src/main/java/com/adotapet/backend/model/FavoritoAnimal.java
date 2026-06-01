package com.adotapet.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "adotante_favorito")
public class FavoritoAnimal {

    @EmbeddedId
    private FavoritoAnimalId id = new FavoritoAnimalId();

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("adotanteId")
    @JoinColumn(name = "adotante_id", nullable = false)
    private Adotante adotante;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("animalId")
    @JoinColumn(name = "animal_id", nullable = false)
    private Animal animal;

    @Column(name = "data_favorito", nullable = false, updatable = false)
    private LocalDateTime dataFavorito;

    public FavoritoAnimal() {
    }

    public FavoritoAnimal(Adotante adotante, Animal animal) {
        this.adotante = adotante;
        this.animal = animal;
        this.id = new FavoritoAnimalId(adotante.getId(), animal.getId());
    }

    @PrePersist
    public void prePersist() {
        if (dataFavorito == null) {
            dataFavorito = LocalDateTime.now();
        }
    }

    public FavoritoAnimalId getId() {
        return id;
    }

    public void setId(FavoritoAnimalId id) {
        this.id = id;
    }

    public Adotante getAdotante() {
        return adotante;
    }

    public void setAdotante(Adotante adotante) {
        this.adotante = adotante;
    }

    public Animal getAnimal() {
        return animal;
    }

    public void setAnimal(Animal animal) {
        this.animal = animal;
    }

    public LocalDateTime getDataFavorito() {
        return dataFavorito;
    }

    public void setDataFavorito(LocalDateTime dataFavorito) {
        this.dataFavorito = dataFavorito;
    }
}
