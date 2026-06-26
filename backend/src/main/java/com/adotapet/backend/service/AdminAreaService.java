package com.adotapet.backend.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.AdminMensagemRequest;
import com.adotapet.backend.dto.AdminMensagemResumoResponse;
import com.adotapet.backend.dto.AdminOverviewResponse;
import com.adotapet.backend.dto.AdminRelatorioResponse;
import com.adotapet.backend.dto.AdminUsuarioCreateRequest;
import com.adotapet.backend.dto.AdminUsuarioResponse;
import com.adotapet.backend.dto.AdminUsuarioUpdateRequest;
import com.adotapet.backend.dto.AnimalResponse;
import com.adotapet.backend.dto.NotificacaoResponse;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Animal;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.repository.AdminRepository;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.FavoritoAnimalRepository;
import com.adotapet.backend.repository.NotificacaoRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;
import com.adotapet.backend.repository.SolicitacaoModeracaoEventoRepository;

@Service
public class AdminAreaService {

    private static final DateTimeFormatter REPORT_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm");

    private final AnimalRepository animalRepository;
    private final AdotanteRepository adotanteRepository;
    private final AdminRepository adminRepository;
    private final SolicitacaoAdocaoRepository solicitacaoRepository;
    private final SolicitacaoModeracaoEventoRepository solicitacaoEventoRepository;
    private final FavoritoAnimalRepository favoritoAnimalRepository;
    private final NotificacaoRepository notificacaoRepository;
    private final NotificacaoService notificacaoService;
    private final PasswordEncoder passwordEncoder;
    private final AtomicLong relatoriosGerados = new AtomicLong();

