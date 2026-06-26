package com.adotapet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.adotapet.backend.dto.AnimalRequest;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Protetor;
import com.adotapet.backend.model.Sexo;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.TipoMoradia;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.FavoritoAnimalRepository;
import com.adotapet.backend.repository.ProtetorRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;
import com.adotapet.backend.repository.SolicitacaoModeracaoEventoRepository;

@ExtendWith(MockitoExtension.class)
class AnimalServiceTest {

    @Mock
    private AnimalRepository animalRepository;

    @Mock
    private ProtetorRepository protetorRepository;

    @Mock
    private AdotanteRepository adotanteRepository;

    @Mock
    private AnimalImagemStorageService animalImagemStorageService;

    @Mock
    private FavoritoAnimalRepository favoritoAnimalRepository;

    @Mock
    private SolicitacaoAdocaoRepository solicitacaoAdocaoRepository;

    @Mock
    private SolicitacaoModeracaoEventoRepository solicitacaoModeracaoEventoRepository;

    private AnimalService animalService;

    @BeforeEach
    void setUp() {
        animalService = new AnimalService(animalRepository, protetorRepository, adotanteRepository,
                animalImagemStorageService, favoritoAnimalRepository, solicitacaoAdocaoRepository,
                solicitacaoModeracaoEventoRepository);
    }

    @Test
    void pontuaConvivenciaComOutrosAnimaisQuandoAnimalAceitaCaesOuGatos() {
        Adotante adotante = adotanteComOutrosAnimais();
        Animal animal = animalBase();
        animal.setBomComCaes(true);
        animal.setBomComGatos(false);

        assertEquals(100, animalService.calcularScore(adotante, animal));
    }

    @Test
    void naoPontuaConvivenciaComOutrosAnimaisQuandoAnimalNaoAceitaCaesNemGatos() {
        Adotante adotante = adotanteComOutrosAnimais();
        Animal animal = animalBase();
        animal.setBomComCaes(false);
        animal.setBomComGatos(false);

        assertEquals(80, animalService.calcularScore(adotante, animal));
    }

    @Test
    void listaTodosOsAnimaisParaAdministracao() {
        Animal luna = animalBase();
        luna.setId(10);
        luna.setNome("Luna");
        luna.setStatus(StatusAnimal.adotado);
        luna.setDataCadastro(LocalDateTime.of(2026, 6, 1, 9, 0));
        luna.setProtetor(protetor(2));

        when(animalRepository.findAllByOrderByDataCadastroAsc()).thenReturn(List.of(luna));

        var animais = animalService.listarTodos();

        assertEquals(1, animais.size());
        assertEquals(10, animais.get(0).id());
        assertEquals(StatusAnimal.adotado, animais.get(0).status());
    }

    @Test
    void listagemPublicaIncluiEmAnaliseEExcluiAdotados() {
        Animal disponivel = animalBase();
        disponivel.setId(10);
        disponivel.setNome("Luna");
        disponivel.setStatus(StatusAnimal.disponivel);
        disponivel.setDataCadastro(LocalDateTime.of(2026, 6, 1, 9, 0));
        disponivel.setProtetor(protetor(2));
        Animal emAnalise = animalBase();
        emAnalise.setId(11);
        emAnalise.setNome("Thor");
        emAnalise.setStatus(StatusAnimal.em_analise);
        emAnalise.setDataCadastro(LocalDateTime.of(2026, 6, 2, 9, 0));
        emAnalise.setProtetor(protetor(2));

        when(animalRepository.findByStatusInOrderByDataCadastroAsc(
                List.of(StatusAnimal.disponivel, StatusAnimal.em_analise)))
                .thenReturn(List.of(disponivel, emAnalise));

        var animais = animalService.listarDisponiveis();

        assertEquals(2, animais.size());
        assertEquals(StatusAnimal.disponivel, animais.get(0).status());
        assertEquals(StatusAnimal.em_analise, animais.get(1).status());
    }

    @Test
    void recomendacoesPublicasIncluemEmAnaliseEExcluemAdotados() {
        Adotante adotante = adotanteComOutrosAnimais();
        adotante.setId(7);
        Animal disponivel = animalBase();
        disponivel.setId(10);
        disponivel.setNome("Luna");
        disponivel.setStatus(StatusAnimal.disponivel);
        disponivel.setDataCadastro(LocalDateTime.of(2026, 6, 1, 9, 0));
        disponivel.setProtetor(protetor(2));
        Animal emAnalise = animalBase();
        emAnalise.setId(11);
        emAnalise.setNome("Thor");
        emAnalise.setStatus(StatusAnimal.em_analise);
        emAnalise.setDataCadastro(LocalDateTime.of(2026, 6, 2, 9, 0));
        emAnalise.setProtetor(protetor(2));

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(adotante));
        when(animalRepository.findByStatusInOrderByDataCadastroAsc(
                List.of(StatusAnimal.disponivel, StatusAnimal.em_analise)))
                .thenReturn(List.of(disponivel, emAnalise));

