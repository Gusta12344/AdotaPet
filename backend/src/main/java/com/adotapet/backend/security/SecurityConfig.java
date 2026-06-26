package com.adotapet.backend.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain publicSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher(new OrRequestMatcher(List.of(
                        new AntPathRequestMatcher("/**", HttpMethod.OPTIONS.name()),
                        new AntPathRequestMatcher("/animais", HttpMethod.GET.name()),
                        new AntPathRequestMatcher("/animais/**", HttpMethod.GET.name()),
                        new AntPathRequestMatcher("/uploads/**", HttpMethod.GET.name()),
                        new AntPathRequestMatcher("/adotantes", HttpMethod.POST.name()),
                        new AntPathRequestMatcher("/adotantes/**", HttpMethod.PUT.name()),
                        new AntPathRequestMatcher("/adotantes/*/favoritos", HttpMethod.GET.name()),
                        new AntPathRequestMatcher("/adotantes/*/favoritos/*", HttpMethod.POST.name()),
                        new AntPathRequestMatcher("/adotantes/*/favoritos/*", HttpMethod.DELETE.name()),
                        new AntPathRequestMatcher("/adocoes", HttpMethod.POST.name()),
                        new AntPathRequestMatcher("/adocoes/adotantes/*", HttpMethod.GET.name()),
                        new AntPathRequestMatcher("/adocoes/*/cancelamento", HttpMethod.POST.name()),
                        new AntPathRequestMatcher("/notificacoes/adotantes/*", HttpMethod.GET.name()),
                        new AntPathRequestMatcher("/notificacoes/adotantes/*", HttpMethod.DELETE.name()),
                        new AntPathRequestMatcher("/notificacoes/adotantes/*/lidas", HttpMethod.PUT.name()),
                        new AntPathRequestMatcher("/notificacoes/*/lida", HttpMethod.PUT.name()),
                        new AntPathRequestMatcher("/auth/login", HttpMethod.POST.name()),
                        new AntPathRequestMatcher("/admin/login", HttpMethod.POST.name()),
                        new AntPathRequestMatcher("/error")
                )))
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .httpBasic(AbstractHttpConfigurer::disable)
                .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain adminSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/animais").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/animais/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/animais/**").hasRole("ADMIN")
                        .requestMatchers("/admin/**").hasRole("ADMIN")
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
