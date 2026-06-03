package com.adotapet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Protetor;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;
import com.adotapet.backend.dto.SolicitacaoRequest;

@ExtendWith(MockitoExtension.class)
class SolicitacaoAdocaoServiceTest {

    @Mock
    private SolicitacaoAdocaoRepository solicitacaoRepository;

    @Mock
    private AnimalRepository animalRepository;

    @Mock
    private AdotanteRepository adotanteRepository;

    @Mock
    private NotificacaoService notificacaoService;

    private SolicitacaoAdocaoService solicitacaoService;

    @BeforeEach
    void setUp() {
        solicitacaoService = new SolicitacaoAdocaoService(solicitacaoRepository, animalRepository, adotanteRepository,
                notificacaoService);
    }

    @Test
    void criaNotificacaoQuandoSolicitacaoEEnviada() {
        Adotante adotante = adotante(7);
        Animal animal = animal(3, "Nina");

        when(animalRepository.findById(3)).thenReturn(java.util.Optional.of(animal));
        when(adotanteRepository.findById(7)).thenReturn(java.util.Optional.of(adotante));
        when(solicitacaoRepository.existsByAnimalIdAndAdotanteIdAndStatus(3, 7, StatusSolicitacao.pendente))
                .thenReturn(false);
        when(solicitacaoRepository.save(any(SolicitacaoAdocao.class))).thenAnswer(invocation -> {
            SolicitacaoAdocao solicitacao = invocation.getArgument(0);
            solicitacao.setId(30);
            return solicitacao;
        });

        solicitacaoService.criar(new SolicitacaoRequest(3, 7));

        verify(notificacaoService).criar(eq(adotante), eq(TipoNotificacao.adocao),
                eq("Solicitacao enviada"), eq("Sua solicitacao para adotar Nina foi enviada e esta em analise."),
                eq("solicitacao_adocao"), eq(30));
    }

    @Test
    void listaSolicitacoesDoAdotanteDaMaisRecenteParaAMaisAntiga() {
        Adotante adotante = adotante(7);
        SolicitacaoAdocao aprovada = solicitacao(12, adotante, animal(3, "Nina"), StatusSolicitacao.aprovada,
                LocalDateTime.of(2026, 6, 2, 10, 0));
        SolicitacaoAdocao pendente = solicitacao(8, adotante, animal(4, "Thor"), StatusSolicitacao.pendente,
                LocalDateTime.of(2026, 6, 1, 10, 0));

        when(adotanteRepository.existsById(7)).thenReturn(true);
        when(solicitacaoRepository.findByAdotanteIdOrderByDataSolicitacaoDesc(7)).thenReturn(List.of(aprovada, pendente));

        var solicitacoes = solicitacaoService.listarPorAdotante(7);

        assertEquals(2, solicitacoes.size());
        assertEquals(12, solicitacoes.get(0).id());
        assertEquals("Nina", solicitacoes.get(0).animalNome());
        assertEquals(StatusSolicitacao.aprovada, solicitacoes.get(0).status());
        assertEquals(8, solicitacoes.get(1).id());
        assertEquals(StatusSolicitacao.pendente, solicitacoes.get(1).status());
    }

    @Test
    void notificaAdotanteQuandoSolicitacaoEAprovada() {
        Adotante adotante = adotante(7);
        Animal animal = animal(3, "Nina");
        SolicitacaoAdocao solicitacao = solicitacao(12, adotante, animal, StatusSolicitacao.pendente,
                LocalDateTime.of(2026, 6, 2, 10, 0));

        when(solicitacaoRepository.findById(12)).thenReturn(java.util.Optional.of(solicitacao));
        when(solicitacaoRepository.findByAnimalIdAndStatus(3, StatusSolicitacao.pendente)).thenReturn(List.of(solicitacao));

        solicitacaoService.atualizarStatus(12, StatusSolicitacao.aprovada);

        verify(notificacaoService).criar(eq(adotante), eq(TipoNotificacao.adocao),
                eq("Solicitacao aprovada"), eq("Sua solicitacao para adotar Nina foi aprovada."),
                eq("solicitacao_adocao"), eq(12));
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

    private Adotante adotante(Integer id) {
        Adotante adotante = new Adotante();
        adotante.setId(id);
        adotante.setNome("Maria Oliveira");
        adotante.setEmail("maria@email.com");
        return adotante;
    }

    private Animal animal(Integer id, String nome) {
        Protetor protetor = new Protetor();
        protetor.setId(2);
        protetor.setNome("Abrigo Amigos de Patas");

        Animal animal = new Animal();
        animal.setId(id);
        animal.setNome(nome);
        animal.setEspecie(Especie.gato);
        animal.setRaca("SRD");
        animal.setIdadeMeses(12);
        animal.setPorte(Porte.pequeno);
        animal.setSexo(Sexo.femea);
        animal.setDataResgate(LocalDate.of(2026, 1, 20));
        animal.setNivelEnergia(NivelEnergia.baixo);
        animal.setStatus(StatusAnimal.disponivel);
        animal.setProtetor(protetor);
        return animal;
    }
}
