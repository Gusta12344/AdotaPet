package com.adotapet.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.AnimalImagem;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Protetor;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.model.StatusAnimal;

class AnimalImagemTest {

    @Test
    void respostaDoAnimalRetornaUrlsDeImagemCadastradas() {
        Protetor protetor = new Protetor();
        protetor.setId(7);
        protetor.setNome("Abrigo Teste");

        Animal animal = new Animal();
        animal.setId(10);
        animal.setNome("Thor");
        animal.setEspecie(Especie.cao);
        animal.setRaca("SRD");
        animal.setIdadeMeses(24);
        animal.setPorte(Porte.grande);
        animal.setSexo(Sexo.macho);
        animal.setDataResgate(LocalDate.of(2024, 9, 12));
        animal.setNivelEnergia(NivelEnergia.alto);
        animal.setMicrochip(true);
        animal.setCastrado(true);
        animal.setVermifugado(true);
        animal.setVacinado(true);
        animal.setStatus(StatusAnimal.disponivel);
        animal.setProtetor(protetor);
        animal.adicionarImagem(new AnimalImagem("/uploads/animais/thor-1.jpg", 1));
        animal.adicionarImagem(new AnimalImagem("/uploads/animais/thor-2.jpg", 2));

        AnimalResponse response = AnimalResponse.fromEntity(animal);

        assertEquals(List.of(
                "/uploads/animais/thor-1.jpg",
                "/uploads/animais/thor-2.jpg"), response.imagemUrls());
        assertEquals(Sexo.macho, response.sexo());
        assertEquals(LocalDate.of(2024, 9, 12), response.dataResgate());
        assertEquals(true, response.microchip());
        assertEquals(true, response.castrado());
        assertEquals(true, response.vermifugado());
        assertEquals(true, response.vacinado());
    }
}
