package com.adotapet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.jpa.repository.EntityGraph;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.adotapet.backend.dto.ModeracaoDecisaoRequest;
import com.adotapet.backend.dto.ModeracaoFinalizacaoRequest;
import com.adotapet.backend.dto.ModeracaoReversaoFinalizacaoRequest;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.NivelAtencao;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Protetor;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.model.SolicitacaoModeracaoEvento;
import com.adotapet.backend.model.TipoMoradia;
import com.adotapet.backend.model.TipoEventoModeracao;
import com.adotapet.backend.model.TipoFinalizacaoAdocao;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.repository.AdminRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;
import com.adotapet.backend.repository.SolicitacaoModeracaoEventoRepository;

@ExtendWith(MockitoExtension.class)
class ModeracaoAdocaoServiceTest {

    @Mock
    private SolicitacaoAdocaoRepository solicitacaoRepository;

    @Mock
    private SolicitacaoModeracaoEventoRepository eventoRepository;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private NotificacaoService notificacaoService;

    private ModeracaoAdocaoService moderacaoService;

    @BeforeEach
    void setUp() {
        moderacaoService = new ModeracaoAdocaoService(solicitacaoRepository, eventoRepository, adminRepository,
                notificacaoService);
    }

    @Test
    void consultaDaFilaCarregaImagensDoAnimalParaMiniaturas() throws NoSuchMethodException {
        Method method = SolicitacaoAdocaoRepository.class.getMethod("findAllByOrderByDataSolicitacaoAsc");
        EntityGraph entityGraph = method.getAnnotation(EntityGraph.class);

        assertNotNull(entityGraph);
        assertTrue(Arrays.asList(entityGraph.attributePaths()).contains("animal.imagens"));
    }

    @Test
    void listaFilaAgrupadaPorAnimalECalculaPosicaoPorChegada() {
        Animal luna = animal(3, "Luna");
        SolicitacaoAdocao primeira = solicitacao(12, adotante(7, "Lucas"), luna, StatusSolicitacao.pendente,
                LocalDateTime.of(2026, 6, 7, 9, 15));
        SolicitacaoAdocao segunda = solicitacao(13, adotante(8, "Beatriz"), luna, StatusSolicitacao.pendente,
                LocalDateTime.of(2026, 6, 7, 10, 15));

        when(solicitacaoRepository.findAllByOrderByDataSolicitacaoAsc()).thenReturn(List.of(primeira, segunda));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of(primeira, segunda));

        var fila = moderacaoService.listarFila(StatusSolicitacao.pendente, "luna", "mais_antigas");

