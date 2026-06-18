package com.adotapet.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

import com.adotapet.backend.model.Adotante;

public interface AdotanteRepository extends JpaRepository<Adotante, Integer> {
    boolean existsByEmail(String email);

    boolean existsByCpf(String cpf);

    Optional<Adotante> findByCpf(String cpf);

    Optional<Adotante> findByEmail(String email);

    List<Adotante> findAllByOrderByDataCadastroDesc();
}
