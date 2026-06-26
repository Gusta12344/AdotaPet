package com.adotapet.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.ModeracaoAdotanteDetalheResponse;
import com.adotapet.backend.dto.ModeracaoAnimalDetalheResponse;
import com.adotapet.backend.dto.ModeracaoAnimalFilaResponse;
import com.adotapet.backend.dto.ModeracaoChecklistRequest;
import com.adotapet.backend.dto.ModeracaoChecklistResponse;
import com.adotapet.backend.dto.ModeracaoDecisaoRequest;
import com.adotapet.backend.dto.ModeracaoDecisaoResponse;
import com.adotapet.backend.dto.ModeracaoEventoResponse;
import com.adotapet.backend.dto.ModeracaoFinalizacaoRequest;
import com.adotapet.backend.dto.ModeracaoReversaoFinalizacaoRequest;
import com.adotapet.backend.dto.ModeracaoResumoResponse;
import com.adotapet.backend.dto.ModeracaoSolicitacaoDetalheResponse;
import com.adotapet.backend.dto.ModeracaoSolicitacaoFilaResponse;
import com.adotapet.backend.dto.ModeracaoSolicitacaoListaResponse;
import com.adotapet.backend.dto.ModeracaoSolicitacaoPageResponse;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtencao;
import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.SolicitacaoModeracaoEvento;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.model.TipoEventoModeracao;
import com.adotapet.backend.model.TipoFinalizacaoAdocao;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.repository.AdminRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;
import com.adotapet.backend.repository.SolicitacaoModeracaoEventoRepository;

@Service
public class ModeracaoAdocaoService {

    private static final List<StatusSolicitacao> STATUS_ATIVOS = List.of(
            StatusSolicitacao.pendente,
            StatusSolicitacao.em_analise
    );

    private final SolicitacaoAdocaoRepository solicitacaoRepository;
    private final SolicitacaoModeracaoEventoRepository eventoRepository;
    private final AdminRepository adminRepository;
    private final NotificacaoService notificacaoService;

    public ModeracaoAdocaoService(SolicitacaoAdocaoRepository solicitacaoRepository,
            SolicitacaoModeracaoEventoRepository eventoRepository, AdminRepository adminRepository,
            NotificacaoService notificacaoService) {
        this.solicitacaoRepository = solicitacaoRepository;
        this.eventoRepository = eventoRepository;
        this.adminRepository = adminRepository;
        this.notificacaoService = notificacaoService;
    }

    @Transactional(readOnly = true)
    public ModeracaoResumoResponse resumo() {
        LocalDate hoje = LocalDate.now();
        return new ModeracaoResumoResponse(
                solicitacaoRepository.countByStatus(StatusSolicitacao.pendente),
                solicitacaoRepository.countByStatus(StatusSolicitacao.em_analise),
                solicitacaoRepository.countByStatus(StatusSolicitacao.aprovada),
                solicitacaoRepository.countByStatus(StatusSolicitacao.recusada),
                solicitacaoRepository.countByStatus(StatusSolicitacao.finalizada),
                solicitacaoRepository.countByStatusAndDataDecisaoBetween(
                        StatusSolicitacao.aprovada,
                        hoje.atStartOfDay(),
                        hoje.atTime(LocalTime.MAX))
        );
    }

    @Transactional(readOnly = true)
    public List<ModeracaoAnimalFilaResponse> listarFila(StatusSolicitacao status, String busca, String ordem) {
        String termo = normalizarBusca(busca);
        Comparator<SolicitacaoAdocao> comparator = Comparator.comparing(SolicitacaoAdocao::getDataSolicitacao);
        if ("mais_recentes".equals(ordem)) {
            comparator = comparator.reversed();
        }

        Map<Integer, List<SolicitacaoAdocao>> porAnimal = new LinkedHashMap<>();
        solicitacaoRepository.findAllByOrderByDataSolicitacaoAsc()
                .stream()
                .filter(solicitacao -> status == null || solicitacao.getStatus() == status)
                .filter(solicitacao -> matchesBusca(solicitacao, termo))
                .sorted(comparator)
                .forEach(solicitacao -> porAnimal
                        .computeIfAbsent(solicitacao.getAnimal().getId(), ignored -> new ArrayList<>())
                        .add(solicitacao));

        return porAnimal.values()
                .stream()
                .map(this::toGrupoFila)
                .toList();
    }