        assertEquals(1, fila.size());
        assertEquals("Luna", fila.get(0).animalNome());
        assertEquals(Especie.cao, fila.get(0).especie());
        assertEquals(2, fila.get(0).totalAtivas());
        assertEquals(1, fila.get(0).solicitacoes().get(0).posicaoFila());
        assertEquals(2, fila.get(0).solicitacoes().get(1).posicaoFila());
    }

    @Test
    void listaSolicitacoesOrdenaPorAtencaoEPaginaResultado() {
        LocalDateTime agora = LocalDateTime.now();
        Animal thor = animal(3, "Thor");
        thor.setDataDisponivelAdocao(agora.minusDays(120));
        Animal luna = animal(4, "Luna");
        luna.setDataDisponivelAdocao(agora.minusDays(40));
        Animal nina = animal(5, "Nina");
        nina.setDataDisponivelAdocao(agora.minusDays(5));
        SolicitacaoAdocao alta = solicitacao(12, adotante(7, "Lucas"), thor, StatusSolicitacao.em_analise,
                agora.minusDays(4));
        alta.setDataInicioAnalise(agora.minusDays(3));
        SolicitacaoAdocao media = solicitacao(13, adotante(8, "Beatriz"), luna, StatusSolicitacao.pendente,
                agora.minusDays(2));
        SolicitacaoAdocao baixa = solicitacao(14, adotante(9, "Mariana"), nina, StatusSolicitacao.pendente,
                agora);

        when(solicitacaoRepository.findAllByOrderByDataSolicitacaoAsc()).thenReturn(List.of(baixa, media, alta));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of(alta));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(4), any()))
                .thenReturn(List.of(media));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(5), any()))
                .thenReturn(List.of(baixa));

        var pagina = moderacaoService.listarSolicitacoes(null, null, null, null, null, "atencao", 0, 2);

        assertEquals(3, pagina.totalItens());
        assertEquals(2, pagina.itens().size());
        assertEquals(2, pagina.totalPaginas());
        assertEquals(1, pagina.altaAtencao());
        assertEquals(1, pagina.mediaAtencao());
        assertEquals(1, pagina.baixaAtencao());
        assertEquals(12, pagina.itens().get(0).id());
        assertEquals(NivelAtencao.alta, pagina.itens().get(0).nivelAtencao());
        assertTrue(pagina.itens().get(0).motivoAtencao().contains("Solicitacao"));
        assertEquals(13, pagina.itens().get(1).id());
        assertEquals(NivelAtencao.media, pagina.itens().get(1).nivelAtencao());

        var ultimaPagina = moderacaoService.listarSolicitacoes(null, null, null, null, null, "atencao", 99, 2);

        assertEquals(1, ultimaPagina.pagina());
        assertEquals(1, ultimaPagina.itens().size());
        assertEquals(14, ultimaPagina.itens().get(0).id());
    }

    @Test
    void listaSolicitacoesFiltraPorAtencaoEspecieEPerfilDaFila() {
        LocalDateTime agora = LocalDateTime.now();
        Animal thor = animal(3, "Thor");
        thor.setDataDisponivelAdocao(agora.minusDays(120));
        Animal nina = animal(5, "Nina");
        nina.setEspecie(Especie.gato);
        nina.setDataDisponivelAdocao(agora.minusDays(120));
        SolicitacaoAdocao primeira = solicitacao(12, adotante(7, "Lucas"), thor, StatusSolicitacao.pendente,
                agora.minusDays(4));
        SolicitacaoAdocao segunda = solicitacao(13, adotante(8, "Beatriz"), thor, StatusSolicitacao.pendente,
                agora.minusDays(3));
        SolicitacaoAdocao gato = solicitacao(14, adotante(9, "Mariana"), nina, StatusSolicitacao.pendente,
                agora.minusDays(4));

        when(solicitacaoRepository.findAllByOrderByDataSolicitacaoAsc()).thenReturn(List.of(primeira, segunda, gato));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of(primeira, segunda));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(5), any()))
                .thenReturn(List.of(gato));

        var pagina = moderacaoService.listarSolicitacoes(null, NivelAtencao.alta, Especie.cao, "com_fila",
                "thor", "mais_antigas", 0, 10);

        assertEquals(2, pagina.totalItens());
        assertEquals(2, pagina.itens().size());
        assertEquals(12, pagina.itens().get(0).id());
        assertEquals(1, pagina.animaisComFila());
        assertEquals(3, pagina.aguardandoDecisao());
        assertTrue(pagina.itens().stream().allMatch(item -> item.animalNome().equals("Thor")));

        var primeiraDaFila = moderacaoService.listarSolicitacoes(null, NivelAtencao.alta, Especie.cao,
                "primeiro_da_fila", "thor", "mais_antigas", 0, 10);

        assertEquals(1, primeiraDaFila.totalItens());
        assertEquals(12, primeiraDaFila.itens().get(0).id());
    }

    @Test
    void iniciarAnaliseMudaStatusPendenteERegistraEvento() {
        Admin admin = admin();
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), animal(3, "Luna"),
                StatusSolicitacao.pendente, LocalDateTime.of(2026, 6, 7, 9, 15));

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of(solicitacao));
        when(eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(12)).thenReturn(List.of());

        var detalhe = moderacaoService.iniciarAnalise(12, "admin@adotapet.com");

        assertEquals(StatusSolicitacao.em_analise, detalhe.status());
        assertEquals(StatusAnimal.em_analise, solicitacao.getAnimal().getStatus());
        verify(eventoRepository).save(any());
    }

    @Test
    void aprovarExigePrimeiraPosicaoERecusaOutrasAtivas() {
        Admin admin = admin();
        Animal luna = animal(3, "Luna");
        SolicitacaoAdocao primeira = solicitacao(12, adotante(7, "Lucas"), luna, StatusSolicitacao.em_analise,
                LocalDateTime.of(2026, 6, 7, 9, 15));
        SolicitacaoAdocao segunda = solicitacao(13, adotante(8, "Beatriz"), luna, StatusSolicitacao.pendente,
                LocalDateTime.of(2026, 6, 7, 10, 15));

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(primeira));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of(primeira, segunda));
        when(eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(12)).thenReturn(List.of());

        var response = moderacaoService.decidir(12, "admin@adotapet.com",
                new ModeracaoDecisaoRequest(StatusSolicitacao.aprovada, false, false, false, "Ok"));

        assertEquals(StatusSolicitacao.aprovada, primeira.getStatus());
        assertEquals(StatusSolicitacao.recusada, segunda.getStatus());
        assertEquals(StatusAnimal.em_analise, luna.getStatus());
        assertEquals(1, response.solicitacoesRecusadasAutomaticamente());
        verify(notificacaoService).criar(eq(primeira.getAdotante()), eq(TipoNotificacao.adocao), eq("Solicitacao aprovada"),
                any(), eq("solicitacao_adocao"), eq(12));
    }

    @Test
    void aprovarForaDaPrimeiraPosicaoFalha() {
        Admin admin = admin();
        Animal luna = animal(3, "Luna");
        SolicitacaoAdocao primeira = solicitacao(12, adotante(7, "Lucas"), luna, StatusSolicitacao.pendente,
                LocalDateTime.of(2026, 6, 7, 9, 15));
        SolicitacaoAdocao segunda = solicitacao(13, adotante(8, "Beatriz"), luna, StatusSolicitacao.pendente,
                LocalDateTime.of(2026, 6, 7, 10, 15));

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(solicitacaoRepository.findDetalheById(13)).thenReturn(Optional.of(segunda));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of(primeira, segunda));

        assertThrows(RegraNegocioException.class, () -> moderacaoService.decidir(13, "admin@adotapet.com",
                new ModeracaoDecisaoRequest(StatusSolicitacao.aprovada, true, true, true, "")));
    }

    @Test
    void finalizarAprovadaComoConcluidaMarcaFinalizadaEAgendaExclusaoDoAnimal() {
        Admin admin = admin();
        Animal luna = animal(3, "Luna");
        luna.setStatus(StatusAnimal.adotado);
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), luna, StatusSolicitacao.aprovada,
                LocalDateTime.of(2026, 6, 7, 9, 15));

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of());
        when(eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(12)).thenReturn(List.of());

        var response = moderacaoService.finalizar(12, "admin@adotapet.com",
                new ModeracaoFinalizacaoRequest(TipoFinalizacaoAdocao.adocao_concluida, "Animal entregue a familia."));

        assertEquals(StatusSolicitacao.finalizada, response.solicitacao().status());
        assertEquals(StatusAnimal.adotado, luna.getStatus());
        assertNotNull(luna.getDataExclusaoAgendada());
        assertTrue(luna.getDataExclusaoAgendada().isAfter(LocalDateTime.now().plusDays(6)));
        assertTrue(luna.getDataExclusaoAgendada().isBefore(LocalDateTime.now().plusDays(8)));
        verify(eventoRepository).save(any());
    }

    @Test
    void finalizarAprovadaComoCanceladaDevolveAnimalParaDisponivel() {
        Admin admin = admin();
        Animal luna = animal(3, "Luna");
        luna.setStatus(StatusAnimal.adotado);
        luna.setDataExclusaoAgendada(LocalDateTime.now().plusDays(7));
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), luna, StatusSolicitacao.aprovada,
                LocalDateTime.of(2026, 6, 7, 9, 15));

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of());
        when(eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(12)).thenReturn(List.of());

        var response = moderacaoService.finalizar(12, "admin@adotapet.com",
                new ModeracaoFinalizacaoRequest(TipoFinalizacaoAdocao.adocao_cancelada, "Familia desistiu da adocao."));

        assertEquals(StatusSolicitacao.finalizada, response.solicitacao().status());
        assertEquals(StatusAnimal.disponivel, luna.getStatus());
        assertNull(luna.getDataExclusaoAgendada());
        assertNotNull(luna.getDataDisponivelAdocao());
        verify(eventoRepository).save(any());
    }

    @Test
    void reverterFinalizacaoConcluidaCancelaExclusaoEVoltaAnimalParaDisponivel() {
        Admin admin = admin();
        Animal luna = animal(3, "Luna");
        luna.setStatus(StatusAnimal.adotado);
        luna.setDataExclusaoAgendada(LocalDateTime.now().plusDays(2));
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), luna, StatusSolicitacao.finalizada,
                LocalDateTime.of(2026, 6, 7, 9, 15));
        solicitacao.setDataFinalizacao(LocalDateTime.now().minusDays(5));

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of());
        when(eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(12)).thenReturn(List.of());

        var response = moderacaoService.reverterFinalizacao(12, "admin@adotapet.com",
                new ModeracaoReversaoFinalizacaoRequest("Animal voltou para o abrigo depois de 5 dias."));

        assertEquals(StatusSolicitacao.finalizada, response.solicitacao().status());
        assertFalse(response.solicitacao().podeReverterFinalizacao());
        assertEquals(StatusAnimal.disponivel, luna.getStatus());
        assertNull(luna.getDataExclusaoAgendada());
        assertNotNull(luna.getDataDisponivelAdocao());

        ArgumentCaptor<SolicitacaoModeracaoEvento> eventoCaptor = ArgumentCaptor
                .forClass(SolicitacaoModeracaoEvento.class);
        verify(eventoRepository).save(eventoCaptor.capture());
        assertEquals(TipoEventoModeracao.adocao_cancelada, eventoCaptor.getValue().getTipo());
        assertTrue(eventoCaptor.getValue().getObservacao().contains("Animal voltou para o abrigo depois de 5 dias."));
    }

    @Test
    void detalheDeFinalizacaoConcluidaSemAgendaAindaPermiteVoltarAtras() {
        Animal luna = animal(3, "Luna");
        luna.setStatus(StatusAnimal.adotado);
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), luna, StatusSolicitacao.finalizada,
                LocalDateTime.of(2026, 6, 7, 9, 15));

        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of());
        when(eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(12)).thenReturn(List.of());

        var detalhe = moderacaoService.detalhe(12);

        assertTrue(detalhe.podeReverterFinalizacao());
    }

    @Test
    void reverterFinalizacaoConcluidaSemAgendaVoltaAnimalParaDisponivel() {
        Admin admin = admin();
        Animal luna = animal(3, "Luna");
        luna.setStatus(StatusAnimal.adotado);
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), luna, StatusSolicitacao.finalizada,
                LocalDateTime.of(2026, 6, 7, 9, 15));

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of());
        when(eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(12)).thenReturn(List.of());

        var response = moderacaoService.reverterFinalizacao(12, "admin@adotapet.com",
                new ModeracaoReversaoFinalizacaoRequest("Animal voltou sem agenda preenchida."));

        assertEquals(StatusSolicitacao.finalizada, response.solicitacao().status());
        assertEquals(StatusAnimal.disponivel, luna.getStatus());
        assertNull(luna.getDataExclusaoAgendada());
        assertNotNull(luna.getDataDisponivelAdocao());
    }

    @Test
    void excluiSolicitacaoFinalizadaRemovendoEventosAntesDaSolicitacao() {
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), animal(3, "Luna"),
                StatusSolicitacao.finalizada, LocalDateTime.of(2026, 6, 7, 9, 15));

        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));

        moderacaoService.excluirSolicitacao(12);

        verify(eventoRepository).deleteBySolicitacaoId(12);
        verify(solicitacaoRepository).delete(solicitacao);
    }

    @Test
    void excluiSolicitacaoCancelada() {
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), animal(3, "Luna"),
                StatusSolicitacao.cancelada, LocalDateTime.of(2026, 6, 7, 9, 15));

        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));

        moderacaoService.excluirSolicitacao(12);

        verify(eventoRepository).deleteBySolicitacaoId(12);
        verify(solicitacaoRepository).delete(solicitacao);
    }

    @Test
    void naoExcluiSolicitacaoAindaAtiva() {
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante(7, "Lucas"), animal(3, "Luna"),
                StatusSolicitacao.em_analise, LocalDateTime.of(2026, 6, 7, 9, 15));

        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(solicitacao));

        assertThrows(RegraNegocioException.class, () -> moderacaoService.excluirSolicitacao(12));
    }

    private Admin admin() {
        Admin admin = new Admin();
        admin.setId(1);
        admin.setNome("Ana Duarte");
        admin.setEmail("admin@adotapet.com");
        return admin;
    }

    private SolicitacaoAdocao solicitacao(Integer id, Adotante adotante, Animal animal, StatusSolicitacao status,
            LocalDateTime dataSolicitacao) {
        SolicitacaoAdocao solicitacao = new SolicitacaoAdocao();
        solicitacao.setId(id);
        solicitacao.setAdotante(adotante);
        solicitacao.setAnimal(animal);
        solicitacao.setStatus(status);
        solicitacao.setDataSolicitacao(dataSolicitacao);
        return solicitacao;
    }

    private Adotante adotante(Integer id, String nome) {
        Adotante adotante = new Adotante();
        adotante.setId(id);
        adotante.setNome(nome);
        adotante.setEmail(nome.toLowerCase() + "@email.com");
        adotante.setTelefone("(11) 98765-4321");
        adotante.setEndereco("Sao Paulo, SP");
        adotante.setTipoMoradia(TipoMoradia.casa_com_quintal);
        adotante.setNivelAtividade(NivelAtividade.ativo);
        adotante.setPreferenciaPorte(Porte.medio);
        adotante.setPreferenciaEspecie(Especie.cao);
        return adotante;
    }

    private Animal animal(Integer id, String nome) {
        Protetor protetor = new Protetor();
        protetor.setId(2);
        protetor.setNome("Abrigo");

        Animal animal = new Animal();
        animal.setId(id);
        animal.setNome(nome);
        animal.setEspecie(Especie.cao);
        animal.setRaca("SRD");
        animal.setIdadeMeses(24);
        animal.setPorte(Porte.medio);
        animal.setSexo(Sexo.femea);
        animal.setDataResgate(LocalDate.of(2026, 1, 20));
        animal.setNivelEnergia(NivelEnergia.medio);
        animal.setStatus(StatusAnimal.em_analise);
        animal.setProtetor(protetor);
        return animal;
    }
}
