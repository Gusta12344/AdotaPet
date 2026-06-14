package com.adotapet.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
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
import com.adotapet.backend.dto.ModeracaoResumoResponse;
import com.adotapet.backend.dto.ModeracaoSolicitacaoDetalheResponse;
import com.adotapet.backend.dto.ModeracaoSolicitacaoFilaResponse;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.SolicitacaoAdocao;
import com.adotapet.backend.model.SolicitacaoModeracaoEvento;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.model.TipoEventoModeracao;
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

        ModeracaoChecklistRequest checklistRequest = new ModeracaoChecklistRequest(
                request.dadosAdotanteConferidos(),
                request.animalDisponivelConferido(),
                request.contatoRevisado(),
                request.observacaoAdmin()
        );
        aplicarChecklist(solicitacao, checklistRequest);
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

    private int aprovar(SolicitacaoAdocao solicitacao, Admin admin) {
        if (!checklistCompleto(solicitacao)) {
            throw new RegraNegocioException("Complete o checklist antes de aprovar a solicitacao");
        }
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
        animal.setStatus(StatusAnimal.adotado);
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
        boolean aindaTemAtiva = solicitacoesAtivas(animal).stream().anyMatch(solicitacao -> isAtiva(solicitacao.getStatus()));
        animal.setStatus(aindaTemAtiva ? StatusAnimal.em_analise : StatusAnimal.disponivel);
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
                posicaoFila(solicitacao),
                solicitacoesAtivas(animal).size(),
                podeAprovar(solicitacao),
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

    private int posicaoFila(SolicitacaoAdocao solicitacao) {
        List<SolicitacaoAdocao> ativas = solicitacoesAtivas(solicitacao.getAnimal());
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

    private boolean isAtiva(StatusSolicitacao status) {
        return status == StatusSolicitacao.pendente || status == StatusSolicitacao.em_analise;
    }

    private boolean checklistCompleto(SolicitacaoAdocao solicitacao) {
        return solicitacao.isDadosAdotanteConferidos()
                && solicitacao.isAnimalDisponivelConferido()
                && solicitacao.isContatoRevisado();
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
}