    @Transactional(readOnly = true)
    public ModeracaoSolicitacaoPageResponse listarSolicitacoes(StatusSolicitacao status, NivelAtencao nivelAtencao,
            Especie especie, String perfilFila, String busca, String ordem, int pagina, int tamanho) {
        String termo = normalizarBusca(busca);
        String perfilNormalizado = normalizarBusca(perfilFila);
        int paginaSegura = Math.max(0, pagina);
        int tamanhoSeguro = Math.max(1, Math.min(tamanho, 50));
        Map<Integer, List<SolicitacaoAdocao>> ativasPorAnimal = new HashMap<>();

        List<ModeracaoSolicitacaoListaResponse> todos = solicitacaoRepository.findAllByOrderByDataSolicitacaoAsc()
                .stream()
                .map(solicitacao -> toListaResponse(solicitacao, ativasPorAnimal))
                .toList();

        long altaAtencao = contarAtencao(todos, NivelAtencao.alta);
        long mediaAtencao = contarAtencao(todos, NivelAtencao.media);
        long baixaAtencao = contarAtencao(todos, NivelAtencao.baixa);
        long aguardandoDecisao = todos.stream().filter(item -> isAtiva(item.status())).count();
        long animaisComFila = todos.stream()
                .filter(item -> item.totalAtivas() > 1)
                .map(ModeracaoSolicitacaoListaResponse::animalId)
                .distinct()
                .count();

        List<ModeracaoSolicitacaoListaResponse> filtrados = todos.stream()
                .filter(item -> status == null || item.status() == status)
                .filter(item -> nivelAtencao == null || item.nivelAtencao() == nivelAtencao)
                .filter(item -> especie == null || item.especie() == especie)
                .filter(item -> matchesPerfilFila(item, perfilNormalizado))
                .filter(item -> matchesBusca(item, termo))
                .sorted(comparadorSolicitacoes(ordem))
                .toList();

        int totalItens = filtrados.size();
        int totalPaginas = totalItens == 0 ? 0 : (int) Math.ceil(totalItens / (double) tamanhoSeguro);
        int paginaEfetiva = totalPaginas == 0 ? 0 : Math.min(paginaSegura, totalPaginas - 1);
        int inicio = Math.min(paginaEfetiva * tamanhoSeguro, totalItens);
        int fim = Math.min(inicio + tamanhoSeguro, totalItens);
        List<ModeracaoSolicitacaoListaResponse> itens = filtrados.subList(inicio, fim);

        return new ModeracaoSolicitacaoPageResponse(
                itens,
                paginaEfetiva,
                tamanhoSeguro,
                totalItens,
                totalPaginas,
                paginaEfetiva == 0,
                totalPaginas == 0 || paginaEfetiva >= totalPaginas - 1,
                altaAtencao,
                mediaAtencao,
                baixaAtencao,
                animaisComFila,
                aguardandoDecisao,
                LocalDateTime.now()
        );
    }

    @Transactional(readOnly = true)
    public ModeracaoSolicitacaoDetalheResponse detalhe(Integer id) {
        return toDetalhe(buscarDetalhe(id));
    }

    @Transactional
    public ModeracaoSolicitacaoDetalheResponse iniciarAnalise(Integer id, String adminEmail) {
        Admin admin = buscarAdmin(adminEmail);
        SolicitacaoAdocao solicitacao = buscarDetalhe(id);

        validarAtiva(solicitacao);
        if (solicitacao.getStatus() == StatusSolicitacao.pendente) {
            solicitacao.setStatus(StatusSolicitacao.em_analise);
            solicitacao.setDataInicioAnalise(LocalDateTime.now());
            solicitacao.setAdminResponsavel(admin);
            solicitacao.getAnimal().setStatus(StatusAnimal.em_analise);
            registrarEvento(solicitacao, admin, TipoEventoModeracao.analise_iniciada,
                    "Analise iniciada pelo administrador.");
        }

        return toDetalhe(solicitacao);
    }

