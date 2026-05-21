package com.adotapet.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.adotapet.backend.model.Adotante;

public interface AdotanteRepository extends JpaRepository<Adotante, Integer> {
    boolean existsByEmail(String email);

    boolean existsByCpf(String cpf);
}
