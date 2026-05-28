package com.adotapet.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import com.adotapet.backend.service.AnimalImagemStorageService;
import com.adotapet.backend.service.RegraNegocioException;

class AnimalImagemArquivoTest {

    @TempDir
    Path tempDir;

    @Test
    void salvaArquivosDeImagemEDevolveCaminhosPublicos() throws Exception {
        AnimalImagemStorageService storage = new AnimalImagemStorageService(tempDir);
        MockMultipartFile png = new MockMultipartFile("imagens", "mimi.png", "image/png", "png".getBytes());
        MockMultipartFile jpg = new MockMultipartFile("imagens", "mimi.jpg", "image/jpeg", "jpg".getBytes());

        List<String> caminhos = storage.salvar(List.of(png, jpg));

        assertEquals(2, caminhos.size());
        assertTrue(caminhos.get(0).startsWith("/uploads/animais/"));
        assertTrue(caminhos.get(0).endsWith(".png"));
        assertTrue(caminhos.get(1).endsWith(".jpg"));
        assertEquals(2, Files.list(tempDir).count());
    }

    @Test
    void rejeitaArquivoQueNaoEImagem() {
        AnimalImagemStorageService storage = new AnimalImagemStorageService(tempDir);
        MockMultipartFile txt = new MockMultipartFile("imagens", "mimi.txt", "text/plain", "texto".getBytes());

        assertThrows(RegraNegocioException.class, () -> storage.salvar(List.of(txt)));
    }
}
