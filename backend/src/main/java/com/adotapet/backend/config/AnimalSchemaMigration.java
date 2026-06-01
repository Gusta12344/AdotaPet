package com.adotapet.backend.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AnimalSchemaMigration implements ApplicationRunner {

    private static final String ANIMAL_TABLE = "animal";
    private static final List<String> CONVIVENCIA_COLUMNS = List.of(
            "bom_com_criancas",
            "bom_com_caes",
            "bom_com_gatos"
    );

    private final JdbcTemplate jdbcTemplate;

    public AnimalSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean addedColumn = false;
        for (String column : CONVIVENCIA_COLUMNS) {
            addedColumn = ensureBooleanColumn(column) || addedColumn;
        }

        if (addedColumn && columnExists("bom_convivencia")) {
            jdbcTemplate.update("""
                    UPDATE animal
                       SET bom_com_criancas = bom_convivencia,
                           bom_com_caes = bom_convivencia,
                           bom_com_gatos = bom_convivencia
                    """);
        }
    }

    private boolean ensureBooleanColumn(String column) {
        if (columnExists(column)) {
            return false;
        }

        jdbcTemplate.execute("ALTER TABLE " + ANIMAL_TABLE
                + " ADD COLUMN " + column + " TINYINT(1) NOT NULL DEFAULT 0");
        return true;
    }

    private boolean columnExists(String column) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.columns
                 WHERE table_schema = DATABASE()
                   AND table_name = ?
                   AND column_name = ?
                """, Integer.class, ANIMAL_TABLE, column);
        return count != null && count > 0;
    }
}