    @Transactional
    public ModeracaoSolicitacaoDetalheResponse salvarChecklist(Integer id, String adminEmail,
            ModeracaoChecklistRequest request) {
        Admin admin = buscarAdmin(adminEmail);
        SolicitacaoAdocao solicitacao = buscarDetalhe(id);
        validarAtiva(solicitacao);

        boolean iniciouAgora = false;
        if (solicitacao.getStatus() == StatusSolicitacao.pendente) {
            solicitacao.setStatus(StatusSolicitacao.em_analise);
            solicitacao.setDataInicioAnalise(LocalDateTime.now());
            solicitacao.getAnimal().setStatus(StatusAnimal.em_analise);
            iniciouAgora = true;
        }

        boolean mudou = aplicarChecklist(solicitacao, request);
        solicitacao.setAdminResponsavel(admin);

        if (iniciouAgora) {
            registrarEvento(solicitacao, admin, TipoEventoModeracao.analise_iniciada,
                    "Analise iniciada ao salvar checklist.");
        }
        if (mudou) {
            registrarEvento(solicitacao, admin, TipoEventoModeracao.checklist_atualizado,
                    observacaoOuPadrao(solicitacao.getObservacaoAdmin(), "Checklist atualizado."));
        }

        return toDetalhe(solicitacao);
    }

    @Transactional
    public ModeracaoDecisaoResponse decidir(Integer id, String adminEmail, ModeracaoDecisaoRequest request) {
        Admin admin = buscarAdmin(adminEmail);
        SolicitacaoAdocao solicitacao = buscarDetalhe(id);
        validarAtiva(solicitacao);

        solicitacao.setObservacaoAdmin(normalizarObservacao(request.observacaoAdmin()));
        solicitacao.setAdminResponsavel(admin);

        if (request.status() == StatusSolicitacao.aprovada) {
            int recusadas = aprovar(solicitacao, admin);
            return new ModeracaoDecisaoResponse(toDetalhe(solicitacao), recusadas,
                    "Solicitacao aprovada e fila do animal atualizada.");
        }
        if (request.status() == StatusSolicitacao.recusada) {
            recusar(solicitacao, admin, TipoEventoModeracao.recusada,
                    observacaoOuPadrao(solicitacao.getObservacaoAdmin(), "Solicitacao recusada."));
            atualizarStatusAnimalAposRecusa(solicitacao.getAnimal());
            return new ModeracaoDecisaoResponse(toDetalhe(solicitacao), 0,
                    "Solicitacao recusada e fila do animal atualizada.");
        }

        throw new RegraNegocioException("Informe aprovada ou recusada para decidir a solicitacao");
    }

    @Transactional
    public ModeracaoDecisaoResponse finalizar(Integer id, String adminEmail, ModeracaoFinalizacaoRequest request) {
        Admin admin = buscarAdmin(adminEmail);
        SolicitacaoAdocao solicitacao = buscarDetalhe(id);
        if (solicitacao.getStatus() != StatusSolicitacao.aprovada) {
            throw new RegraNegocioException("Somente solicitacoes aprovadas podem ser finalizadas");
        }

        solicitacao.setStatus(StatusSolicitacao.finalizada);
        solicitacao.setDataFinalizacao(LocalDateTime.now());
        solicitacao.setAdminResponsavel(admin);
        solicitacao.setObservacaoAdmin(normalizarObservacao(request.observacaoAdmin()));

        Animal animal = solicitacao.getAnimal();
        if (request.resultado() == TipoFinalizacaoAdocao.adocao_concluida) {
            animal.setStatus(StatusAnimal.adotado);
            animal.setDataExclusaoAgendada(LocalDateTime.now().plusDays(7));
            registrarEvento(solicitacao, admin, TipoEventoModeracao.adocao_finalizada,
                    observacaoOuPadrao(solicitacao.getObservacaoAdmin(),
                            "Adocao finalizada com sucesso. Animal sera excluido em 7 dias."));
            notificacaoService.criar(solicitacao.getAdotante(), TipoNotificacao.adocao, "Adocao finalizada",
                    "A adocao de " + animal.getNome() + " foi finalizada com sucesso.",
                    "solicitacao_adocao", solicitacao.getId());
            return new ModeracaoDecisaoResponse(toDetalhe(solicitacao), 0,
                    "Adocao finalizada. O animal sera excluido automaticamente em 7 dias.");
        }

        animal.setStatus(StatusAnimal.disponivel);
        animal.setDataDisponivelAdocao(LocalDateTime.now());
        animal.setDataExclusaoAgendada(null);
        registrarEvento(solicitacao, admin, TipoEventoModeracao.adocao_cancelada,
                observacaoOuPadrao(solicitacao.getObservacaoAdmin(),
                        "Adocao finalizada sem sucesso. Animal voltou para disponivel."));
        notificacaoService.criar(solicitacao.getAdotante(), TipoNotificacao.adocao, "Adocao nao concluida",
                "A adocao de " + animal.getNome() + " nao foi concluida e o animal voltou a ficar disponivel.",
                "solicitacao_adocao", solicitacao.getId());
        return new ModeracaoDecisaoResponse(toDetalhe(solicitacao), 0,
                "Adocao finalizada sem sucesso. O animal voltou para disponivel.");
    }

