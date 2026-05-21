package com.adotapet.backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.AdminLoginRequest;
import com.adotapet.backend.dto.AdminLoginResponse;
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
        Admin admin = adminRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("E-mail ou senha invalidos"));

        if (!passwordEncoder.matches(request.senha(), admin.getSenha())) {
            throw new BadCredentialsException("E-mail ou senha invalidos");
        }

        return new AdminLoginResponse(true, admin.getId(), admin.getNome(), admin.getEmail(), "Login realizado com sucesso");
    }
}
