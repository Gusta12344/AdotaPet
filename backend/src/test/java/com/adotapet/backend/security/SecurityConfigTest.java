package com.adotapet.backend.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import com.adotapet.backend.controller.AdminModeracaoController;
import com.adotapet.backend.controller.AnimalController;
import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.dto.ModeracaoResumoResponse;
import com.adotapet.backend.service.AnimalImagemStorageService;
import com.adotapet.backend.service.AnimalService;
import com.adotapet.backend.service.ModeracaoAdocaoService;

@WebMvcTest({AnimalController.class, AdminModeracaoController.class})
@Import({SecurityConfig.class, SecurityConfigTest.TestConfig.class})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listaPublicaDeAnimaisNaoExigeLogin() throws Exception {
        mockMvc.perform(get("/animais"))
                .andExpect(status().isOk());
    }

    @Test
    void listaPublicaDeAnimaisIgnoraAuthorizationInvalido() throws Exception {
        mockMvc.perform(get("/animais")
                        .header(HttpHeaders.AUTHORIZATION, "Basic YmFkQGV4YW1wbGUuY29tOmJhZA=="))
                .andExpect(status().isOk());
    }

    @Test
    void resumoDaModeracaoSemAuthRetorna401() throws Exception {
        mockMvc.perform(get("/admin/moderacao/resumo"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void resumoDaModeracaoComAdminPassaPelaCadeiaAdmin() throws Exception {
        mockMvc.perform(get("/admin/moderacao/resumo"))
                .andExpect(status().isOk());
    }

    @Test
    void decisaoDaModeracaoExigeAdmin() throws Exception {
        mockMvc.perform(post("/admin/moderacao/solicitacoes/12/decisao")
                        .contentType("application/json")
                        .content("{\"status\":\"aprovada\"}"))
                .andExpect(status().isUnauthorized());
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        AnimalService animalService() {
            return new AnimalService(null, null, null, null) {
                @Override
                public List<AnimalResponse> listarDisponiveis() {
                    return List.of();
                }
            };
        }

        @Bean
        UserDetailsService userDetailsService() {
            return username -> {
                throw new UsernameNotFoundException("Admin nao encontrado");
            };
        }

        @Bean
        AnimalImagemStorageService animalImagemStorageService() {
            return new AnimalImagemStorageService("uploads/animais");
        }

        @Bean
        ModeracaoAdocaoService moderacaoAdocaoService() {
            return new ModeracaoAdocaoService(null, null, null, null) {
                @Override
                public ModeracaoResumoResponse resumo() {
                    return new ModeracaoResumoResponse(0, 0, 0, 0, 0);
                }
            };
        }
    }
}