    @Transactional
    public ModeracaoDecisaoResponse reverterFinalizacao(Integer id, String adminEmail,
            ModeracaoReversaoFinalizacaoRequest request) {
        Admin admin = buscarAdmin(adminEmail);
        SolicitacaoAdocao solicitacao = buscarDetalhe(id);
        Animal animal = solicitacao.getAnimal();
        if (!podeReverterFinalizacao(solicitacao)) {
            throw new RegraNegocioException("Somente finalizacoes concluidas podem ser revertidas");
        }

        String observacao = normalizarObservacao(request == null ? null : request.observacaoAdmin());
        solicitacao.setAdminResponsavel(admin);
        solicitacao.setObservacaoAdmin(observacao);
        animal.setStatus(StatusAnimal.disponivel);
        animal.setDataDisponivelAdocao(LocalDateTime.now());
        animal.setDataExclusaoAgendada(null);

        registrarEvento(solicitacao, admin, TipoEventoModeracao.adocao_cancelada,
                observacaoOuPadrao(observacao, "Finalizacao revertida. Animal voltou para disponivel."));
        notificacaoService.criar(solicitacao.getAdotante(), TipoNotificacao.adocao, "Adocao revertida",
                "A adocao de " + animal.getNome() + " foi revertida e o animal voltou ao abrigo.",
                "solicitacao_adocao", solicitacao.getId());

        return new ModeracaoDecisaoResponse(toDetalhe(solicitacao), 0,
                "Finalizacao revertida. O animal voltou para disponivel e nao sera excluido.");
    }

    @Transactional
    public void excluirSolicitacao(Integer id) {
        SolicitacaoAdocao solicitacao = buscarDetalhe(id);
        if (!podeExcluirSolicitacao(solicitacao.getStatus())) {
            throw new RegraNegocioException("Somente solicitacoes finalizadas ou canceladas podem ser excluidas");
        }

        eventoRepository.deleteBySolicitacaoId(id);
        solicitacaoRepository.delete(solicitacao);
    }

    private int aprovar(SolicitacaoAdocao solicitacao, Admin admin) {
        if (solicitacao.getAnimal().getStatus() == StatusAnimal.adotado) {
            throw new RegraNegocioException("Animal ja foi adotado");
        }
        if (posicaoFila(solicitacao) != 1) {
            throw new RegraNegocioException("Somente a primeira solicitacao ativa da fila pode ser aprovada");
        }

        Animal animal = solicitacao.getAnimal();
        solicitacao.setStatus(StatusSolicitacao.aprovada);
        solicitacao.setDataDecisao(LocalDateTime.now());
        solicitacao.setAdminResponsavel(admin);
        notificacaoService.criar(solicitacao.getAdotante(), TipoNotificacao.adocao, "Solicitacao aprovada",
                "Sua solicitacao para adotar " + animal.getNome() + " foi aprovada.",
                "solicitacao_adocao", solicitacao.getId());
        registrarEvento(solicitacao, admin, TipoEventoModeracao.aprovada,
                observacaoOuPadrao(solicitacao.getObservacaoAdmin(), "Solicitacao aprovada."));

        int recusadas = 0;
        for (SolicitacaoAdocao outra : solicitacoesAtivas(animal)) {
            if (Objects.equals(outra.getId(), solicitacao.getId())) {
                continue;
            }
            outra.setStatus(StatusSolicitacao.recusada);
            outra.setDataDecisao(LocalDateTime.now());
            outra.setAdminResponsavel(admin);
            outra.setObservacaoAdmin("Recusa automatica por aprovacao de outra solicitacao do mesmo animal.");
            notificacaoService.criar(outra.getAdotante(), TipoNotificacao.adocao, "Solicitacao recusada",
                    "Sua solicitacao para adotar " + animal.getNome() + " foi recusada.",
                    "solicitacao_adocao", outra.getId());
            registrarEvento(outra, admin, TipoEventoModeracao.recusa_automatica,
                    "Recusa automatica por aprovacao de outra solicitacao.");
            recusadas++;
        }
        return recusadas;
    }

