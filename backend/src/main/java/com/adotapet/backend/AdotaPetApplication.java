package com.adotapet.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class AdotaPetApplication {

    public static void main(String[] args) {
        SpringApplication.run(AdotaPetApplication.class, args);
    }
}
