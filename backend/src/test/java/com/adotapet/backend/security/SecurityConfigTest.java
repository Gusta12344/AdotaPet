package com.adotapet.backend.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import com.adotapet.backend.controller.AnimalController;
import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.service.AnimalImagemStorageService;
import com.adotapet.backend.service.AnimalService;

@WebMvcTest(AnimalController.class)
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
    }
}
