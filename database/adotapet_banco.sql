-- ============================================================
--  AdotaPet – Script SQL Completo
--  IFC Campus Fraiburgo | ADS 3ª Fase | Grupo 2
--  Gustavo Huçulak | Estefani Santos | Gabriel Chagas
-- ============================================================

-- ── Criação / seleção do banco ────────────────────────────────
CREATE DATABASE IF NOT EXISTS adotapet
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE adotapet;

-- ============================================================
--  DDL — Definição das Tabelas
-- ============================================================

-- ── 1. admin ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin (
    id            INT          NOT NULL AUTO_INCREMENT,
    nome          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    senha         VARCHAR(255) NOT NULL,           -- hash BCrypt
    PRIMARY KEY (id)
);

-- ── 2. protetor ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS protetor (
    id            INT          NOT NULL AUTO_INCREMENT,
    nome          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    telefone      VARCHAR(20)  NOT NULL,
    PRIMARY KEY (id)
);

-- ── 3. animal ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS animal (
    id                  INT          NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(100) NOT NULL,
    especie             ENUM('cao', 'gato', 'outro')              NOT NULL,
    raca                VARCHAR(100)                              DEFAULT 'SRD',
    idade_meses         INT          NOT NULL                     CHECK (idade_meses >= 0),
    porte               ENUM('pequeno', 'medio', 'grande')        NOT NULL,
    nivel_energia       ENUM('baixo', 'medio', 'alto')            NOT NULL,
    bom_com_criancas    TINYINT(1)   NOT NULL DEFAULT 0,
    bom_com_animais     TINYINT(1)   NOT NULL DEFAULT 0,
    precisa_espaco      TINYINT(1)   NOT NULL DEFAULT 0,          -- 1 = precisa de quintal
    descricao           TEXT,
    status              ENUM('disponivel', 'em_analise', 'adotado') NOT NULL DEFAULT 'disponivel',
    data_cadastro       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    protetor_id         INT          NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_animal_protetor FOREIGN KEY (protetor_id)
        REFERENCES protetor (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- ── 4. adotante ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS adotante (
    id                    INT          NOT NULL AUTO_INCREMENT,
    nome                  VARCHAR(100) NOT NULL,
    cpf                   VARCHAR(14)  NOT NULL UNIQUE,           -- formato 000.000.000-00
    email                 VARCHAR(150) NOT NULL UNIQUE,
    telefone              VARCHAR(20)  NOT NULL,
    endereco              VARCHAR(255) NOT NULL,
    -- Perfil de compatibilidade
    tipo_moradia          ENUM('apartamento', 'casa_sem_quintal', 'casa_com_quintal') NOT NULL,
    tem_criancas          TINYINT(1)   NOT NULL DEFAULT 0,
    tem_outros_animais    TINYINT(1)   NOT NULL DEFAULT 0,
    nivel_atividade       ENUM('sedentario', 'moderado', 'ativo') NOT NULL,
    preferencia_porte     ENUM('pequeno', 'medio', 'grande', 'indiferente') NOT NULL DEFAULT 'indiferente',
    preferencia_especie   ENUM('cao', 'gato', 'outro', 'indiferente')       NOT NULL DEFAULT 'indiferente',
    data_cadastro         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- ── 5. solicitacao_adocao ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS solicitacao_adocao (
    id                INT      NOT NULL AUTO_INCREMENT,
    animal_id         INT      NOT NULL,
    adotante_id       INT      NOT NULL,
    data_solicitacao  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status            ENUM('pendente', 'aprovada', 'recusada') NOT NULL DEFAULT 'pendente',
    PRIMARY KEY (id),
    CONSTRAINT fk_sol_animal   FOREIGN KEY (animal_id)
        REFERENCES animal (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_sol_adotante FOREIGN KEY (adotante_id)
        REFERENCES adotante (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- ── Índices para performance ──────────────────────────────────
CREATE INDEX idx_animal_status       ON animal (status);
CREATE INDEX idx_animal_especie      ON animal (especie);
CREATE INDEX idx_sol_animal_status   ON solicitacao_adocao (animal_id, status);
CREATE INDEX idx_sol_data            ON solicitacao_adocao (data_solicitacao);

-- ============================================================
--  DML — Dados de Exemplo
-- ============================================================

-- ── admin (senha = "admin123" em BCrypt) ─────────────────────
INSERT INTO admin (nome, email, senha) VALUES
    ('Administrador AdotaPet',
     'admin@adotapet.com',
     '$2a$10$7QJ9JjNkmPOGGpANn6gJFuBanJYG2lAmgqhLAZa8j5UZQY3z/mXoO');

-- ── protetores ────────────────────────────────────────────────
INSERT INTO protetor (nome, email, telefone) VALUES
    ('ONG Patinhas Felizes',   'patinhas@ong.com',   '(47) 99801-1111'),
    ('Abrigo Amigos de Patas', 'amigos@abrigo.com',  '(47) 99802-2222'),
    ('Protetora Ana Lima',     'ana.lima@gmail.com', '(47) 99803-3333');

-- ── animais ───────────────────────────────────────────────────
INSERT INTO animal (nome, especie, raca, idade_meses, porte, nivel_energia,
                    bom_com_criancas, bom_com_animais, precisa_espaco,
                    descricao, status, protetor_id)
VALUES
    -- cães
    ('Bolinha', 'cao', 'SRD',             24,  'pequeno', 'alto',  1, 1, 0,
     'Bolinha é um cão alegre e brincalhão. Adora crianças e se dá bem com outros cães.',
     'disponivel', 1),

    ('Thor',    'cao', 'Labrador',        36,  'grande',  'alto',  1, 0, 1,
     'Thor é forte, leal e cheio de energia. Precisa de espaço para correr e brincar.',
     'disponivel', 1),

    ('Mel',     'cao', 'Poodle',          60,  'pequeno', 'baixo', 1, 1, 0,
     'Mel é tranquila, carinhosa e adora colo. Ideal para apartamento.',
     'disponivel', 2),

    ('Rex',     'cao', 'Pastor Alemão',   18,  'grande',  'alto',  0, 0, 1,
     'Rex é inteligente mas ainda está em treinamento social. Sem crianças pequenas.',
     'disponivel', 2),

    ('Pipoca',  'cao', 'Dachshund',       12,  'pequeno', 'medio', 1, 1, 0,
     'Pipoca é curiosa e ativa, mas se adapta bem a espaços menores.',
     'disponivel', 3),

    -- gatos
    ('Mimi',   'gato', 'Siamês',          48,  'pequeno', 'baixo', 1, 0, 0,
     'Mimi é independente e tranquila. Prefere ambientes calmos.',
     'disponivel', 1),

    ('Pelé',   'gato', 'SRD',              8,  'pequeno', 'alto',  1, 1, 0,
     'Pelé é um gatinho filhote super curioso e brincalhão.',
     'disponivel', 2),

    ('Sombra', 'gato', 'SRD',             36,  'pequeno', 'medio', 0, 1, 0,
     'Sombra é tímido com crianças mas convive bem com outros gatos.',
     'disponivel', 3),

    -- animal em análise (para testar fluxo)
    ('Duque',  'cao', 'Bulldog Francês',  24,  'pequeno', 'baixo', 1, 1, 0,
     'Duque é calmo, carinhoso e se adapta bem a apartamento.',
     'em_analise', 1);

-- ── adotantes ─────────────────────────────────────────────────
INSERT INTO adotante (nome, cpf, email, telefone, endereco,
                       tipo_moradia, tem_criancas, tem_outros_animais,
                       nivel_atividade, preferencia_porte, preferencia_especie)
VALUES
    ('Maria Oliveira',  '111.111.111-11', 'maria@email.com',  '(47) 99901-0001',
     'Rua das Flores, 100, Fraiburgo SC',
     'apartamento',       0, 0, 'moderado', 'pequeno',    'gato'),

    ('Carlos Souza',    '222.222.222-22', 'carlos@email.com', '(47) 99901-0002',
     'Av. Principal, 500, Curitibanos SC',
     'casa_com_quintal',  1, 0, 'ativo',    'grande',     'cao'),

    ('Beatriz Lima',    '333.333.333-33', 'beatriz@email.com','(47) 99901-0003',
     'Rua do Bosque, 22, Campos Novos SC',
     'casa_sem_quintal',  1, 1, 'moderado', 'pequeno',    'indiferente'),

    ('João Pedro Costa','444.444.444-44', 'joao@email.com',   '(47) 99901-0004',
     'Rua Norte, 77, Fraiburgo SC',
     'apartamento',       0, 1, 'sedentario','indiferente','gato'),

    ('Fernanda Rocha',  '555.555.555-55', 'fernanda@email.com','(47) 99901-0005',
     'Estrada Rural, km 5, Fraiburgo SC',
     'casa_com_quintal',  0, 0, 'ativo',    'grande',     'cao');

-- ── solicitações de adoção (fila) ────────────────────────────
-- Simulando fila para Bolinha: Maria e Beatriz solicitaram
INSERT INTO solicitacao_adocao (animal_id, adotante_id, data_solicitacao, status)
VALUES
    (1, 1, '2026-03-10 09:15:00', 'pendente'),  -- Maria → Bolinha (1ª na fila)
    (1, 3, '2026-03-10 14:30:00', 'pendente'),  -- Beatriz → Bolinha (2ª na fila)
    -- Carlos solicitou Thor
    (2, 5, '2026-03-11 10:00:00', 'pendente'),  -- Fernanda → Thor
    (2, 2, '2026-03-11 11:45:00', 'pendente'),  -- Carlos → Thor
    -- Solicitação já aprovada (Duque, para mostrar histórico)
    (9, 4, '2026-03-09 08:00:00', 'aprovada');  -- João → Duque (aprovada, daí em_analise)

-- ============================================================
--  SELECTs de verificação (executar para validar o script)
-- ============================================================

-- Quantos animais por status
SELECT status, COUNT(*) AS total
FROM animal
GROUP BY status;

-- Animais disponíveis com nome do protetor
SELECT a.id, a.nome, a.especie, a.porte, a.nivel_energia, p.nome AS protetor
FROM animal a
JOIN protetor p ON a.protetor_id = p.id
WHERE a.status = 'disponivel'
ORDER BY a.data_cadastro;

-- Fila de solicitações pendentes ordenada por chegada
SELECT
    sa.id,
    sa.data_solicitacao,
    a.nome  AS animal,
    ad.nome AS adotante,
    sa.status
FROM solicitacao_adocao sa
JOIN animal   a  ON sa.animal_id   = a.id
JOIN adotante ad ON sa.adotante_id = ad.id
WHERE sa.status = 'pendente'
ORDER BY sa.data_solicitacao ASC;

-- ============================================================
--  Fim do script
-- ============================================================
