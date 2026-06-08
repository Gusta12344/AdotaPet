package com.adotapet.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

class CorsConfigTest {

    @Test
    void usaOrigensConfiguradasSemWildcardQuandoCredenciaisEstaoAtivas() {
        CorsConfig corsConfig = new CorsConfig(" http://localhost:5500, http://127.0.0.1:5500 ");

        CorsConfiguration config = corsConfig
                .corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest("GET", "/animais"));

        assertEquals(List.of("http://localhost:5500", "http://127.0.0.1:5500"), config.getAllowedOrigins());
        assertNull(config.getAllowedOriginPatterns());
        assertEquals(true, config.getAllowCredentials());
        assertFalse(config.getAllowedHeaders().contains("*"));
    }
}