    private void recusar(SolicitacaoAdocao solicitacao, Admin admin, TipoEventoModeracao tipo, String observacao) {
        solicitacao.setStatus(StatusSolicitacao.recusada);
        solicitacao.setDataDecisao(LocalDateTime.now());
        solicitacao.setAdminResponsavel(admin);
        notificacaoService.criar(solicitacao.getAdotante(), TipoNotificacao.adocao, "Solicitacao recusada",
                "Sua solicitacao para adotar " + solicitacao.getAnimal().getNome() + " foi recusada.",
                "solicitacao_adocao", solicitacao.getId());
        registrarEvento(solicitacao, admin, tipo, observacao);
    }

    private void atualizarStatusAnimalAposRecusa(Animal animal) {
        boolean temSolicitacaoEmAnalise = solicitacoesAtivas(animal).stream()
                .anyMatch(solicitacao -> solicitacao.getStatus() == StatusSolicitacao.em_analise);
        animal.setStatus(temSolicitacaoEmAnalise ? StatusAnimal.em_analise : StatusAnimal.disponivel);
    }

    private ModeracaoAnimalFilaResponse toGrupoFila(List<SolicitacaoAdocao> solicitacoes) {
        SolicitacaoAdocao primeira = solicitacoes.get(0);
        Animal animal = primeira.getAnimal();
        List<SolicitacaoAdocao> ativas = solicitacoesAtivas(animal);

        return new ModeracaoAnimalFilaResponse(
                animal.getId(),
                animal.getNome(),
                animal.getEspecie(),
                resumoAnimal(animal),
                animal.getStatus(),
                imagemPrincipal(animal),
                ativas.size(),
                solicitacoes.stream()
                        .map(solicitacao -> new ModeracaoSolicitacaoFilaResponse(
                                solicitacao.getId(),
                                solicitacao.getStatus(),
                                solicitacao.getAdotante().getNome(),
                                solicitacao.getAdotante().getEmail(),
                                solicitacao.getDataSolicitacao(),
                                posicaoFila(solicitacao),
                                podeAprovar(solicitacao)))
                        .toList()
        );
    }

    private ModeracaoSolicitacaoListaResponse toListaResponse(SolicitacaoAdocao solicitacao,
            Map<Integer, List<SolicitacaoAdocao>> ativasPorAnimal) {
        Animal animal = solicitacao.getAnimal();
        List<SolicitacaoAdocao> ativas = solicitacoesAtivas(animal, ativasPorAnimal);
        AtencaoCalculada atencao = calcularAtencao(solicitacao, ativas.size());

        return new ModeracaoSolicitacaoListaResponse(
                solicitacao.getId(),
                solicitacao.getStatus(),
                solicitacao.getDataSolicitacao(),
                animal.getId(),
                animal.getNome(),
                animal.getEspecie(),
                resumoAnimal(animal),
                animal.getStatus(),
                imagemPrincipal(animal),
                solicitacao.getAdotante().getNome(),
                solicitacao.getAdotante().getEmail(),
                posicaoFila(solicitacao, ativas),
                ativas.size(),
                podeAprovar(solicitacao, ativas),
                atencao.nivel(),
                atencao.motivo(),
                atencao.diasSolicitacao(),
                atencao.diasAnimalDisponivel()
        );
    }

    private AtencaoCalculada calcularAtencao(SolicitacaoAdocao solicitacao, int totalAtivas) {
        int diasSolicitacao = diasDesde(solicitacao.getDataSolicitacao());
        int diasAnimalDisponivel = diasDesde(dataDisponivelAdocao(solicitacao.getAnimal()));
        int diasEmAnalise = solicitacao.getStatus() == StatusSolicitacao.em_analise
                ? diasDesde(solicitacao.getDataInicioAnalise())
                : 0;

        if (diasSolicitacao >= 3) {
            return new AtencaoCalculada(NivelAtencao.alta,
                    "Solicitacao aguardando ha " + diasSolicitacao + " dias",
                    diasSolicitacao, diasAnimalDisponivel);
        }
        if (diasEmAnalise >= 2) {
            return new AtencaoCalculada(NivelAtencao.alta,
                    "Em analise ha " + diasEmAnalise + " dias",
                    diasSolicitacao, diasAnimalDisponivel);
        }
        if (diasAnimalDisponivel >= 90) {
            return new AtencaoCalculada(NivelAtencao.alta,
                    "Animal disponivel ha " + diasAnimalDisponivel + " dias",
                    diasSolicitacao, diasAnimalDisponivel);
        }
        if (totalAtivas >= 4) {
            return new AtencaoCalculada(NivelAtencao.alta,
                    "Fila com " + totalAtivas + " solicitacoes ativas",
                    diasSolicitacao, diasAnimalDisponivel);
        }
        if (diasSolicitacao >= 1) {
            return new AtencaoCalculada(NivelAtencao.media,
                    "Solicitacao aguardando ha " + diasSolicitacao + " dias",
                    diasSolicitacao, diasAnimalDisponivel);
        }
        if (diasAnimalDisponivel >= 30) {
            return new AtencaoCalculada(NivelAtencao.media,
                    "Animal disponivel ha " + diasAnimalDisponivel + " dias",
                    diasSolicitacao, diasAnimalDisponivel);
        }
        if (totalAtivas >= 2) {
            return new AtencaoCalculada(NivelAtencao.media,
                    "Fila com " + totalAtivas + " solicitacoes ativas",
                    diasSolicitacao, diasAnimalDisponivel);
        }

        return new AtencaoCalculada(NivelAtencao.baixa, "Solicitacao recente",
                diasSolicitacao, diasAnimalDisponivel);
    }

