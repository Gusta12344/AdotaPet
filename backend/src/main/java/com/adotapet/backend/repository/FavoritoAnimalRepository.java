package com.adotapet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.adotapet.backend.model.FavoritoAnimal;
import com.adotapet.backend.model.FavoritoAnimalId;

public interface FavoritoAnimalRepository extends JpaRepository<FavoritoAnimal, FavoritoAnimalId> {

    @Query("""
            select distinct favorito
              from FavoritoAnimal favorito
              left join fetch favorito.animal animal
              left join fetch animal.protetor
              left join fetch animal.imagens
             where favorito.adotante.id = :adotanteId
             order by favorito.dataFavorito desc
            """)
    List<FavoritoAnimal> findByAdotanteIdOrderByDataFavoritoDesc(@Param("adotanteId") Integer adotanteId);

    @Query("""
            select count(favorito) > 0
              from FavoritoAnimal favorito
             where favorito.adotante.id = :adotanteId
               and favorito.animal.id = :animalId
            """)
    boolean existsByAdotanteIdAndAnimalId(@Param("adotanteId") Integer adotanteId,
            @Param("animalId") Integer animalId);

    @Modifying
    @Query("""
            delete from FavoritoAnimal favorito
             where favorito.adotante.id = :adotanteId
               and favorito.animal.id = :animalId
            """)
    void deleteByAdotanteIdAndAnimalId(@Param("adotanteId") Integer adotanteId,
            @Param("animalId") Integer animalId);
}
