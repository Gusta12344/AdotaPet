package com.adotapet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.FavoritoAnimal;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Protetor;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.FavoritoAnimalRepository;

@ExtendWith(MockitoExtension.class)
class FavoritoAnimalServiceTest {

    @Mock
    private AdotanteRepository adotanteRepository;

    @Mock
    private AnimalRepository animalRepository;

    @Mock
    private FavoritoAnimalRepository favoritoAnimalRepository;

    @Mock
    private NotificacaoService notificacaoService;

    private FavoritoAnimalService favoritoAnimalService;

    @BeforeEach
    void setUp() {
        favoritoAnimalService = new FavoritoAnimalService(adotanteRepository, animalRepository, favoritoAnimalRepository,
                notificacaoService);
    }

    @Test
    void favoritaAnimalQuandoAdotanteEAnimalExistem() {
        Adotante adotante = adotante(7);
        Animal animal = animal(3);

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(adotante));
        when(animalRepository.findById(3)).thenReturn(Optional.of(animal));
        when(favoritoAnimalRepository.existsByAdotanteIdAndAnimalId(7, 3)).thenReturn(false);
        when(favoritoAnimalRepository.save(any(FavoritoAnimal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = favoritoAnimalService.favoritar(7, 3);

        assertEquals(3, response.id());
        assertEquals("Mimi", response.nome());
        verify(favoritoAnimalRepository).save(any(FavoritoAnimal.class));
        verify(notificacaoService).criar(eq(adotante), eq(TipoNotificacao.favoritos),
                eq("Favoritos atualizados"), eq("Mimi foi adicionado aos favoritos."), eq("animal"), eq(3));
    }

    @Test
    void naoDuplicaFavoritoQuandoAnimalJaFoiSalvo() {
        Adotante adotante = adotante(7);
        Animal animal = animal(3);

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(adotante));
        when(animalRepository.findById(3)).thenReturn(Optional.of(animal));
        when(favoritoAnimalRepository.existsByAdotanteIdAndAnimalId(7, 3)).thenReturn(true);

        var response = favoritoAnimalService.favoritar(7, 3);

        assertEquals(3, response.id());
        verify(favoritoAnimalRepository, never()).save(any(FavoritoAnimal.class));
        verify(notificacaoService, never()).criar(any(), any(), any(), any(), any(), any());
    }

    @Test
    void listaFavoritosDoAdotanteEmOrdemDeCadastro() {
        Adotante adotante = adotante(7);
        Animal animal = animal(3);
        FavoritoAnimal favorito = new FavoritoAnimal(adotante, animal);

        when(adotanteRepository.existsById(7)).thenReturn(true);
        when(favoritoAnimalRepository.findByAdotanteIdOrderByDataFavoritoDesc(7)).thenReturn(List.of(favorito));

        var favoritos = favoritoAnimalService.listar(7);

        assertEquals(1, favoritos.size());
        assertEquals("Mimi", favoritos.get(0).nome());
    }

    @Test
    void removeFavoritoExistente() {
        Adotante adotante = adotante(7);
        Animal animal = animal(3);

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(adotante));
        when(animalRepository.findById(3)).thenReturn(Optional.of(animal));
        when(favoritoAnimalRepository.existsByAdotanteIdAndAnimalId(7, 3)).thenReturn(true);

        favoritoAnimalService.remover(7, 3);

        verify(favoritoAnimalRepository).deleteByAdotanteIdAndAnimalId(7, 3);
        verify(notificacaoService).criar(eq(adotante), eq(TipoNotificacao.favoritos),
                eq("Favoritos atualizados"), eq("Mimi foi removido dos favoritos."), eq("animal"), eq(3));
    }

    private Adotante adotante(Integer id) {
        Adotante adotante = new Adotante();
        adotante.setId(id);
        adotante.setNome("Maria Oliveira");
        return adotante;
    }

    private Animal animal(Integer id) {
        Protetor protetor = new Protetor();
        protetor.setId(2);
        protetor.setNome("Abrigo Amigos de Patas");

        Animal animal = new Animal();
        animal.setId(id);
        animal.setNome("Mimi");
        animal.setEspecie(Especie.gato);
        animal.setRaca("SRD");
        animal.setIdadeMeses(12);
        animal.setPorte(Porte.pequeno);
        animal.setSexo(Sexo.femea);
        animal.setDataResgate(LocalDate.of(2026, 1, 20));
        animal.setNivelEnergia(NivelEnergia.baixo);
        animal.setStatus(StatusAnimal.disponivel);
        animal.setProtetor(protetor);
        return animal;
    }
}
