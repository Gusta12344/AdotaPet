package com.adotapet.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.adotapet.backend.dto.AdminLoginRequest;
import com.adotapet.backend.dto.AdminLoginResponse;
import com.adotapet.backend.service.AdminService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*")
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
}
