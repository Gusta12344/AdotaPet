package com.adotapet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.adotapet.backend.dto.AdminMensagemRequest;
import com.adotapet.backend.dto.AdminUsuarioCreateRequest;
import com.adotapet.backend.dto.AdminUsuarioUpdateRequest;
import com.adotapet.backend.dto.NotificacaoResponse;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.model.Especie;
import com.adotapet.backend.model.NivelAtividade;
import com.adotapet.backend.model.Notificacao;
import com.adotapet.backend.model.Porte;
import com.adotapet.backend.model.StatusAnimal;
import com.adotapet.backend.model.StatusSolicitacao;
import com.adotapet.backend.model.TipoMoradia;
import com.adotapet.backend.model.TipoNotificacao;
import com.adotapet.backend.repository.AdminRepository;
import com.adotapet.backend.repository.AdotanteRepository;
import com.adotapet.backend.repository.AnimalRepository;
import com.adotapet.backend.repository.FavoritoAnimalRepository;
import com.adotapet.backend.repository.NotificacaoRepository;
import com.adotapet.backend.repository.SolicitacaoAdocaoRepository;
import com.adotapet.backend.repository.SolicitacaoModeracaoEventoRepository;

@ExtendWith(MockitoExtension.class)
class AdminAreaServiceTest {

    @Mock
    private AnimalRepository animalRepository;

    @Mock
    private AdotanteRepository adotanteRepository;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private SolicitacaoAdocaoRepository solicitacaoRepository;

    @Mock
    private SolicitacaoModeracaoEventoRepository solicitacaoEventoRepository;

    @Mock
    private FavoritoAnimalRepository favoritoAnimalRepository;

    @Mock
    private NotificacaoRepository notificacaoRepository;

    @Mock
    private NotificacaoService notificacaoService;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminAreaService adminAreaService;

    @BeforeEach
    void setUp() {
        adminAreaService = new AdminAreaService(
                animalRepository,
                adotanteRepository,
                adminRepository,
                solicitacaoRepository,
                solicitacaoEventoRepository,
                favoritoAnimalRepository,
                notificacaoRepository,
                notificacaoService,
                passwordEncoder
        );
    }

    @Test
    void resumoIncluiQuantidadeRealDeRelatoriosGerados() {
        when(animalRepository.count()).thenReturn(20L);
        when(animalRepository.countByStatus(StatusAnimal.disponivel)).thenReturn(15L);
        when(animalRepository.countByStatus(StatusAnimal.em_analise)).thenReturn(2L);
        when(animalRepository.countByStatus(StatusAnimal.adotado)).thenReturn(1L);
        when(adotanteRepository.count()).thenReturn(5L);
        when(adminRepository.count()).thenReturn(1L);
        when(solicitacaoRepository.countByStatus(StatusSolicitacao.pendente)).thenReturn(4L);
        when(solicitacaoRepository.countByStatus(StatusSolicitacao.em_analise)).thenReturn(3L);
        when(solicitacaoRepository.countByStatus(StatusSolicitacao.aprovada)).thenReturn(1L);
        when(solicitacaoRepository.countByStatus(StatusSolicitacao.recusada)).thenReturn(2L);
        when(animalRepository.findAllByOrderByDataCadastroAsc()).thenReturn(List.of());
        when(adotanteRepository.findAllByOrderByDataCadastroDesc()).thenReturn(List.of());
        when(adminRepository.findAll()).thenReturn(List.of());

        adminAreaService.gerarRelatorio("csv");
        adminAreaService.gerarRelatorio("json");

        var resumo = adminAreaService.resumo();

        assertEquals(15L, resumo.animaisDisponiveis());
        assertEquals(3L, resumo.solicitacoesEmAnalise());
        assertEquals(1L, resumo.solicitacoesAprovadas());
        assertEquals(5L, resumo.totalUsuarios());
        assertEquals(2L, resumo.relatoriosGerados());
    }

