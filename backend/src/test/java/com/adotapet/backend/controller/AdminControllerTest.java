package com.adotapet.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;

import com.adotapet.backend.dto.AdminResponse;
import com.adotapet.backend.dto.AdminUpdateRequest;
import com.adotapet.backend.service.AdminService;

class AdminControllerTest {

    @Test
    void atualizaPerfilDoAdminUsandoPrincipalAutenticado() {
        CapturingAdminService adminService = new CapturingAdminService();
        AdminController controller = new AdminController(adminService);
        AdminUpdateRequest request = new AdminUpdateRequest(
                "Gestor AdotaPet",
                "gestor@adotapet.com",
                "admin123",
                ""
        );

        AdminResponse response = controller.atualizar(
                new TestingAuthenticationToken("ADMIN@ADOTAPET.COM", "admin123", "ROLE_ADMIN"),
                request
        );

        assertEquals("ADMIN@ADOTAPET.COM", adminService.emailAutenticado);
        assertEquals(request, adminService.request);
        assertEquals("gestor@adotapet.com", response.email());
    }

    private static class CapturingAdminService extends AdminService {
        private String emailAutenticado;
        private AdminUpdateRequest request;

        CapturingAdminService() {
            super(null, null);
        }

        @Override
        public AdminResponse atualizarPerfil(String emailAutenticado, AdminUpdateRequest request) {
            this.emailAutenticado = emailAutenticado;
            this.request = request;
            return new AdminResponse(1, "Gestor AdotaPet", "000.000.000-00", request.email());
        }
    }
}
