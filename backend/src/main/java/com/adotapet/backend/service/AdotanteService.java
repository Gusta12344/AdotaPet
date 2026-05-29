package com.adotapet.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.adotapet.backend.dto.AdotanteRequest;
import com.adotapet.backend.dto.AdotanteResponse;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.repository.AdotanteRepository;

@Service
public class AdotanteService {

    private final AdotanteRepository adotanteRepository;
    private final PasswordEncoder passwordEncoder;

    public AdotanteService(AdotanteRepository adotanteRepository, PasswordEncoder passwordEncoder) {
        this.adotanteRepository = adotanteRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AdotanteResponse cadastrar(AdotanteRequest request) {
        if (adotanteRepository.existsByEmail(request.email())) {
            throw new RegraNegocioException("Ja existe adotante cadastrado com este e-mail");
        }
        if (adotanteRepository.existsByCpf(request.cpf())) {
            throw new RegraNegocioException("Ja existe adotante cadastrado com este CPF");
        }

        Adotante adotante = new Adotante();
        adotante.setNome(request.nome());
        adotante.setCpf(request.cpf());
        adotante.setSenha(passwordEncoder.encode(request.senha()));
        adotante.setEmail(request.email());
        adotante.setTelefone(request.telefone());
        adotante.setEndereco(request.endereco());
        adotante.setTipoMoradia(request.tipoMoradia());
        adotante.setTemCriancas(request.temCriancas());
        adotante.setTemOutrosAnimais(request.temOutrosAnimais());
        adotante.setNivelAtividade(request.nivelAtividade());
        adotante.setPreferenciaPorte(request.preferenciaPorte());
        adotante.setPreferenciaEspecie(request.preferenciaEspecie());

        return AdotanteResponse.fromEntity(adotanteRepository.save(adotante));
    }
}
