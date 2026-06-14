package com.adotapet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.adotapet.backend.dto.ModeracaoDecisaoRequest;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Protetor;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.model.TipoMoradia;
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
        primeira.setDadosAdotanteConferidos(true);
        primeira.setAnimalDisponivelConferido(true);
        primeira.setContatoRevisado(true);
        SolicitacaoAdocao segunda = solicitacao(13, adotante(8, "Beatriz"), luna, StatusSolicitacao.pendente,
                LocalDateTime.of(2026, 6, 7, 10, 15));

        when(adminRepository.findByEmail("admin@adotapet.com")).thenReturn(Optional.of(admin));
        when(solicitacaoRepository.findDetalheById(12)).thenReturn(Optional.of(primeira));
        when(solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(eq(3), any()))
                .thenReturn(List.of(primeira, segunda));
        when(eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(12)).thenReturn(List.of());

        var response = moderacaoService.decidir(12, "admin@adotapet.com",
                new ModeracaoDecisaoRequest(StatusSolicitacao.aprovada, true, true, true, "Ok"));

        assertEquals(StatusSolicitacao.aprovada, primeira.getStatus());
        assertEquals(StatusSolicitacao.recusada, segunda.getStatus());
        assertEquals(StatusAnimal.adotado, luna.getStatus());
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