    private int diasDesde(LocalDateTime data) {
        if (data == null) {
            return 0;
        }
        long dias = ChronoUnit.DAYS.between(data.toLocalDate(), LocalDate.now());
        return dias < 0 ? 0 : (int) dias;
    }

    private LocalDateTime dataDisponivelAdocao(Animal animal) {
        if (animal.getDataDisponivelAdocao() != null) {
            return animal.getDataDisponivelAdocao();
        }
        if (animal.getDataCadastro() != null) {
            return animal.getDataCadastro();
        }
        return animal.getDataResgate() == null ? null : animal.getDataResgate().atStartOfDay();
    }

    private long contarAtencao(List<ModeracaoSolicitacaoListaResponse> itens, NivelAtencao nivel) {
        return itens.stream().filter(item -> item.nivelAtencao() == nivel).count();
    }

    private boolean matchesPerfilFila(ModeracaoSolicitacaoListaResponse item, String perfil) {
        if (perfil.isBlank()) {
            return true;
        }
        return switch (perfil) {
            case "primeiro", "primeiro_da_fila" -> item.posicaoFila() == 1;
            case "com_fila" -> item.totalAtivas() > 1;
            case "pode_aprovar" -> item.podeAprovar();
            default -> true;
        };
    }

    private boolean matchesBusca(ModeracaoSolicitacaoListaResponse item, String termo) {
        if (termo.isBlank()) {
            return true;
        }
        return contem(item.animalNome(), termo)
                || contem(item.adotanteNome(), termo)
                || contem(item.adotanteEmail(), termo);
    }

    private Comparator<ModeracaoSolicitacaoListaResponse> comparadorSolicitacoes(String ordem) {
        String ordemNormalizada = normalizarBusca(ordem);
        Comparator<ModeracaoSolicitacaoListaResponse> porData =
                Comparator.comparing(ModeracaoSolicitacaoListaResponse::dataSolicitacao);

        return switch (ordemNormalizada) {
            case "mais_recentes" -> porData.reversed();
            case "animal_az" -> Comparator.comparing(ModeracaoSolicitacaoListaResponse::animalNome,
                    String.CASE_INSENSITIVE_ORDER);
            case "adotante_az" -> Comparator.comparing(ModeracaoSolicitacaoListaResponse::adotanteNome,
                    String.CASE_INSENSITIVE_ORDER);
            case "fila_maior" -> Comparator.comparing(ModeracaoSolicitacaoListaResponse::totalAtivas)
                    .reversed()
                    .thenComparing(porData);
            case "mais_antigas" -> porData;
            default -> Comparator.comparingInt((ModeracaoSolicitacaoListaResponse item) ->
                            prioridadeAtencao(item.nivelAtencao()))
                    .thenComparing(porData);
        };
    }

    private int prioridadeAtencao(NivelAtencao nivel) {
        return switch (nivel) {
            case alta -> 0;
            case media -> 1;
            case baixa -> 2;
        };
    }

