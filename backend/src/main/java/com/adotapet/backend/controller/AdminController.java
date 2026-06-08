package com.adotapet.backend.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.adotapet.backend.dto.AdminLoginRequest;
import com.adotapet.backend.dto.AdminLoginResponse;
import com.adotapet.backend.dto.AdminResponse;
import com.adotapet.backend.dto.AdminUpdateRequest;
import com.adotapet.backend.service.AdminService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/login")
    public AdminLoginResponse login(@Valid @RequestBody AdminLoginRequest request) {
        return adminService.login(request);
    }

    @PutMapping("/me")
    public AdminResponse atualizar(Authentication authentication, @Valid @RequestBody AdminUpdateRequest request) {
        return adminService.atualizarPerfil(authentication.getName(), request);
    }
}
