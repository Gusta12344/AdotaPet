package com.adotapet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.StatusAnimal;

public interface AnimalRepository extends JpaRepository<Animal, Integer> {

    @EntityGraph(attributePaths = "protetor")
    List<Animal> findByStatusOrderByDataCadastroAsc(StatusAnimal status);

    @EntityGraph(attributePaths = "protetor")
    List<Animal> findAllByOrderByDataCadastroAsc();
}
