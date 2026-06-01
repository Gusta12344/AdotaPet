package com.adotapet.backend.model;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class FavoritoAnimalId implements Serializable {

    @Column(name = "adotante_id")
    private Integer adotanteId;

    @Column(name = "animal_id")
    private Integer animalId;

    public FavoritoAnimalId() {
    }

    public FavoritoAnimalId(Integer adotanteId, Integer animalId) {
        this.adotanteId = adotanteId;
        this.animalId = animalId;
    }

    public Integer getAdotanteId() {
        return adotanteId;
    }

    public void setAdotanteId(Integer adotanteId) {
        this.adotanteId = adotanteId;
    }

    public Integer getAnimalId() {
        return animalId;
    }

    public void setAnimalId(Integer animalId) {
        this.animalId = animalId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof FavoritoAnimalId that)) {
            return false;
        }
        return Objects.equals(adotanteId, that.adotanteId)
                && Objects.equals(animalId, that.animalId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(adotanteId, animalId);
    }
}
