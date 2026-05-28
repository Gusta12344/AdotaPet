package com.adotapet.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.adotapet.backend.service.AnimalImagemStorageService;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AnimalImagemStorageService animalImagemStorageService;

    public WebConfig(AnimalImagemStorageService animalImagemStorageService) {
        this.animalImagemStorageService = animalImagemStorageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/animais/**")
                .addResourceLocations(animalImagemStorageService.getUploadDir().toUri().toString() + "/");
    }
}
