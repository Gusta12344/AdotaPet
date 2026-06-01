package com.adotapet.backend.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class FavoritoSchemaMigration implements ApplicationRunner {

    private static final String TABLE = "adotante_favorito";

    private final JdbcTemplate jdbcTemplate;

    public FavoritoSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (tableExists()) {
            return;
        }

        jdbcTemplate.execute("""
                CREATE TABLE adotante_favorito (
                    adotante_id INT NOT NULL,
                    animal_id INT NOT NULL,
                    data_favorito DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (adotante_id, animal_id),
                    CONSTRAINT fk_favorito_adotante FOREIGN KEY (adotante_id)
                        REFERENCES adotante (id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,
                    CONSTRAINT fk_favorito_animal FOREIGN KEY (animal_id)
                        REFERENCES animal (id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE
                )
                """);
    }

    private boolean tableExists() {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.tables
                 WHERE table_schema = DATABASE()
                   AND table_name = ?
                """, Integer.class, TABLE);
        return count != null && count > 0;
    }
}
