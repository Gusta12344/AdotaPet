package com.adotapet.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.adotapet.backend.dto.AdotanteRequest;
import com.adotapet.backend.dto.AdotanteResponse;
import com.adotapet.backend.dto.AdotanteUpdateRequest;
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

    @Transactional
    public AdotanteResponse atualizar(Integer id, AdotanteUpdateRequest request) {
        Adotante adotante = adotanteRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Adotante nao encontrado"));

        if (!passwordEncoder.matches(String.valueOf(request.senhaAtual()).trim(), adotante.getSenha())) {
            throw new BadCredentialsException("Senha atual invalida");
        }

        adotanteRepository.findByEmail(request.email())
                .filter(outro -> !outro.getId().equals(adotante.getId()))
                .ifPresent(outro -> {
                    throw new RegraNegocioException("Ja existe adotante cadastrado com este e-mail");
                });

        adotante.setNome(request.nome());
        adotante.setEmail(request.email());
        adotante.setTelefone(request.telefone());
        adotante.setEndereco(request.endereco());
        adotante.setTipoMoradia(request.tipoMoradia());
        adotante.setTemCriancas(request.temCriancas());
        adotante.setTemOutrosAnimais(request.temOutrosAnimais());
        adotante.setNivelAtividade(request.nivelAtividade());
        adotante.setPreferenciaPorte(request.preferenciaPorte());
        adotante.setPreferenciaEspecie(request.preferenciaEspecie());

        String novaSenha = String.valueOf(request.novaSenha() == null ? "" : request.novaSenha()).trim();
        if (!novaSenha.isBlank()) {
            if (novaSenha.length() < 6 || novaSenha.length() > 72) {
                throw new RegraNegocioException("A nova senha deve ter entre 6 e 72 caracteres");
            }
            adotante.setSenha(passwordEncoder.encode(novaSenha));
        }

        return AdotanteResponse.fromEntity(adotanteRepository.save(adotante));
    }
}
