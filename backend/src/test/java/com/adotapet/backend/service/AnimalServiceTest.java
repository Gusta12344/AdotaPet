package com.adotapet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.TipoMoradia;

class AnimalServiceTest {

    private AnimalService animalService;

    @BeforeEach
    void setUp() {
        animalService = new AnimalService(null, null, null, null);
    }

    @Test
    void pontuaConvivenciaComOutrosAnimaisQuandoAnimalAceitaCaesOuGatos() {
        Adotante adotante = adotanteComOutrosAnimais();
        Animal animal = animalBase();
        animal.setBomComCaes(true);
        animal.setBomComGatos(false);

        assertEquals(100, animalService.calcularScore(adotante, animal));
    }

    @Test
    void naoPontuaConvivenciaComOutrosAnimaisQuandoAnimalNaoAceitaCaesNemGatos() {
        Adotante adotante = adotanteComOutrosAnimais();
        Animal animal = animalBase();
        animal.setBomComCaes(false);
        animal.setBomComGatos(false);

        assertEquals(80, animalService.calcularScore(adotante, animal));
    }

    private Adotante adotanteComOutrosAnimais() {
        Adotante adotante = new Adotante();
        adotante.setTemCriancas(true);
        adotante.setTemOutrosAnimais(true);
        adotante.setTipoMoradia(TipoMoradia.casa_com_quintal);
        adotante.setNivelAtividade(NivelAtividade.ativo);
        adotante.setPreferenciaPorte(Porte.medio);
        return adotante;
    }

    private Animal animalBase() {
        Animal animal = new Animal();
        animal.setEspecie(Especie.cao);
        animal.setPorte(Porte.medio);
        animal.setBomComCriancas(true);
        animal.setPrecisaEspaco(false);
        animal.setNivelEnergia(NivelEnergia.alto);
        return animal;
    }
}