    public AdminAreaService(AnimalRepository animalRepository, AdotanteRepository adotanteRepository,
            AdminRepository adminRepository, SolicitacaoAdocaoRepository solicitacaoRepository,
            SolicitacaoModeracaoEventoRepository solicitacaoEventoRepository,
            FavoritoAnimalRepository favoritoAnimalRepository, NotificacaoRepository notificacaoRepository,
            NotificacaoService notificacaoService, PasswordEncoder passwordEncoder) {
        this.animalRepository = animalRepository;
        this.adotanteRepository = adotanteRepository;
        this.adminRepository = adminRepository;
        this.solicitacaoRepository = solicitacaoRepository;
        this.solicitacaoEventoRepository = solicitacaoEventoRepository;
        this.favoritoAnimalRepository = favoritoAnimalRepository;
        this.notificacaoRepository = notificacaoRepository;
        this.notificacaoService = notificacaoService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public AdminOverviewResponse resumo() {
        return new AdminOverviewResponse(
                animalRepository.count(),
                animalRepository.countByStatus(StatusAnimal.disponivel),
                animalRepository.countByStatus(StatusAnimal.em_analise),
                animalRepository.countByStatus(StatusAnimal.adotado),
                adotanteRepository.count(),
                adminRepository.count(),
                solicitacaoRepository.countByStatus(StatusSolicitacao.pendente),
                solicitacaoRepository.countByStatus(StatusSolicitacao.em_analise),
                solicitacaoRepository.countByStatus(StatusSolicitacao.aprovada),
                solicitacaoRepository.countByStatus(StatusSolicitacao.recusada),
                relatoriosGerados.get()
        );
    }

    @Transactional(readOnly = true)
    public List<AnimalResponse> listarAnimais() {
        return animalRepository.findAllByOrderByDataCadastroAsc()
                .stream()
                .map(AnimalResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminUsuarioResponse> listarUsuarios() {
        List<Admin> admins = adminRepository.findAll();
        Map<String, Admin> adminsPorIdentidade = adminsPorIdentidade(admins);
        Set<Integer> adminsVinculados = new HashSet<>();
        List<AdminUsuarioResponse> usuarios = new ArrayList<>();

        for (Adotante adotante : adotanteRepository.findAllByOrderByDataCadastroDesc()) {
            Admin admin = localizarAdmin(adotante, adminsPorIdentidade);
            if (admin != null) {
                adminsVinculados.add(admin.getId());
            }
            usuarios.add(AdminUsuarioResponse.fromEntity(adotante, admin));
        }

        for (Admin admin : admins) {
            if (!adminsVinculados.contains(admin.getId())) {
                usuarios.add(AdminUsuarioResponse.fromAdmin(admin));
            }
        }

        return usuarios;
    }

    @Transactional(readOnly = true)
    public List<AdminMensagemResumoResponse> listarMensagensNaoLidas() {
        return notificacaoRepository.findTop5ByLidaFalseOrderByDataCriacaoDesc()
                .stream()
                .map(AdminMensagemResumoResponse::fromEntity)
                .toList();
    }

    @Transactional
    public AdminUsuarioResponse cadastrarUsuario(AdminUsuarioCreateRequest request) {
        String nome = normalizeText(request.nome());
        String cpf = normalizeText(request.cpf());
        String email = normalizeEmail(request.email());
        String senha = normalizePassword(request.senha());

        validarSenha(senha);
        validarAdotanteUnico(email, cpf);
        if (request.administrador()) {
            validarAdminUnico(email, cpf);
        }

        String senhaHash = passwordEncoder.encode(senha);
        Adotante adotante = new Adotante();
        adotante.setNome(nome);
        adotante.setCpf(cpf);
        adotante.setSenha(senhaHash);
        adotante.setEmail(email);
        adotante.setTelefone(normalizeText(request.telefone()));
        adotante.setEndereco(normalizeText(request.endereco()));
        adotante.setTipoMoradia(request.tipoMoradia());
        adotante.setTemCriancas(request.temCriancas());
        adotante.setTemOutrosAnimais(request.temOutrosAnimais());
        adotante.setNivelAtividade(request.nivelAtividade());
        adotante.setPreferenciaPorte(request.preferenciaPorte());
        adotante.setPreferenciaEspecie(request.preferenciaEspecie());

        Adotante salvo = adotanteRepository.save(adotante);
        Admin admin = request.administrador() ? salvarAdmin(salvo.getNome(), salvo.getEmail(), salvo.getCpf(), senhaHash) : null;
        return AdminUsuarioResponse.fromEntity(salvo, admin);
    }

    @Transactional
    public AdminUsuarioResponse promoverUsuario(Integer adotanteId) {
        Adotante adotante = adotanteRepository.findById(adotanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Adotante nao encontrado"));

        validarAdminUnico(adotante.getEmail(), adotante.getCpf());
        Admin admin = salvarAdmin(adotante.getNome(), adotante.getEmail(), adotante.getCpf(), adotante.getSenha());
        return AdminUsuarioResponse.fromEntity(adotante, admin);
    }

    @Transactional
    public AdminUsuarioResponse atualizarUsuario(Integer adotanteId, AdminUsuarioUpdateRequest request) {
        Adotante adotante = adotanteRepository.findById(adotanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Adotante nao encontrado"));
        Admin adminAtual = localizarAdmin(adotante);
        String nome = normalizeText(request.nome());
        String cpf = normalizeText(request.cpf());
        String email = normalizeEmail(request.email());
        String senha = normalizePassword(request.senha());

        validarSenhaOpcional(senha);
        validarAdotanteUnicoParaAtualizacao(adotanteId, email, cpf);
        if (request.administrador()) {
            validarAdminUnicoParaAtualizacao(adminAtual, email, cpf);
        }

        if (!senha.isBlank()) {
            adotante.setSenha(passwordEncoder.encode(senha));
        }
        adotante.setNome(nome);
        adotante.setCpf(cpf);
        adotante.setEmail(email);
        adotante.setTelefone(normalizeText(request.telefone()));
        adotante.setEndereco(normalizeText(request.endereco()));
        adotante.setTipoMoradia(request.tipoMoradia());
        adotante.setTemCriancas(request.temCriancas());
        adotante.setTemOutrosAnimais(request.temOutrosAnimais());
        adotante.setNivelAtividade(request.nivelAtividade());
        adotante.setPreferenciaPorte(request.preferenciaPorte());
        adotante.setPreferenciaEspecie(request.preferenciaEspecie());

        Admin admin = null;
        if (request.administrador()) {
            admin = adminAtual == null ? new Admin() : adminAtual;
            admin.setNome(nome);
            admin.setCpf(cpf);
            admin.setEmail(email);
            admin.setSenha(adotante.getSenha());
            if (admin.getId() == null) {
                admin = adminRepository.save(admin);
            }
        } else if (adminAtual != null) {
            adminRepository.delete(adminAtual);
        }

        return AdminUsuarioResponse.fromEntity(adotante, admin);
    }

    @Transactional
    public void excluirUsuario(Integer adotanteId) {
        Adotante adotante = adotanteRepository.findById(adotanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Adotante nao encontrado"));
        Admin admin = localizarAdmin(adotante);

        if (admin != null) {
            adminRepository.delete(admin);
        }
        solicitacaoEventoRepository.deleteBySolicitacaoAdotanteId(adotanteId);
        solicitacaoRepository.deleteByAdotanteId(adotanteId);
        favoritoAnimalRepository.deleteByAdotanteId(adotanteId);
        notificacaoRepository.deleteByAdotanteId(adotanteId);
        adotanteRepository.delete(adotante);
    }

    @Transactional
    public AdminUsuarioResponse atualizarAdministrador(Integer adminId, AdminUsuarioUpdateRequest request) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Administrador nao encontrado"));
        String nome = normalizeText(request.nome());
        String cpf = normalizeText(request.cpf());
        String email = normalizeEmail(request.email());
        String senha = normalizePassword(request.senha());

        validarSenhaOpcional(senha);
        validarAdotanteLivreParaAdmin(email, cpf);
        validarAdminUnicoParaAtualizacao(admin, email, cpf);

        admin.setNome(nome);
        admin.setCpf(cpf);
        admin.setEmail(email);
        if (!senha.isBlank()) {
            admin.setSenha(passwordEncoder.encode(senha));
        }

        return AdminUsuarioResponse.fromAdmin(admin);
    }

    @Transactional
    public void excluirAdministrador(Integer adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Administrador nao encontrado"));
        adminRepository.delete(admin);
    }

    @Transactional
    public NotificacaoResponse enviarMensagem(AdminMensagemRequest request) {
        Adotante adotante = adotanteRepository.findById(request.adotanteId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Adotante nao encontrado"));
        String titulo = limitar(normalizeText(request.titulo()), 120, "titulo");
        String mensagem = limitar(normalizeText(request.mensagem()), 500, "mensagem");

        return notificacaoService.criar(adotante, TipoNotificacao.sistema, titulo, mensagem,
                "mensagem_admin", adotante.getId());
    }

    @Transactional(readOnly = true)
    public AdminRelatorioResponse gerarRelatorio(String formato) {
        String tipo = normalizeText(formato).toLowerCase(Locale.ROOT);
        if (tipo.isBlank()) {
            tipo = "csv";
        }

        relatoriosGerados.incrementAndGet();
        LocalDateTime geradoEm = LocalDateTime.now();
        AdminOverviewResponse resumo = resumo();
        List<AnimalResponse> animais = listarAnimais();
        List<AdminUsuarioResponse> usuarios = listarUsuarios();

        if (tipo.equals("json")) {
            return new AdminRelatorioResponse("json", "application/json", filename("json", geradoEm),
                    buildJsonReport(resumo, animais, usuarios, geradoEm), geradoEm);
        }
        if (tipo.equals("html") || tipo.equals("pdf")) {
            return new AdminRelatorioResponse("html", "text/html", filename("html", geradoEm),
                    buildHtmlReport(resumo, animais, usuarios, geradoEm), geradoEm);
        }

        return new AdminRelatorioResponse("csv", "text/csv", filename("csv", geradoEm),
                buildCsvReport(resumo, animais, usuarios, geradoEm), geradoEm);
    }

    private Admin salvarAdmin(String nome, String email, String cpf, String senhaHash) {
        Admin admin = new Admin();
        admin.setNome(normalizeText(nome));
        admin.setEmail(normalizeEmail(email));
        admin.setCpf(normalizeText(cpf));
        admin.setSenha(senhaHash);
        return adminRepository.save(admin);
    }

    private void validarAdotanteUnicoParaAtualizacao(Integer adotanteId, String email, String cpf) {
        adotanteRepository.findByEmail(email)
                .filter(adotante -> !adotante.getId().equals(adotanteId))
                .ifPresent(adotante -> {
                    throw new RegraNegocioException("Ja existe usuario cadastrado com este e-mail");
                });
        adotanteRepository.findByCpf(cpf)
                .filter(adotante -> !adotante.getId().equals(adotanteId))
                .ifPresent(adotante -> {
                    throw new RegraNegocioException("Ja existe usuario cadastrado com este CPF");
                });
    }

    private void validarAdminUnicoParaAtualizacao(Admin adminAtual, String email, String cpf) {
        adminRepository.findByEmail(normalizeEmail(email))
                .filter(admin -> adminAtual == null || !admin.getId().equals(adminAtual.getId()))
                .ifPresent(admin -> {
                    throw new RegraNegocioException("Usuario ja e administrador");
                });
        adminRepository.findByCpf(normalizeText(cpf))
                .filter(admin -> adminAtual == null || !admin.getId().equals(adminAtual.getId()))
                .ifPresent(admin -> {
                    throw new RegraNegocioException("Usuario ja e administrador");
                });
    }

    private void validarAdotanteUnico(String email, String cpf) {
        if (adotanteRepository.existsByEmail(email)) {
            throw new RegraNegocioException("Ja existe usuario cadastrado com este e-mail");
        }
        if (adotanteRepository.existsByCpf(cpf)) {
            throw new RegraNegocioException("Ja existe usuario cadastrado com este CPF");
        }
    }

    private void validarAdminUnico(String email, String cpf) {
        adminRepository.findByEmail(normalizeEmail(email)).ifPresent(admin -> {
            throw new RegraNegocioException("Usuario ja e administrador");
        });
        adminRepository.findByCpf(normalizeText(cpf)).ifPresent(admin -> {
            throw new RegraNegocioException("Usuario ja e administrador");
        });
    }

    private Map<String, Admin> adminsPorIdentidade(List<Admin> adminsOrigem) {
        Map<String, Admin> admins = new HashMap<>();
        for (Admin admin : adminsOrigem) {
            admins.put(identityKey(admin.getEmail()), admin);
            admins.put(identityKey(admin.getCpf()), admin);
        }
        return admins;
    }

    private void validarAdotanteLivreParaAdmin(String email, String cpf) {
        adotanteRepository.findByEmail(email).ifPresent(adotante -> {
            throw new RegraNegocioException("Ja existe usuario cadastrado com este e-mail");
        });
        adotanteRepository.findByCpf(cpf).ifPresent(adotante -> {
            throw new RegraNegocioException("Ja existe usuario cadastrado com este CPF");
        });
    }

    private Admin localizarAdmin(Adotante adotante, Map<String, Admin> admins) {
        Admin byEmail = admins.get(identityKey(adotante.getEmail()));
        if (byEmail != null) {
            return byEmail;
        }
        return admins.get(identityKey(adotante.getCpf()));
    }

    private Admin localizarAdmin(Adotante adotante) {
        return adminRepository.findByEmail(normalizeEmail(adotante.getEmail()))
                .or(() -> adminRepository.findByCpf(normalizeText(adotante.getCpf())))
                .orElse(null);
    }

    private String buildCsvReport(AdminOverviewResponse resumo, List<AnimalResponse> animais,
            List<AdminUsuarioResponse> usuarios, LocalDateTime geradoEm) {
        StringBuilder builder = new StringBuilder();
        builder.append("relatorio,gerado_em,valor\n");
        builder.append(csvRow("total_animais", geradoEm, resumo.totalAnimais()));
        builder.append(csvRow("animais_disponiveis", geradoEm, resumo.animaisDisponiveis()));
        builder.append(csvRow("total_usuarios", geradoEm, resumo.totalUsuarios()));
        builder.append(csvRow("solicitacoes_pendentes", geradoEm, resumo.solicitacoesPendentes()));
        builder.append(csvRow("relatorios_gerados", geradoEm, resumo.relatoriosGerados()));
        builder.append("\nanimais\nid,nome,especie,status,protetor\n");
        for (AnimalResponse animal : animais) {
            builder.append(animal.id()).append(',')
                    .append(csv(animal.nome())).append(',')
                    .append(animal.especie()).append(',')
                    .append(animal.status()).append(',')
                    .append(csv(animal.protetorNome())).append('\n');
        }
        builder.append("\nusuarios\nid,nome,email,administrador\n");
        for (AdminUsuarioResponse usuario : usuarios) {
            builder.append(usuario.id()).append(',')
                    .append(csv(usuario.nome())).append(',')
                    .append(csv(usuario.email())).append(',')
                    .append(usuario.administrador()).append('\n');
        }
        return builder.toString();
    }

    private String buildJsonReport(AdminOverviewResponse resumo, List<AnimalResponse> animais,
            List<AdminUsuarioResponse> usuarios, LocalDateTime geradoEm) {
        return """
                {
                  "geradoEm": "%s",
                  "resumo": {
                    "totalAnimais": %d,
                    "animaisDisponiveis": %d,
                    "totalUsuarios": %d,
                    "solicitacoesPendentes": %d,
                    "relatoriosGerados": %d
                  },
                  "animais": %d,
                  "usuarios": %d
                }
                """.formatted(geradoEm, resumo.totalAnimais(), resumo.animaisDisponiveis(),
                resumo.totalUsuarios(), resumo.solicitacoesPendentes(), resumo.relatoriosGerados(),
                animais.size(), usuarios.size());
    }

    private String buildHtmlReport(AdminOverviewResponse resumo, List<AnimalResponse> animais,
            List<AdminUsuarioResponse> usuarios, LocalDateTime geradoEm) {
        StringBuilder builder = new StringBuilder();
        builder.append("<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">")
                .append("<title>Relatorio AdotaPet</title>")
                .append("<style>body{font-family:Arial,sans-serif;color:#18352f;margin:32px}")
                .append("table{border-collapse:collapse;width:100%;margin:18px 0}")
                .append("th,td{border:1px solid #d8e7df;padding:8px;text-align:left}")
                .append("th{background:#edf7f1}</style></head><body>")
                .append("<h1>Relatorio administrativo AdotaPet</h1>")
                .append("<p>Gerado em ").append(escapeHtml(geradoEm.toString())).append("</p>")
                .append("<h2>Resumo</h2><table><tbody>")
                .append(metricRow("Animais", resumo.totalAnimais()))
                .append(metricRow("Disponiveis", resumo.animaisDisponiveis()))
                .append(metricRow("Usuarios", resumo.totalUsuarios()))
                .append(metricRow("Solicitacoes pendentes", resumo.solicitacoesPendentes()))
                .append(metricRow("Relatorios gerados", resumo.relatoriosGerados()))
                .append("</tbody></table><h2>Animais</h2><table><thead><tr>")
                .append("<th>ID</th><th>Nome</th><th>Especie</th><th>Status</th><th>Protetor</th></tr></thead><tbody>");
        for (AnimalResponse animal : animais) {
            builder.append("<tr><td>").append(animal.id()).append("</td><td>").append(escapeHtml(animal.nome()))
                    .append("</td><td>").append(animal.especie()).append("</td><td>").append(animal.status())
                    .append("</td><td>").append(escapeHtml(animal.protetorNome())).append("</td></tr>");
        }
        builder.append("</tbody></table><h2>Usuarios</h2><table><thead><tr>")
                .append("<th>ID</th><th>Nome</th><th>Email</th><th>Administrador</th></tr></thead><tbody>");
        for (AdminUsuarioResponse usuario : usuarios) {
            builder.append("<tr><td>").append(usuario.id()).append("</td><td>").append(escapeHtml(usuario.nome()))
                    .append("</td><td>").append(escapeHtml(usuario.email())).append("</td><td>")
                    .append(usuario.administrador() ? "Sim" : "Nao").append("</td></tr>");
        }
        return builder.append("</tbody></table></body></html>").toString();
    }

    private String csvRow(String label, LocalDateTime dateTime, long value) {
        return label + "," + dateTime + "," + value + "\n";
    }

    private String metricRow(String label, long value) {
        return "<tr><th>" + escapeHtml(label) + "</th><td>" + value + "</td></tr>";
    }

    private String filename(String extension, LocalDateTime geradoEm) {
        return "adotapet-relatorio-" + geradoEm.format(REPORT_DATE) + "." + extension;
    }

    private static String csv(String value) {
        String safe = String.valueOf(value == null ? "" : value);
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private static String escapeHtml(String value) {
        return String.valueOf(value == null ? "" : value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String limitar(String value, int maxLength, String fieldName) {
        if (value.isBlank()) {
            throw new RegraNegocioException("Informe " + fieldName);
        }
        if (value.length() > maxLength) {
            throw new RegraNegocioException("O campo " + fieldName + " deve ter no maximo " + maxLength + " caracteres");
        }
        return value;
    }

    private static void validarSenha(String senha) {
        if (senha.length() < 6 || senha.length() > 72) {
            throw new RegraNegocioException("A senha deve ter entre 6 e 72 caracteres");
        }
    }

    private static void validarSenhaOpcional(String senha) {
        if (!senha.isBlank()) {
            validarSenha(senha);
        }
    }

    private static String normalizeText(String value) {
        return String.valueOf(value == null ? "" : value).trim();
    }

    private static String normalizeEmail(String value) {
        return normalizeText(value).toLowerCase(Locale.ROOT);
    }

    private static String normalizePassword(String value) {
        return normalizeText(value);
    }

    private static String identityKey(String value) {
        return normalizeText(value).toLowerCase(Locale.ROOT);
    }
}
