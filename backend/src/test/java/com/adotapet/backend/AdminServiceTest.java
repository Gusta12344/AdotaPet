package com.adotapet.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.adotapet.backend.dto.AdminUpdateRequest;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.repository.AdminRepository;
import com.adotapet.backend.service.AdminService;
import com.adotapet.backend.service.RegraNegocioException;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminService adminService;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(adminRepository, passwordEncoder);
    }

    @Test
    void atualizaDadosPessoaisDoAdminAutenticadoQuandoSenhaAtualConfere() {
        Admin admin = adminExistente();
        AdminUpdateRequest request = new AdminUpdateRequest(
                "  Gestor AdotaPet  ",
                " GESTOR@ADOTAPET.COM ",
                " admin123 ",
                " nova123 "
        );

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(adminRepository.findByEmail("gestor@adotapet.com")).thenReturn(Optional.empty());
        when(passwordEncoder.matches("admin123", "$hash-atual")).thenReturn(true);
        when(passwordEncoder.encode("nova123")).thenReturn("$hash-novo");
        when(adminRepository.save(admin)).thenReturn(admin);

        var response = adminService.atualizarPerfil(" ADMIN@ADOTAPET.COM ", request);

        assertEquals(1, response.id());
        assertEquals("Gestor AdotaPet", response.nome());
        assertEquals("000.000.000-00", response.cpf());
        assertEquals("gestor@adotapet.com", response.email());
        assertEquals("$hash-novo", admin.getSenha());
        verify(adminRepository, never()).findById(any());
    }

    @Test
    void rejeitaAtualizacaoQuandoSenhaAtualNaoConfere() {
        Admin admin = adminExistente();
        AdminUpdateRequest request = new AdminUpdateRequest(
                "Gestor AdotaPet",
                "gestor@adotapet.com",
                "errada",
                ""
        );

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("errada", "$hash-atual")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> adminService.atualizarPerfil("admin@adotapet.com", request));
        verify(adminRepository, never()).findById(any());
        verify(adminRepository, never()).save(any());
    }

    @Test
    void rejeitaEmailDuplicadoAposNormalizacao() {
        Admin admin = adminExistente();
        Admin outroAdmin = adminExistente();
        outroAdmin.setId(2);
        outroAdmin.setEmail("gestor@adotapet.com");
        AdminUpdateRequest request = new AdminUpdateRequest(
                "Gestor AdotaPet",
                " GESTOR@ADOTAPET.COM ",
                "admin123",
                ""
        );

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("admin123", "$hash-atual")).thenReturn(true);
        when(adminRepository.findByEmail("gestor@adotapet.com")).thenReturn(Optional.of(outroAdmin));

        assertThrows(RegraNegocioException.class, () -> adminService.atualizarPerfil("admin@adotapet.com", request));
        verify(adminRepository, never()).save(any());
    }

    private Admin adminExistente() {
        Admin admin = new Admin();
        admin.setId(1);
        admin.setNome("Administrador AdotaPet");
        admin.setCpf("000.000.000-00");
        admin.setEmail("admin@adotapet.com");
        admin.setSenha("$hash-atual");
        return admin;
    }
}
