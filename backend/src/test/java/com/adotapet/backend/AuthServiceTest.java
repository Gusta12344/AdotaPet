package com.adotapet.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.adotapet.backend.dto.LoginResponse;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.repository.AdminRepository;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.service.AuthService;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AdotanteRepository adotanteRepository;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(adotanteRepository, adminRepository, passwordEncoder);
    }

    @Test
    void autenticaAdotantePorCpfESenha() {
        Adotante adotante = new Adotante();
        adotante.setId(7);
        adotante.setNome("Maria Oliveira");
        adotante.setCpf("111.111.111-11");
        adotante.setEmail("maria@email.com");
        adotante.setTelefone("(47) 99901-0001");
        adotante.setEndereco("Rua das Flores, 100");
        adotante.setTipoMoradia(com.adotapet.backend.model.TipoMoradia.apartamento);
        adotante.setNivelAtividade(com.adotapet.backend.model.NivelAtividade.moderado);
        adotante.setPreferenciaPorte(com.adotapet.backend.model.Porte.pequeno);
        adotante.setPreferenciaEspecie(com.adotapet.backend.model.Especie.gato);
        adotante.setSenha("$hash-adotante");

        when(adotanteRepository.findByCpf("111.111.111-11")).thenReturn(Optional.of(adotante));
        when(passwordEncoder.matches("maria123", "$hash-adotante")).thenReturn(true);

        LoginResponse response = authService.login("111.111.111-11", "maria123");

        assertEquals("adotante", response.tipo());
        assertEquals(7, response.id());
        assertEquals("Maria Oliveira", response.nome());
        assertEquals("111.111.111-11", response.cpf());
        assertEquals("maria@email.com", response.email());
    }

    @Test
    void autenticaAdotanteQuandoCpfFoiSalvoSemMascara() {
        Adotante adotante = new Adotante();
        adotante.setId(8);
        adotante.setNome("Mariana Costa");
        adotante.setCpf("11111111111");
        adotante.setEmail("mariana@email.com");
        adotante.setTelefone("(47) 99901-0001");
        adotante.setEndereco("Rua das Flores, 100");
        adotante.setTipoMoradia(com.adotapet.backend.model.TipoMoradia.apartamento);
        adotante.setNivelAtividade(com.adotapet.backend.model.NivelAtividade.moderado);
        adotante.setPreferenciaPorte(com.adotapet.backend.model.Porte.pequeno);
        adotante.setPreferenciaEspecie(com.adotapet.backend.model.Especie.gato);
        adotante.setSenha("$hash-adotante");

        when(adotanteRepository.findByCpf("111.111.111-11")).thenReturn(Optional.empty());
        when(adotanteRepository.findByCpf("11111111111")).thenReturn(Optional.of(adotante));
        when(passwordEncoder.matches("admin123", "$hash-adotante")).thenReturn(true);

        LoginResponse response = authService.login("111.111.111-11", "admin123");

        assertEquals("adotante", response.tipo());
        assertEquals(8, response.id());
        assertEquals("Mariana Costa", response.nome());
        assertEquals("11111111111", response.cpf());
    }

    @Test
    void autenticaAdminPorCpfESenha() {
        Admin admin = new Admin();
        admin.setId(1);
        admin.setNome("Administrador AdotaPet");
        admin.setCpf("000.000.000-00");
        admin.setEmail("admin@adotapet.com");
        admin.setSenha("$hash-admin");

        when(adotanteRepository.findByCpf("000.000.000-00")).thenReturn(Optional.empty());
        when(adminRepository.findByCpf("000.000.000-00")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("admin123", "$hash-admin")).thenReturn(true);

        LoginResponse response = authService.login("000.000.000-00", "admin123");

        assertEquals("admin", response.tipo());
        assertEquals(1, response.id());
        assertEquals("Administrador AdotaPet", response.nome());
        assertEquals("000.000.000-00", response.cpf());
        assertEquals("admin@adotapet.com", response.email());
    }

    @Test
    void rejeitaSenhaInvalida() {
        Adotante adotante = new Adotante();
        adotante.setCpf("111.111.111-11");
        adotante.setSenha("$hash-adotante");

        when(adotanteRepository.findByCpf("111.111.111-11")).thenReturn(Optional.of(adotante));
        when(passwordEncoder.matches("errada", "$hash-adotante")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login("111.111.111-11", "errada"));
    }
}
