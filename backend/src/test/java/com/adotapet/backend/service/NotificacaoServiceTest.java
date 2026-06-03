package com.adotapet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Notificacao;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.NotificacaoRepository;

@ExtendWith(MockitoExtension.class)
class NotificacaoServiceTest {

    @Mock
    private NotificacaoRepository notificacaoRepository;

    @Mock
    private AdotanteRepository adotanteRepository;

    private NotificacaoService notificacaoService;

    @BeforeEach
    void setUp() {
        notificacaoService = new NotificacaoService(notificacaoRepository, adotanteRepository);
    }

    @Test
    void listaNotificacoesDoAdotanteDaMaisRecenteParaAMaisAntiga() {
        Adotante adotante = adotante(7);
        Notificacao aprovada = notificacao(22, adotante, "Solicitacao aprovada", false,
                LocalDateTime.of(2026, 6, 3, 10, 0));
        Notificacao favorito = notificacao(21, adotante, "Favoritos atualizados", true,
                LocalDateTime.of(2026, 6, 2, 10, 0));

        when(adotanteRepository.existsById(7)).thenReturn(true);
        when(notificacaoRepository.findByAdotanteIdOrderByDataCriacaoDesc(7)).thenReturn(List.of(aprovada, favorito));

        var notificacoes = notificacaoService.listarPorAdotante(7);

        assertEquals(2, notificacoes.size());
        assertEquals(22, notificacoes.get(0).id());
        assertEquals("Solicitacao aprovada", notificacoes.get(0).titulo());
        assertEquals(false, notificacoes.get(0).lida());
        assertEquals(21, notificacoes.get(1).id());
    }

    @Test
    void marcaTodasAsNotificacoesDoAdotanteComoLidas() {
        Adotante adotante = adotante(7);
        Notificacao aprovada = notificacao(22, adotante, "Solicitacao aprovada", false,
                LocalDateTime.of(2026, 6, 3, 10, 0));

        when(adotanteRepository.existsById(7)).thenReturn(true);
        when(notificacaoRepository.findByAdotanteIdAndLidaFalseOrderByDataCriacaoDesc(7)).thenReturn(List.of(aprovada));
        when(notificacaoRepository.findByAdotanteIdOrderByDataCriacaoDesc(7)).thenReturn(List.of(aprovada));

        var notificacoes = notificacaoService.marcarTodasComoLidas(7);

        assertTrue(aprovada.isLida());
        assertTrue(notificacoes.get(0).lida());
    }

    private Adotante adotante(Integer id) {
        Adotante adotante = new Adotante();
        adotante.setId(id);
        adotante.setNome("Maria Oliveira");
        adotante.setEmail("maria@email.com");
        return adotante;
    }

    private Notificacao notificacao(Integer id, Adotante adotante, String titulo, boolean lida,
            LocalDateTime dataCriacao) {
        Notificacao notificacao = new Notificacao();
        notificacao.setId(id);
        notificacao.setAdotante(adotante);
        notificacao.setTipo(TipoNotificacao.adocao);
        notificacao.setTitulo(titulo);
        notificacao.setMensagem(titulo + ".");
        notificacao.setLida(lida);
        notificacao.setDataCriacao(dataCriacao);
        notificacao.setReferenciaTipo("solicitacao_adocao");
        notificacao.setReferenciaId(12);
        return notificacao;
    }
}
