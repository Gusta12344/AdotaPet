package com.adotapet.backend.security;

import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.adotapet.backend.model.Admin;
import com.adotapet.backend.repository.AdminRepository;

@Service
public class AdminUserDetailsService implements UserDetailsService {

    private final AdminRepository adminRepository;

    public AdminUserDetailsService(AdminRepository adminRepository) {
        this.adminRepository = adminRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Admin nao encontrado"));

        return new User(
                admin.getEmail(),
                admin.getSenha(),
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }
}