    @Test
    void listaMensagensNaoLidasComDadosReaisDoDestinatario() {
        Adotante maria = adotante(7, "Maria Oliveira", "maria@email.com", "111.111.111-11", "$hash-maria");
        Notificacao notificacao = new Notificacao();
        notificacao.setId(44);
        notificacao.setAdotante(maria);
        notificacao.setTipo(TipoNotificacao.sistema);
        notificacao.setTitulo("Atualizacao");
        notificacao.setMensagem("Sua solicitacao foi revisada.");
        notificacao.setDataCriacao(LocalDateTime.of(2026, 6, 14, 11, 30));

        when(notificacaoRepository.findTop5ByLidaFalseOrderByDataCriacaoDesc()).thenReturn(List.of(notificacao));

        var mensagens = adminAreaService.listarMensagensNaoLidas();

        assertEquals(1, mensagens.size());
        assertEquals(44, mensagens.get(0).id());
        assertEquals("Maria Oliveira", mensagens.get(0).adotanteNome());
        assertEquals("Sua solicitacao foi revisada.", mensagens.get(0).mensagem());
        assertEquals(false, mensagens.get(0).lida());
    }

    @Test
    void listaUsuariosIndicandoQuemJaEAdministrador() {
        Adotante maria = adotante(7, "Maria Oliveira", "maria@email.com", "111.111.111-11", "$hash-maria");
        Adotante joao = adotante(8, "Joao Lima", "joao@email.com", "222.222.222-22", "$hash-joao");
        Admin adminMaria = admin(3, maria.getNome(), maria.getEmail(), maria.getCpf(), "$hash-maria");

        when(adotanteRepository.findAllByOrderByDataCadastroDesc()).thenReturn(List.of(maria, joao));
        when(adminRepository.findAll()).thenReturn(List.of(adminMaria));

        var usuarios = adminAreaService.listarUsuarios();

        assertEquals(2, usuarios.size());
        assertEquals(true, usuarios.get(0).administrador());
        assertEquals(3, usuarios.get(0).adminId());
        assertEquals(false, usuarios.get(1).administrador());
    }

    @Test
    void listaUsuariosIncluiAdministradorSemAdotante() {
        Adotante maria = adotante(7, "Maria Oliveira", "maria@email.com", "111.111.111-11", "$hash-maria");
        Admin adminMaria = admin(3, maria.getNome(), maria.getEmail(), maria.getCpf(), "$hash-maria");
        Admin adminLogado = admin(1, "Administrador AdotaPet", "admin@adotapet.com", "000.000.000-00", "$hash-admin");

        when(adotanteRepository.findAllByOrderByDataCadastroDesc()).thenReturn(List.of(maria));
        when(adminRepository.findAll()).thenReturn(List.of(adminMaria, adminLogado));

        var usuarios = adminAreaService.listarUsuarios();

        assertEquals(2, usuarios.size());
        assertEquals("Maria Oliveira", usuarios.get(0).nome());
        assertEquals(false, usuarios.get(0).somenteAdministrador());
        assertEquals("Administrador AdotaPet", usuarios.get(1).nome());
        assertEquals(true, usuarios.get(1).administrador());
        assertEquals(true, usuarios.get(1).somenteAdministrador());
        assertEquals(1, usuarios.get(1).adminId());
    }

    @Test
    void promoveAdotanteParaAdminReaproveitandoCredenciaisExistentes() {
        Adotante maria = adotante(7, "Maria Oliveira", "maria@email.com", "111.111.111-11", "$hash-maria");
        ArgumentCaptor<Admin> adminCaptor = ArgumentCaptor.forClass(Admin.class);

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(maria));
        when(adminRepository.findByEmail("maria@email.com")).thenReturn(Optional.empty());
        when(adminRepository.findByCpf("111.111.111-11")).thenReturn(Optional.empty());
        when(adminRepository.save(any(Admin.class))).thenAnswer(invocation -> {
            Admin admin = invocation.getArgument(0);
            admin.setId(12);
            return admin;
        });

        var usuario = adminAreaService.promoverUsuario(7);