    private ModeracaoSolicitacaoDetalheResponse toDetalhe(SolicitacaoAdocao solicitacao) {
        Animal animal = solicitacao.getAnimal();
        Adotante adotante = solicitacao.getAdotante();
        List<SolicitacaoModeracaoEvento> eventos = eventoRepository.findBySolicitacaoIdOrderByDataEventoAsc(solicitacao.getId());

        return new ModeracaoSolicitacaoDetalheResponse(
                solicitacao.getId(),
                solicitacao.getStatus(),
                solicitacao.getDataSolicitacao(),
                solicitacao.getDataInicioAnalise(),
                solicitacao.getDataDecisao(),
                solicitacao.getDataFinalizacao(),
                posicaoFila(solicitacao),
                solicitacoesAtivas(animal).size(),
                podeAprovar(solicitacao),
                podeReverterFinalizacao(solicitacao),
                new ModeracaoAnimalDetalheResponse(
                        animal.getId(),
                        animal.getNome(),
                        animal.getEspecie(),
                        animal.getRaca(),
                        animal.getIdadeMeses(),
                        animal.getPorte(),
                        animal.getSexo(),
                        animal.getStatus(),
                        imagemPrincipal(animal),
                        animal.isBomComCriancas(),
                        animal.isBomComCaes(),
                        animal.isBomComGatos(),
                        animal.isPrecisaEspaco(),
                        animal.isCastrado(),
                        animal.isVacinado(),
                        animal.isVermifugado()),
                new ModeracaoAdotanteDetalheResponse(
                        adotante.getId(),
                        adotante.getNome(),
                        adotante.getEmail(),
                        adotante.getTelefone(),
                        adotante.getEndereco(),
                        adotante.getTipoMoradia(),
                        adotante.isTemCriancas(),
                        adotante.isTemOutrosAnimais(),
                        adotante.getNivelAtividade(),
                        adotante.getPreferenciaPorte(),
                        adotante.getPreferenciaEspecie()),
                new ModeracaoChecklistResponse(
                        solicitacao.isDadosAdotanteConferidos(),
                        solicitacao.isAnimalDisponivelConferido(),
                        solicitacao.isContatoRevisado()),
                solicitacao.getObservacaoAdmin(),
                eventos.stream().map(this::toEvento).toList()
        );
    }

    private ModeracaoEventoResponse toEvento(SolicitacaoModeracaoEvento evento) {
        String titulo = switch (evento.getTipo()) {
            case solicitacao_enviada -> "Solicitacao enviada";
            case analise_iniciada -> "Em analise";
            case checklist_atualizado -> "Checklist atualizado";
            case aprovada -> "Solicitacao aprovada";
            case recusada -> "Solicitacao recusada";
            case recusa_automatica -> "Recusa automatica";
            case solicitacao_cancelada -> "Solicitacao cancelada";
            case adocao_finalizada -> "Adocao finalizada";
            case adocao_cancelada -> "Adocao nao concluida";
            case finalizacao_revertida -> "Finalizacao revertida";
        };
        return new ModeracaoEventoResponse(
                evento.getId(),
                evento.getTipo(),
                titulo,
                evento.getObservacao(),
                evento.getDataEvento(),
                evento.getAdmin() == null ? null : evento.getAdmin().getNome()
        );
    }

    private boolean aplicarChecklist(SolicitacaoAdocao solicitacao, ModeracaoChecklistRequest request) {
        String observacao = normalizarObservacao(request.observacaoAdmin());
        boolean mudou = solicitacao.isDadosAdotanteConferidos() != Boolean.TRUE.equals(request.dadosAdotanteConferidos())
                || solicitacao.isAnimalDisponivelConferido() != Boolean.TRUE.equals(request.animalDisponivelConferido())
                || solicitacao.isContatoRevisado() != Boolean.TRUE.equals(request.contatoRevisado())
                || !Objects.equals(normalizarObservacao(solicitacao.getObservacaoAdmin()), observacao);

        solicitacao.setDadosAdotanteConferidos(Boolean.TRUE.equals(request.dadosAdotanteConferidos()));
        solicitacao.setAnimalDisponivelConferido(Boolean.TRUE.equals(request.animalDisponivelConferido()));
        solicitacao.setContatoRevisado(Boolean.TRUE.equals(request.contatoRevisado()));
        solicitacao.setObservacaoAdmin(observacao);
        return mudou;
    }

    private void registrarEvento(SolicitacaoAdocao solicitacao, Admin admin, TipoEventoModeracao tipo, String observacao) {
        SolicitacaoModeracaoEvento evento = new SolicitacaoModeracaoEvento();
        evento.setSolicitacao(solicitacao);
        evento.setAdmin(admin);
        evento.setTipo(tipo);
        evento.setObservacao(observacao);
        eventoRepository.save(evento);
    }

    private SolicitacaoAdocao buscarDetalhe(Integer id) {
        return solicitacaoRepository.findDetalheById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitacao nao encontrada"));
    }

