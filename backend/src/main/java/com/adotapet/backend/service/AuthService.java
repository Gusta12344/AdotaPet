package com.adotapet.backend.service;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adotapet.backend.dto.LoginResponse;
import com.adotapet.backend.model.Admin;
import com.adotapet.backend.model.Adotante;
import com.adotapet.backend.repository.AdminRepository;
import com.adotapet.backend.repository.AdotanteRepository;

@Service
public class AuthService {

    private final AdotanteRepository adotanteRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            AdotanteRepository adotanteRepository,
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder) {
        this.adotanteRepository = adotanteRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(String cpf, String senha) {
        String cpfFormatado = formatarCpf(cpf);
        String cpfNumeros = apenasNumeros(cpf);
        String senhaLimpa = String.valueOf(senha).trim();

        return buscarAdotantePorCpf(cpfFormatado, cpfNumeros)
                .map(adotante -> autenticarAdotante(adotante, senhaLimpa))
                .orElseGet(() -> autenticarAdmin(cpfFormatado, cpfNumeros, senhaLimpa));
    }

    private LoginResponse autenticarAdotante(Adotante adotante, String senha) {
        if (!passwordEncoder.matches(senha, adotante.getSenha())) {
            throw new BadCredentialsException("CPF ou senha invalidos");
        }

        return new LoginResponse(
                true,
                "adotante",
                adotante.getId(),
                adotante.getNome(),
                adotante.getCpf(),
                adotante.getEmail(),
                adotante.getTelefone(),
                adotante.getEndereco(),
                adotante.getTipoMoradia().name(),
                adotante.isTemCriancas(),
                adotante.isTemOutrosAnimais(),
                adotante.getNivelAtividade().name(),
                adotante.getPreferenciaPorte().name(),
                adotante.getPreferenciaEspecie().name(),
                "Login realizado com sucesso"
        );
    }

    private LoginResponse autenticarAdmin(String cpfFormatado, String cpfNumeros, String senha) {
        Admin admin = buscarAdminPorCpf(cpfFormatado, cpfNumeros)
                .orElseThrow(() -> new BadCredentialsException("CPF ou senha invalidos"));

        if (!passwordEncoder.matches(senha, admin.getSenha())) {
            throw new BadCredentialsException("CPF ou senha invalidos");
        }

        return new LoginResponse(
                true,
                "admin",
                admin.getId(),
                admin.getNome(),
                admin.getCpf(),
                admin.getEmail(),
                null,
                null,
                null,
                false,
                false,
                null,
                null,
                null,
                "Login realizado com sucesso"
        );
    }

    private java.util.Optional<Adotante> buscarAdotantePorCpf(String cpfFormatado, String cpfNumeros) {
        return adotanteRepository.findByCpf(cpfFormatado)
                .or(() -> adotanteRepository.findByCpf(cpfNumeros));
    }

    private java.util.Optional<Admin> buscarAdminPorCpf(String cpfFormatado, String cpfNumeros) {
        return adminRepository.findByCpf(cpfFormatado)
                .or(() -> adminRepository.findByCpf(cpfNumeros));
    }

    private String apenasNumeros(String cpf) {
        return String.valueOf(cpf).replaceAll("\\D", "");
    }

    private String formatarCpf(String cpf) {
        String numeros = apenasNumeros(cpf);
        if (numeros.length() != 11) {
            return String.valueOf(cpf).trim();
        }
        return numeros.substring(0, 3)
                + "." + numeros.substring(3, 6)
                + "." + numeros.substring(6, 9)
                + "-" + numeros.substring(9);
    }
}
