package com.adotapet.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.FavoritoAnimal;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.FavoritoAnimalRepository;

@Service
public class FavoritoAnimalService {

    private final AdotanteRepository adotanteRepository;
    private final AnimalRepository animalRepository;
    private final FavoritoAnimalRepository favoritoAnimalRepository;

    public FavoritoAnimalService(AdotanteRepository adotanteRepository, AnimalRepository animalRepository,
            FavoritoAnimalRepository favoritoAnimalRepository) {
        this.adotanteRepository = adotanteRepository;
        this.animalRepository = animalRepository;
        this.favoritoAnimalRepository = favoritoAnimalRepository;
    }

    @Transactional
    public AnimalResponse favoritar(Integer adotanteId, Integer animalId) {
        Adotante adotante = buscarAdotante(adotanteId);
        Animal animal = buscarAnimal(animalId);

        if (!favoritoAnimalRepository.existsByAdotanteIdAndAnimalId(adotanteId, animalId)) {
            favoritoAnimalRepository.save(new FavoritoAnimal(adotante, animal));
        }

        return AnimalResponse.fromEntity(animal);
    }

    @Transactional(readOnly = true)
    public List<AnimalResponse> listar(Integer adotanteId) {
        validarAdotante(adotanteId);
        return favoritoAnimalRepository.findByAdotanteIdOrderByDataFavoritoDesc(adotanteId)
                .stream()
                .map(FavoritoAnimal::getAnimal)
                .map(AnimalResponse::fromEntity)
                .toList();
    }

    @Transactional
    public void remover(Integer adotanteId, Integer animalId) {
        validarAdotante(adotanteId);
        if (favoritoAnimalRepository.existsByAdotanteIdAndAnimalId(adotanteId, animalId)) {
            favoritoAnimalRepository.deleteByAdotanteIdAndAnimalId(adotanteId, animalId);
        }
    }

    private Adotante buscarAdotante(Integer adotanteId) {
        return adotanteRepository.findById(adotanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Adotante nao encontrado"));
    }

    private void validarAdotante(Integer adotanteId) {
        if (!adotanteRepository.existsById(adotanteId)) {
            throw new RecursoNaoEncontradoException("Adotante nao encontrado");
        }
    }

    private Animal buscarAnimal(Integer animalId) {
        return animalRepository.findById(animalId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Animal nao encontrado"));
    }
}
