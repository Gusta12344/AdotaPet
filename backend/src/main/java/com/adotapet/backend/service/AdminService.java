package com.adotapet.backend.service;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.AdminLoginRequest;
import com.adotapet.backend.dto.AdminLoginResponse;
import com.adotapet.backend.dto.AdminResponse;
import com.adotapet.backend.dto.AdminUpdateRequest;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.repository.AdminRepository;

@Service
public class AdminService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(AdminRepository adminRepository, PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public AdminLoginResponse login(AdminLoginRequest request) {
        Admin admin = adminRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new BadCredentialsException("E-mail ou senha invalidos"));

        if (!passwordEncoder.matches(normalizePassword(request.senha()), admin.getSenha())) {
            throw new BadCredentialsException("E-mail ou senha invalidos");
        }

        return new AdminLoginResponse(true, admin.getId(), admin.getNome(), admin.getEmail(), "Login realizado com sucesso");
    }

    @Transactional
    public AdminResponse atualizarPerfil(String emailAutenticado, AdminUpdateRequest request) {
        Admin admin = adminRepository.findByEmail(normalizeEmail(emailAutenticado))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Admin nao encontrado"));

        if (!passwordEncoder.matches(normalizePassword(request.senhaAtual()), admin.getSenha())) {
            throw new BadCredentialsException("Senha atual invalida");
        }

        String nome = normalizeText(request.nome());
        String email = normalizeEmail(request.email());

        adminRepository.findByEmail(email)
                .filter(outro -> !outro.getId().equals(admin.getId()))
                .ifPresent(outro -> {
                    throw new RegraNegocioException("Ja existe admin cadastrado com este e-mail");
                });

        admin.setNome(nome);
        admin.setEmail(email);

        String novaSenha = normalizePassword(request.novaSenha());
        if (!novaSenha.isBlank()) {
            if (novaSenha.length() < 6 || novaSenha.length() > 72) {
                throw new RegraNegocioException("A nova senha deve ter entre 6 e 72 caracteres");
            }
            admin.setSenha(passwordEncoder.encode(novaSenha));
        }

        return AdminResponse.fromEntity(adminRepository.save(admin));
    }

    private static String normalizeText(String value) {
        return String.valueOf(value == null ? "" : value).trim();
    }

    private static String normalizeEmail(String value) {
        return normalizeText(value).toLowerCase(Locale.ROOT);
    }

    private static String normalizePassword(String value) {
        return normalizeText(value);
    }
}
