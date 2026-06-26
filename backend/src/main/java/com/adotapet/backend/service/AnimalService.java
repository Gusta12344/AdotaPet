package com.adotapet.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.AnimalRequest;
import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.dto.RecomendacaoAnimalResponse;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.AnimalImagem;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.NivelEnergia;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.Protetor;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.TipoMoradia;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.FavoritoAnimalRepository;
import com.adotapet.backend.repository.ProtetorRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;
import com.adotapet.backend.repository.SolicitacaoModeracaoEventoRepository;

@Service
public class AnimalService {

    private static final List<StatusAnimal> STATUS_VISIVEIS_PUBLICO = List.of(
            StatusAnimal.disponivel,
            StatusAnimal.em_analise
    );

    private final AnimalRepository animalRepository;
    private final ProtetorRepository protetorRepository;
    private final AdotanteRepository adotanteRepository;
    private final AnimalImagemStorageService animalImagemStorageService;
    private final FavoritoAnimalRepository favoritoAnimalRepository;
    private final SolicitacaoAdocaoRepository solicitacaoAdocaoRepository;
    private final SolicitacaoModeracaoEventoRepository solicitacaoModeracaoEventoRepository;

    public AnimalService(AnimalRepository animalRepository, ProtetorRepository protetorRepository,
            AdotanteRepository adotanteRepository, AnimalImagemStorageService animalImagemStorageService,
            FavoritoAnimalRepository favoritoAnimalRepository, SolicitacaoAdocaoRepository solicitacaoAdocaoRepository,
            SolicitacaoModeracaoEventoRepository solicitacaoModeracaoEventoRepository) {
        this.animalRepository = animalRepository;
        this.protetorRepository = protetorRepository;
        this.adotanteRepository = adotanteRepository;
        this.animalImagemStorageService = animalImagemStorageService;
        this.favoritoAnimalRepository = favoritoAnimalRepository;
        this.solicitacaoAdocaoRepository = solicitacaoAdocaoRepository;
        this.solicitacaoModeracaoEventoRepository = solicitacaoModeracaoEventoRepository;
    }