    private Admin buscarAdmin(String adminEmail) {
        return adminRepository.findByEmail(String.valueOf(adminEmail).trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Admin nao encontrado"));
    }

    private void validarAtiva(SolicitacaoAdocao solicitacao) {
        if (!isAtiva(solicitacao.getStatus())) {
            throw new RegraNegocioException("Solicitacao ja foi finalizada");
        }
    }

    private boolean podeAprovar(SolicitacaoAdocao solicitacao) {
        return isAtiva(solicitacao.getStatus())
                && solicitacao.getAnimal().getStatus() != StatusAnimal.adotado
                && posicaoFila(solicitacao) == 1;
    }

    private boolean podeAprovar(SolicitacaoAdocao solicitacao, List<SolicitacaoAdocao> ativas) {
        return isAtiva(solicitacao.getStatus())
                && solicitacao.getAnimal().getStatus() != StatusAnimal.adotado
                && posicaoFila(solicitacao, ativas) == 1;
    }

    private boolean podeReverterFinalizacao(SolicitacaoAdocao solicitacao) {
        Animal animal = solicitacao.getAnimal();
        return solicitacao.getStatus() == StatusSolicitacao.finalizada
                && animal.getStatus() == StatusAnimal.adotado;
    }

    private boolean podeExcluirSolicitacao(StatusSolicitacao status) {
        return status == StatusSolicitacao.finalizada || status == StatusSolicitacao.cancelada;
    }

    private int posicaoFila(SolicitacaoAdocao solicitacao) {
        List<SolicitacaoAdocao> ativas = solicitacoesAtivas(solicitacao.getAnimal());
        return posicaoFila(solicitacao, ativas);
    }

    private int posicaoFila(SolicitacaoAdocao solicitacao, List<SolicitacaoAdocao> ativas) {
        for (int index = 0; index < ativas.size(); index++) {
            if (Objects.equals(ativas.get(index).getId(), solicitacao.getId())) {
                return index + 1;
            }
        }
        return 0;
    }

    private List<SolicitacaoAdocao> solicitacoesAtivas(Animal animal) {
        return solicitacaoRepository.findByAnimalIdAndStatusInOrderByDataSolicitacaoAsc(animal.getId(), STATUS_ATIVOS);
    }

    private List<SolicitacaoAdocao> solicitacoesAtivas(Animal animal,
            Map<Integer, List<SolicitacaoAdocao>> ativasPorAnimal) {
        return ativasPorAnimal.computeIfAbsent(animal.getId(), ignored -> solicitacoesAtivas(animal));
    }

    private boolean isAtiva(StatusSolicitacao status) {
        return status == StatusSolicitacao.pendente || status == StatusSolicitacao.em_analise;
    }

    private boolean matchesBusca(SolicitacaoAdocao solicitacao, String termo) {
        if (termo.isBlank()) {
            return true;
        }
        return contem(solicitacao.getAnimal().getNome(), termo)
                || contem(solicitacao.getAdotante().getNome(), termo)
                || contem(solicitacao.getAdotante().getEmail(), termo);
    }

    private boolean contem(String value, String termo) {
        return String.valueOf(value == null ? "" : value).toLowerCase(Locale.ROOT).contains(termo);
    }

    private String normalizarBusca(String value) {
        return String.valueOf(value == null ? "" : value).trim().toLowerCase(Locale.ROOT);
    }

    private String normalizarObservacao(String value) {
        String observacao = String.valueOf(value == null ? "" : value).trim();
        return observacao.isBlank() ? null : observacao;
    }

    private String observacaoOuPadrao(String observacao, String padrao) {
        String normalizada = normalizarObservacao(observacao);
        return normalizada == null ? padrao : normalizada;
    }

    private String resumoAnimal(Animal animal) {
        return "%s - %s - %s".formatted(animal.getRaca(), idadeResumida(animal.getIdadeMeses()), animal.getSexo());
    }

    private String idadeResumida(Integer idadeMeses) {
        int meses = idadeMeses == null ? 0 : idadeMeses;
        if (meses < 12) {
            return meses + " meses";
        }
        int anos = meses / 12;
        return anos + (anos == 1 ? " ano" : " anos");
    }

    private String imagemPrincipal(Animal animal) {
        if (animal.getImagens() == null || animal.getImagens().isEmpty()) {
            return null;
        }
        return animal.getImagens().get(0).getUrl();
    }

    private record AtencaoCalculada(
            NivelAtencao nivel,
            String motivo,
            int diasSolicitacao,
            int diasAnimalDisponivel
    ) {
    }
}