        var recomendacoes = animalService.recomendarParaAdotante(7);

        assertEquals(2, recomendacoes.size());
        assertEquals(StatusAnimal.disponivel, recomendacoes.get(0).animal().status());
        assertEquals(StatusAnimal.em_analise, recomendacoes.get(1).animal().status());
    }

    @Test
    void atualizaDadosCadastraisDoAnimal() {
        Animal animal = animalBase();
        animal.setId(10);
        animal.setNome("Luna");
        animal.setStatus(StatusAnimal.disponivel);
        animal.setDataCadastro(LocalDateTime.of(2026, 6, 1, 9, 0));
        animal.setProtetor(protetor(1));
        AnimalRequest request = new AnimalRequest(
                "Mel",
                Especie.gato,
                "SRD",
                18,
                Porte.pequeno,
                Sexo.femea,
                LocalDate.of(2026, 5, 20),
                NivelEnergia.medio,
                true,
                false,
                true,
                false,
                true,
                true,
                true,
                true,
                "Animal carinhoso.",
                2
        );

        when(animalRepository.findById(10)).thenReturn(Optional.of(animal));
        when(protetorRepository.findById(2)).thenReturn(Optional.of(protetor(2)));

        var response = animalService.atualizar(10, request);

        assertEquals("Mel", response.nome());
        assertEquals(Especie.gato, response.especie());
        assertEquals(18, response.idadeMeses());
        assertEquals(2, response.protetorId());
        assertEquals(StatusAnimal.disponivel, response.status());
    }

    @Test
    void excluiAnimalExistente() {
        Animal animal = animalBase();
        animal.setId(10);

        when(animalRepository.findById(10)).thenReturn(Optional.of(animal));

        animalService.excluir(10);

        var inOrder = inOrder(solicitacaoModeracaoEventoRepository, solicitacaoAdocaoRepository,
                favoritoAnimalRepository, animalRepository);
        inOrder.verify(solicitacaoModeracaoEventoRepository).deleteBySolicitacaoAnimalId(10);
        inOrder.verify(solicitacaoAdocaoRepository).deleteByAnimalId(10);
        inOrder.verify(favoritoAnimalRepository).deleteByAnimalId(10);
        inOrder.verify(animalRepository).delete(animal);
    }

    @Test
    void excluiAnimaisAdotadosComExclusaoAgendadaVencida() {
        LocalDateTime agora = LocalDateTime.of(2026, 6, 21, 10, 0);
        Animal luna = animalBase();
        luna.setId(10);
        luna.setStatus(StatusAnimal.adotado);
        luna.setDataExclusaoAgendada(agora.minusHours(1));

        when(animalRepository.findByStatusAndDataExclusaoAgendadaLessThanEqual(StatusAnimal.adotado, agora))
                .thenReturn(List.of(luna));

        int total = animalService.excluirAnimaisComExclusaoAgendada(agora);

        assertEquals(1, total);
        var inOrder = inOrder(solicitacaoModeracaoEventoRepository, solicitacaoAdocaoRepository,
                favoritoAnimalRepository, animalRepository);
        inOrder.verify(solicitacaoModeracaoEventoRepository).deleteBySolicitacaoAnimalId(10);
        inOrder.verify(solicitacaoAdocaoRepository).deleteByAnimalId(10);
        inOrder.verify(favoritoAnimalRepository).deleteByAnimalId(10);
        inOrder.verify(animalRepository).delete(luna);
    }

    private Adotante adotanteComOutrosAnimais() {
        Adotante adotante = new Adotante();
        adotante.setTemCriancas(true);
        adotante.setTemOutrosAnimais(true);
        adotante.setTipoMoradia(TipoMoradia.casa_com_quintal);
        adotante.setNivelAtividade(NivelAtividade.ativo);
        adotante.setPreferenciaPorte(Porte.medio);
        return adotante;
    }

    private Animal animalBase() {
        Animal animal = new Animal();
        animal.setEspecie(Especie.cao);
        animal.setPorte(Porte.medio);
        animal.setBomComCriancas(true);
        animal.setPrecisaEspaco(false);
        animal.setNivelEnergia(NivelEnergia.alto);
        animal.setSexo(Sexo.femea);
        animal.setIdadeMeses(24);
        animal.setDataResgate(LocalDate.of(2026, 5, 1));
        return animal;
    }

    private Protetor protetor(Integer id) {
        Protetor protetor = new Protetor();
        protetor.setId(id);
        protetor.setNome("Abrigo Feliz");
        protetor.setEmail("abrigo@email.com");
        protetor.setTelefone("(49) 99999-0000");
        return protetor;
    }
}
