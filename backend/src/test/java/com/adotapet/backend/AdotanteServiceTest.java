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

import com.adotapet.backend.dto.AdotanteUpdateRequest;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.TipoMoradia;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.service.AdotanteService;

@ExtendWith(MockitoExtension.class)
class AdotanteServiceTest {

    @Mock
    private AdotanteRepository adotanteRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdotanteService adotanteService;

    @BeforeEach
    void setUp() {
        adotanteService = new AdotanteService(adotanteRepository, passwordEncoder);
    }

    @Test
    void atualizaDadosPessoaisQuandoSenhaAtualConfere() {
        Adotante adotante = adotanteExistente();
        AdotanteUpdateRequest request = new AdotanteUpdateRequest(
                "Maria Souza",
                "maria.souza@email.com",
                "(47) 98888-0000",
                "Rua Nova, 22",
                TipoMoradia.casa_com_quintal,
                true,
                true,
                NivelAtividade.ativo,
                Porte.grande,
                Especie.cao,
                "maria123",
                "nova123"
        );

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(adotante));
        when(passwordEncoder.matches("maria123", "$hash-atual")).thenReturn(true);
        when(passwordEncoder.encode("nova123")).thenReturn("$hash-novo");
        when(adotanteRepository.save(adotante)).thenReturn(adotante);

        var response = adotanteService.atualizar(7, request);

        assertEquals("Maria Souza", response.nome());
        assertEquals("111.111.111-11", response.cpf());
        assertEquals("maria.souza@email.com", response.email());
        assertEquals("(47) 98888-0000", response.telefone());
        assertEquals("Rua Nova, 22", response.endereco());
        assertEquals(TipoMoradia.casa_com_quintal, response.tipoMoradia());
        assertEquals("$hash-novo", adotante.getSenha());
    }

    @Test
    void rejeitaAtualizacaoQuandoSenhaAtualNaoConfere() {
        Adotante adotante = adotanteExistente();
        AdotanteUpdateRequest request = new AdotanteUpdateRequest(
                "Maria Souza",
                "maria.souza@email.com",
                "(47) 98888-0000",
                "Rua Nova, 22",
                TipoMoradia.casa_com_quintal,
                true,
                true,
                NivelAtividade.ativo,
                Porte.grande,
                Especie.cao,
                "errada",
                ""
        );

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(adotante));
        when(passwordEncoder.matches("errada", "$hash-atual")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> adotanteService.atualizar(7, request));
        verify(adotanteRepository, never()).save(any());
    }

    private Adotante adotanteExistente() {
        Adotante adotante = new Adotante();
        adotante.setId(7);
        adotante.setNome("Maria Oliveira");
        adotante.setCpf("111.111.111-11");
        adotante.setEmail("maria@email.com");
        adotante.setTelefone("(47) 99901-0001");
        adotante.setEndereco("Rua Antiga, 10");
        adotante.setTipoMoradia(TipoMoradia.apartamento);
        adotante.setTemCriancas(false);
        adotante.setTemOutrosAnimais(false);
        adotante.setNivelAtividade(NivelAtividade.moderado);
        adotante.setPreferenciaPorte(Porte.pequeno);
        adotante.setPreferenciaEspecie(Especie.gato);
        adotante.setSenha("$hash-atual");
        return adotante;
    }
}
