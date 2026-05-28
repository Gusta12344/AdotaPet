package com.adotapet.backend;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import com.adotapet.backend.config.WebConfig;
import com.adotapet.backend.service.AnimalImagemStorageService;

class AnimalImagemStorageServiceContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(AnimalImagemStorageService.class, WebConfig.class)
            .withPropertyValues("adotapet.upload-dir=target/test-uploads/animais");

    @Test
    void criaServicoDeImagemComDiretorioConfigurado() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(AnimalImagemStorageService.class);
            assertThat(context).hasSingleBean(WebConfig.class);
        });
    }
}