        verify(adminRepository).save(adminCaptor.capture());
        assertEquals("Maria Oliveira", adminCaptor.getValue().getNome());
        assertEquals("maria@email.com", adminCaptor.getValue().getEmail());
        assertEquals("111.111.111-11", adminCaptor.getValue().getCpf());
        assertEquals("$hash-maria", adminCaptor.getValue().getSenha());
        assertEquals(true, usuario.administrador());
        assertEquals(12, usuario.adminId());
    }

    @Test
    void cadastraUsuarioEAdminQuandoSolicitado() {
        AdminUsuarioCreateRequest request = new AdminUsuarioCreateRequest(
                " Ana Souza ",
                "333.333.333-33",
                "ana12345",
                " ANA@EMAIL.COM ",
                "(49) 99999-0000",
                "Fraiburgo, SC",
                TipoMoradia.apartamento,
                false,
                true,
                NivelAtividade.moderado,
                Porte.medio,
                Especie.gato,
                true
        );

        when(adotanteRepository.existsByEmail("ana@email.com")).thenReturn(false);
        when(adotanteRepository.existsByCpf("333.333.333-33")).thenReturn(false);
        when(adminRepository.findByEmail("ana@email.com")).thenReturn(Optional.empty());
        when(adminRepository.findByCpf("333.333.333-33")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("ana12345")).thenReturn("$hash-ana");
        when(adotanteRepository.save(any(Adotante.class))).thenAnswer(invocation -> {
            Adotante adotante = invocation.getArgument(0);
            adotante.setId(20);
            adotante.setDataCadastro(LocalDateTime.of(2026, 6, 14, 10, 0));
            return adotante;
        });
        when(adminRepository.save(any(Admin.class))).thenAnswer(invocation -> {
            Admin admin = invocation.getArgument(0);
            admin.setId(21);
            return admin;
        });

        var usuario = adminAreaService.cadastrarUsuario(request);

        assertEquals(20, usuario.id());
        assertEquals("Ana Souza", usuario.nome());
        assertEquals("ana@email.com", usuario.email());
        assertEquals(true, usuario.administrador());
        assertEquals(21, usuario.adminId());
    }

    @Test
    void atualizaUsuarioEAdminCorrespondente() {
        Adotante maria = adotante(7, "Maria Oliveira", "maria@email.com", "111.111.111-11", "$hash-maria");
        Admin adminMaria = admin(3, maria.getNome(), maria.getEmail(), maria.getCpf(), "$hash-maria");
        AdminUsuarioUpdateRequest request = new AdminUsuarioUpdateRequest(
                " Maria Souza ",
                "999.999.999-99",
                "",
                " MARIA.SOUZA@EMAIL.COM ",
                "(49) 98888-0000",
                "Rua Nova, 22",
                TipoMoradia.casa_com_quintal,
                true,
                false,
                NivelAtividade.ativo,
                Porte.grande,
                Especie.cao,
                true
        );

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(maria));
        when(adminRepository.findByEmail("maria@email.com")).thenReturn(Optional.of(adminMaria));
        when(adotanteRepository.findByEmail("maria.souza@email.com")).thenReturn(Optional.empty());
        when(adotanteRepository.findByCpf("999.999.999-99")).thenReturn(Optional.empty());
        when(adminRepository.findByEmail("maria.souza@email.com")).thenReturn(Optional.empty());
        when(adminRepository.findByCpf("999.999.999-99")).thenReturn(Optional.empty());

        var usuario = adminAreaService.atualizarUsuario(7, request);

        assertEquals("Maria Souza", usuario.nome());
        assertEquals("maria.souza@email.com", usuario.email());
        assertEquals("999.999.999-99", usuario.cpf());
        assertEquals(true, usuario.administrador());
        assertEquals("Maria Souza", adminMaria.getNome());
        assertEquals("maria.souza@email.com", adminMaria.getEmail());
        assertEquals("999.999.999-99", adminMaria.getCpf());
        assertEquals("$hash-maria", adminMaria.getSenha());
    }

    @Test
    void excluiUsuarioComVinculosEAdminCorrespondente() {
        Adotante maria = adotante(7, "Maria Oliveira", "maria@email.com", "111.111.111-11", "$hash-maria");
        Admin adminMaria = admin(3, maria.getNome(), maria.getEmail(), maria.getCpf(), "$hash-maria");

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(maria));
        when(adminRepository.findByEmail("maria@email.com")).thenReturn(Optional.of(adminMaria));

        adminAreaService.excluirUsuario(7);

        var order = inOrder(adminRepository, solicitacaoEventoRepository, solicitacaoRepository,
                favoritoAnimalRepository, notificacaoRepository, adotanteRepository);
        order.verify(adminRepository).delete(adminMaria);
        order.verify(solicitacaoEventoRepository).deleteBySolicitacaoAdotanteId(7);
        order.verify(solicitacaoRepository).deleteByAdotanteId(7);
        order.verify(favoritoAnimalRepository).deleteByAdotanteId(7);
        order.verify(notificacaoRepository).deleteByAdotanteId(7);
        order.verify(adotanteRepository).delete(maria);
    }

    @Test
    void atualizaAdministradorSemAdotante() {
        Admin adminLogado = admin(1, "Administrador AdotaPet", "admin@adotapet.com", "000.000.000-00", "$hash-admin");
        AdminUsuarioUpdateRequest request = new AdminUsuarioUpdateRequest(
                " Admin Principal ",
                "000.000.000-01",
                "",
                " ADMIN.PRINCIPAL@ADOTAPET.COM ",
                "",
                "",
                TipoMoradia.apartamento,
                false,
                false,
                NivelAtividade.moderado,
                Porte.medio,
                Especie.gato,
                true
        );

        when(adminRepository.findById(1)).thenReturn(Optional.of(adminLogado));
        when(adotanteRepository.findByEmail("admin.principal@adotapet.com")).thenReturn(Optional.empty());
        when(adotanteRepository.findByCpf("000.000.000-01")).thenReturn(Optional.empty());
        when(adminRepository.findByEmail("admin.principal@adotapet.com")).thenReturn(Optional.empty());
        when(adminRepository.findByCpf("000.000.000-01")).thenReturn(Optional.empty());

        var usuario = adminAreaService.atualizarAdministrador(1, request);

        assertEquals("Admin Principal", usuario.nome());
        assertEquals("admin.principal@adotapet.com", usuario.email());
        assertEquals("000.000.000-01", usuario.cpf());
        assertEquals(true, usuario.somenteAdministrador());
        assertEquals("$hash-admin", adminLogado.getSenha());
    }

    @Test
    void excluiAdministradorSemAdotante() {
        Admin adminLogado = admin(1, "Administrador AdotaPet", "admin@adotapet.com", "000.000.000-00", "$hash-admin");

        when(adminRepository.findById(1)).thenReturn(Optional.of(adminLogado));

        adminAreaService.excluirAdministrador(1);

        verify(adminRepository).delete(adminLogado);
    }

    @Test
    void enviaMensagemAdministrativaComoNotificacaoDeSistema() {
        Adotante maria = adotante(7, "Maria Oliveira", "maria@email.com", "111.111.111-11", "$hash-maria");
        AdminMensagemRequest request = new AdminMensagemRequest(7, "Atualizacao", "Sua solicitacao foi revisada.");

        when(adotanteRepository.findById(7)).thenReturn(Optional.of(maria));
        when(notificacaoService.criar(
                maria,
                TipoNotificacao.sistema,
                "Atualizacao",
                "Sua solicitacao foi revisada.",
                "mensagem_admin",
                7
        )).thenReturn(new NotificacaoResponse(
                30,
                TipoNotificacao.sistema,
                "Atualizacao",
                "Sua solicitacao foi revisada.",
                false,
                LocalDateTime.of(2026, 6, 14, 10, 0),
                "mensagem_admin",
                7
        ));

        var response = adminAreaService.enviarMensagem(request);

        assertEquals(30, response.id());
        assertEquals("Atualizacao", response.titulo());
        assertEquals(TipoNotificacao.sistema, response.tipo());
    }

    private Adotante adotante(Integer id, String nome, String email, String cpf, String senha) {
        Adotante adotante = new Adotante();
        adotante.setId(id);
        adotante.setNome(nome);
        adotante.setEmail(email);
        adotante.setTelefone("(49) 99999-0000");
        adotante.setCpf(cpf);
        adotante.setSenha(senha);
        adotante.setEndereco("Fraiburgo, SC");
        adotante.setTipoMoradia(TipoMoradia.apartamento);
        adotante.setNivelAtividade(NivelAtividade.moderado);
        adotante.setPreferenciaPorte(Porte.medio);
        adotante.setPreferenciaEspecie(Especie.gato);
        adotante.setDataCadastro(LocalDateTime.of(2026, 6, 14, 9, 0));
        return adotante;
    }

    private Admin admin(Integer id, String nome, String email, String cpf, String senha) {
        Admin admin = new Admin();
        admin.setId(id);
        admin.setNome(nome);
        admin.setEmail(email);
        admin.setCpf(cpf);
        admin.setSenha(senha);
        return admin;
    }
}
