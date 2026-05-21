package com.adotapet.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/animais/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/adotantes").permitAll()
                        .requestMatchers(HttpMethod.POST, "/adocoes").permitAll()
                        .requestMatchers(HttpMethod.POST, "/admin/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/animais").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/animais/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/adocoes").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/adocoes/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .httpBasic(Customizer.withDefaults())
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
