package com.adotapet.backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AnimalImagemStorageService {

    private static final Set<String> EXTENSOES_PERMITIDAS = Set.of("png", "jpg", "jpeg", "webp");
    private static final Set<String> CONTENT_TYPES_PERMITIDOS = Set.of("image/png", "image/jpeg", "image/webp");

    private final Path uploadDir;

    @Autowired
    public AnimalImagemStorageService(@Value("${adotapet.upload-dir:uploads/animais}") String uploadDir) {
        this(Path.of(uploadDir));
    }

    public AnimalImagemStorageService(Path uploadDir) {
        this.uploadDir = uploadDir.toAbsolutePath().normalize();
    }

    public List<String> salvar(List<MultipartFile> arquivos) {
        if (arquivos == null || arquivos.isEmpty()) {
            return List.of();
        }

        try {
            Files.createDirectories(uploadDir);
        } catch (IOException exception) {
            throw new RegraNegocioException("Nao foi possivel preparar o diretorio de imagens");
        }

        List<String> caminhos = new ArrayList<>();
        for (MultipartFile arquivo : arquivos) {
            if (arquivo == null || arquivo.isEmpty()) {
                continue;
            }
            caminhos.add(salvarArquivo(arquivo));
        }

        return caminhos;
    }

    public Path getUploadDir() {
        return uploadDir;
    }

    private String salvarArquivo(MultipartFile arquivo) {
        String extensao = obterExtensao(arquivo.getOriginalFilename());
        validarImagem(arquivo, extensao);

        String nomeArquivo = UUID.randomUUID() + "." + extensao;
        Path destino = uploadDir.resolve(nomeArquivo).normalize();
        if (!destino.startsWith(uploadDir)) {
            throw new RegraNegocioException("Nome de arquivo de imagem invalido");
        }

        try (InputStream entrada = arquivo.getInputStream()) {
            Files.copy(entrada, destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new RegraNegocioException("Nao foi possivel salvar a imagem do animal");
        }

        return "/uploads/animais/" + nomeArquivo;
    }

    private void validarImagem(MultipartFile arquivo, String extensao) {
        String contentType = arquivo.getContentType();
        if (!EXTENSOES_PERMITIDAS.contains(extensao)
                || contentType == null
                || !CONTENT_TYPES_PERMITIDOS.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new RegraNegocioException("Imagem do animal deve ser PNG, JPG, JPEG ou WEBP");
        }
    }

    private String obterExtensao(String nomeOriginal) {
        if (nomeOriginal == null || !nomeOriginal.contains(".")) {
            throw new RegraNegocioException("Imagem do animal deve ter extensao valida");
        }

        return nomeOriginal.substring(nomeOriginal.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