    @Transactional(readOnly = true)
    public List<AnimalResponse> listarDisponiveis() {
        return animalRepository.findByStatusInOrderByDataCadastroAsc(STATUS_VISIVEIS_PUBLICO)
                .stream()
                .map(AnimalResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AnimalResponse> listarTodos() {
        return animalRepository.findAllByOrderByDataCadastroAsc()
                .stream()
                .map(AnimalResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public AnimalResponse buscarPorId(Integer id) {
        Animal animal = buscarAnimal(id);
        animal.getProtetor().getNome();
        return AnimalResponse.fromEntity(animal);
    }

    @Transactional
    public AnimalResponse cadastrar(AnimalRequest request) {
        return cadastrarComCaminhosDeImagem(request, List.of());
    }

    @Transactional
    public AnimalResponse cadastrarComArquivos(AnimalRequest request, List<org.springframework.web.multipart.MultipartFile> imagens) {
        List<String> caminhos = animalImagemStorageService.salvar(imagens);
        return cadastrarComCaminhosDeImagem(request, caminhos);
    }

    private AnimalResponse cadastrarComCaminhosDeImagem(AnimalRequest request, List<String> caminhosImagem) {
        if (request.especie() == Especie.indiferente) {
            throw new RegraNegocioException("Especie do animal deve ser cao, gato ou outro");
        }
        if (request.porte() == Porte.indiferente) {
            throw new RegraNegocioException("Porte do animal deve ser pequeno, medio ou grande");
        }

        Protetor protetor = protetorRepository.findById(request.protetorId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Protetor nao encontrado"));

        Animal animal = new Animal();
        animal.setNome(request.nome());
        animal.setEspecie(request.especie());
        animal.setRaca(request.raca());
        animal.setIdadeMeses(request.idadeMeses());
        animal.setPorte(request.porte());
        animal.setSexo(request.sexo());
        animal.setDataResgate(request.dataResgate());
        animal.setNivelEnergia(request.nivelEnergia());
        animal.setBomComCriancas(request.bomComCriancas());
        animal.setBomComCaes(request.bomComCaes());
        animal.setBomComGatos(request.bomComGatos());
        animal.setPrecisaEspaco(request.precisaEspaco());
        animal.setMicrochip(request.microchip());
        animal.setCastrado(request.castrado());
        animal.setVermifugado(request.vermifugado());
        animal.setVacinado(request.vacinado());
        animal.setDescricao(request.descricao());
        animal.setStatus(StatusAnimal.disponivel);
        animal.setProtetor(protetor);
        preencherImagens(animal, caminhosImagem);

        return AnimalResponse.fromEntity(animalRepository.save(animal));
    }

    @Transactional
    public AnimalResponse atualizarStatus(Integer id, StatusAnimal status) {
        Animal animal = buscarAnimal(id);
        animal.setStatus(status);
        return AnimalResponse.fromEntity(animal);
    }

    @Transactional
    public AnimalResponse atualizar(Integer id, AnimalRequest request) {
        if (request.especie() == Especie.indiferente) {
            throw new RegraNegocioException("Especie do animal deve ser cao, gato ou outro");
        }
        if (request.porte() == Porte.indiferente) {
            throw new RegraNegocioException("Porte do animal deve ser pequeno, medio ou grande");
        }

        Animal animal = buscarAnimal(id);
        Protetor protetor = protetorRepository.findById(request.protetorId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Protetor nao encontrado"));

        animal.setNome(request.nome());
        animal.setEspecie(request.especie());
        animal.setRaca(request.raca());
        animal.setIdadeMeses(request.idadeMeses());
        animal.setPorte(request.porte());
        animal.setSexo(request.sexo());
        animal.setDataResgate(request.dataResgate());
        animal.setNivelEnergia(request.nivelEnergia());
        animal.setBomComCriancas(request.bomComCriancas());
        animal.setBomComCaes(request.bomComCaes());
        animal.setBomComGatos(request.bomComGatos());
        animal.setPrecisaEspaco(request.precisaEspaco());
        animal.setMicrochip(request.microchip());
        animal.setCastrado(request.castrado());
        animal.setVermifugado(request.vermifugado());
        animal.setVacinado(request.vacinado());
        animal.setDescricao(request.descricao());
        animal.setProtetor(protetor);

        return AnimalResponse.fromEntity(animal);
    }

    @Transactional
    public void excluir(Integer id) {
        Animal animal = buscarAnimal(id);
        excluirAnimal(animal);
    }

    @Transactional
    public int excluirAnimaisComExclusaoAgendada(LocalDateTime agora) {
        List<Animal> animais = animalRepository.findByStatusAndDataExclusaoAgendadaLessThanEqual(
                StatusAnimal.adotado, agora);
        for (Animal animal : animais) {
            excluirAnimal(animal);
        }
        return animais.size();
    }

    @Transactional(readOnly = true)
    public List<RecomendacaoAnimalResponse> recomendarParaAdotante(Integer adotanteId) {
        Adotante adotante = adotanteRepository.findById(adotanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Adotante nao encontrado"));

        List<RecomendacaoAnimalResponse> recomendacoes = new ArrayList<>();
        for (Animal animal : animalRepository.findByStatusInOrderByDataCadastroAsc(STATUS_VISIVEIS_PUBLICO)) {
            recomendacoes.add(new RecomendacaoAnimalResponse(AnimalResponse.fromEntity(animal), calcularScore(adotante, animal)));
        }

        return ordenarPorScoreDecrescente(recomendacoes);
    }

    private Animal buscarAnimal(Integer id) {
        return animalRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Animal nao encontrado"));
    }

    private void excluirAnimal(Animal animal) {
        solicitacaoModeracaoEventoRepository.deleteBySolicitacaoAnimalId(animal.getId());
        solicitacaoAdocaoRepository.deleteByAnimalId(animal.getId());
        favoritoAnimalRepository.deleteByAnimalId(animal.getId());
        animalRepository.delete(animal);
    }

    private void preencherImagens(Animal animal, List<String> caminhosImagem) {
        if (caminhosImagem == null || caminhosImagem.isEmpty()) {
            return;
        }

        int ordem = 1;
        for (String caminhoImagem : caminhosImagem) {
            String caminho = caminhoImagem == null ? "" : caminhoImagem.trim();
            if (caminho.isBlank()) {
                continue;
            }
            animal.adicionarImagem(new AnimalImagem(caminho, ordem));
            ordem++;
        }
    }

    int calcularScore(Adotante adotante, Animal animal) {
        int score = 0;

        if (adotante.getPreferenciaPorte() == Porte.indiferente || adotante.getPreferenciaPorte() == animal.getPorte()) {
            score += 20;
        }
        if (!adotante.isTemCriancas() || animal.isBomComCriancas()) {
            score += 20;
        }
        if (!adotante.isTemOutrosAnimais() || animal.isBomComCaes() || animal.isBomComGatos()) {
            score += 20;
        }
        if (!animal.isPrecisaEspaco() || adotante.getTipoMoradia() == TipoMoradia.casa_com_quintal) {
            score += 20;
        }

        if (energiaCombina(adotante.getNivelAtividade(), animal.getNivelEnergia())) {
            score += 20;
        }

        return score;
    }

    private boolean energiaCombina(NivelAtividade atividade, NivelEnergia energia) {
        return (atividade == NivelAtividade.ativo && energia == NivelEnergia.alto)
                || (atividade == NivelAtividade.moderado && energia == NivelEnergia.medio)
                || (atividade == NivelAtividade.sedentario && energia == NivelEnergia.baixo);
    }

    private List<RecomendacaoAnimalResponse> ordenarPorScoreDecrescente(List<RecomendacaoAnimalResponse> recomendacoes) {
        for (int i = 1; i < recomendacoes.size(); i++) {
            RecomendacaoAnimalResponse atual = recomendacoes.get(i);
            int j = i - 1;

            while (j >= 0 && recomendacoes.get(j).score() < atual.score()) {
                recomendacoes.set(j + 1, recomendacoes.get(j));
                j--;
            }

            recomendacoes.set(j + 1, atual);
        }

        return recomendacoes;
    }
}
