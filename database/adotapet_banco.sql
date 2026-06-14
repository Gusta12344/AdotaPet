-- ============================================================
--  AdotaPet – Script SQL Completo
--  IFC Campus Fraiburgo | ADS 3ª Fase | Grupo 2
--  Gustavo Huçulak | Estefani Santos 
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
    cpf           VARCHAR(14)  NOT NULL UNIQUE,
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
    sexo                ENUM('macho', 'femea')                    NOT NULL,
    data_resgate        DATE         NOT NULL,
    nivel_energia       ENUM('baixo', 'medio', 'alto')            NOT NULL,
    bom_com_criancas    TINYINT(1)   NOT NULL DEFAULT 0,
    bom_com_caes        TINYINT(1)   NOT NULL DEFAULT 0,
    bom_com_gatos       TINYINT(1)   NOT NULL DEFAULT 0,
    precisa_espaco      TINYINT(1)   NOT NULL DEFAULT 0,          -- 1 = precisa de quintal
    microchip           TINYINT(1)   NOT NULL DEFAULT 0,
    castrado            TINYINT(1)   NOT NULL DEFAULT 0,
    vermifugado         TINYINT(1)   NOT NULL DEFAULT 0,
    vacinado            TINYINT(1)   NOT NULL DEFAULT 0,
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
CREATE TABLE IF NOT EXISTS animal_imagem (
    id          INT           NOT NULL AUTO_INCREMENT,
    animal_id   INT           NOT NULL,
    url         VARCHAR(2048) NOT NULL,
    ordem       INT           NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_animal_imagem_animal FOREIGN KEY (animal_id)
        REFERENCES animal (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS adotante (
    id                    INT          NOT NULL AUTO_INCREMENT,
    nome                  VARCHAR(100) NOT NULL,
    cpf                   VARCHAR(14)  NOT NULL UNIQUE,           -- formato 000.000.000-00
    senha                 VARCHAR(255) NOT NULL,                   -- hash BCrypt
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
    status            ENUM('pendente', 'em_analise', 'aprovada', 'recusada') NOT NULL DEFAULT 'pendente',
    data_inicio_analise DATETIME NULL,
    data_decisao      DATETIME NULL,
    admin_responsavel_id INT NULL,
    dados_adotante_conferidos TINYINT(1) NOT NULL DEFAULT 0,
    animal_disponivel_conferido TINYINT(1) NOT NULL DEFAULT 0,
    contato_revisado  TINYINT(1) NOT NULL DEFAULT 0,
    observacao_admin  TEXT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_sol_animal   FOREIGN KEY (animal_id)
        REFERENCES animal (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_sol_adotante FOREIGN KEY (adotante_id)
        REFERENCES adotante (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_solicitacao_admin_responsavel FOREIGN KEY (admin_responsavel_id)
        REFERENCES admin (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS solicitacao_moderacao_evento (
    id              INT NOT NULL AUTO_INCREMENT,
    solicitacao_id  INT NOT NULL,
    admin_id        INT NULL,
    tipo            ENUM('solicitacao_enviada', 'analise_iniciada', 'checklist_atualizado', 'aprovada', 'recusada', 'recusa_automatica') NOT NULL,
    observacao      TEXT NULL,
    data_evento     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_evento_solicitacao FOREIGN KEY (solicitacao_id)
        REFERENCES solicitacao_adocao (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_evento_admin FOREIGN KEY (admin_id)
        REFERENCES admin (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- ── Índices para performance ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacao (
    id              INT          NOT NULL AUTO_INCREMENT,
    adotante_id     INT          NOT NULL,
    tipo            ENUM('favoritos', 'adocao', 'sistema') NOT NULL,
    titulo          VARCHAR(120) NOT NULL,
    mensagem        VARCHAR(500) NOT NULL,
    lida            TINYINT(1)   NOT NULL DEFAULT 0,
    data_criacao    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    referencia_tipo VARCHAR(60),
    referencia_id   INT,
    PRIMARY KEY (id),
    CONSTRAINT fk_notificacao_adotante FOREIGN KEY (adotante_id)
        REFERENCES adotante (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS adotante_favorito (
    adotante_id    INT      NOT NULL,
    animal_id      INT      NOT NULL,
    data_favorito  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (adotante_id, animal_id),
    CONSTRAINT fk_favorito_adotante FOREIGN KEY (adotante_id)
        REFERENCES adotante (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_favorito_animal FOREIGN KEY (animal_id)
        REFERENCES animal (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_animal_status ON animal (status);
CREATE INDEX idx_animal_especie ON animal (especie);
CREATE INDEX idx_animal_imagem ON animal_imagem (animal_id, ordem);
CREATE INDEX idx_favorito_animal ON adotante_favorito (animal_id);
CREATE INDEX idx_sol_animal_status ON solicitacao_adocao (animal_id, status);
CREATE INDEX idx_sol_data ON solicitacao_adocao (data_solicitacao);
CREATE INDEX idx_sol_status_decisao ON solicitacao_adocao (status, data_decisao);
CREATE INDEX idx_evento_solicitacao_data ON solicitacao_moderacao_evento (solicitacao_id, data_evento);
CREATE INDEX idx_notificacao_adotante_lida ON notificacao (adotante_id, lida, data_criacao);

-- Atualizacao manual para bancos locais ja criados antes da Central de Moderacao:
-- ALTER TABLE solicitacao_adocao
--   MODIFY status ENUM('pendente', 'em_analise', 'aprovada', 'recusada') NOT NULL DEFAULT 'pendente',
--   ADD COLUMN data_inicio_analise DATETIME NULL,
--   ADD COLUMN data_decisao DATETIME NULL,
--   ADD COLUMN admin_responsavel_id INT NULL,
--   ADD COLUMN dados_adotante_conferidos TINYINT(1) NOT NULL DEFAULT 0,
--   ADD COLUMN animal_disponivel_conferido TINYINT(1) NOT NULL DEFAULT 0,
--   ADD COLUMN contato_revisado TINYINT(1) NOT NULL DEFAULT 0,
--   ADD COLUMN observacao_admin TEXT NULL,
--   ADD CONSTRAINT fk_solicitacao_admin_responsavel FOREIGN KEY (admin_responsavel_id) REFERENCES admin(id);
-- CREATE TABLE IF NOT EXISTS solicitacao_moderacao_evento (... conforme DDL acima ...);

-- ============================================================
--  DML — Dados de Exemplo
-- ============================================================

-- ── admin (cpf 000.000.000-00, senha = "admin123" em BCrypt) ─────────────────────
INSERT INTO admin (nome, email, cpf, senha) VALUES
    ('Administrador AdotaPet',
     'admin@adotapet.com',
     '000.000.000-00',
     '$2a$10$XP1tvcPQGda.a1VpAsYlGeN4oSwouCCevP8HRyaLNjK1ZcxnFUF4O')
ON DUPLICATE KEY UPDATE
    nome = VALUES(nome),
    cpf = VALUES(cpf),
    senha = VALUES(senha);

-- ── protetores ────────────────────────────────────────────────
INSERT INTO protetor (nome, email, telefone) VALUES
    ('ONG Patinhas Felizes',   'patinhas@ong.com',   '(47) 99801-1111'),
    ('Abrigo Amigos de Patas', 'amigos@abrigo.com',  '(47) 99802-2222'),
    ('Protetora Ana Lima',     'ana.lima@gmail.com', '(47) 99803-3333');

-- ── animais ───────────────────────────────────────────────────
INSERT INTO animal (nome, especie, raca, idade_meses, porte, sexo, data_resgate, nivel_energia,
                    bom_com_criancas, bom_com_caes, bom_com_gatos, precisa_espaco,
                    microchip, castrado, vermifugado, vacinado,
                    descricao, status, protetor_id)
VALUES
    -- cães
    ('Bolinha', 'cao', 'SRD',             24,  'pequeno', 'macho', '2024-01-15', 'alto',  1, 1, 0, 0, 0, 1, 1, 1,
     'Bolinha é um cão alegre e brincalhão. Adora crianças e se dá bem com outros cães.',
     'disponivel', 1),

    ('Thor',    'cao', 'Labrador',        36,  'grande',  'macho', '2023-11-08', 'alto',  1, 0, 0, 1, 1, 1, 1, 1,
     'Thor é forte, leal e cheio de energia. Precisa de espaço para correr e brincar.',
     'disponivel', 1),

    ('Mel',     'cao', 'Poodle',          60,  'pequeno', 'femea', '2022-05-20', 'baixo', 1, 1, 1, 0, 1, 1, 1, 1,
     'Mel é tranquila, carinhosa e adora colo. Ideal para apartamento.',
     'disponivel', 2),

    ('Rex',     'cao', 'Pastor Alemão',   18,  'grande',  'macho', '2024-06-12', 'alto',  0, 0, 0, 1, 0, 0, 1, 1,
     'Rex é inteligente mas ainda está em treinamento social. Sem crianças pequenas.',
     'disponivel', 2),

    ('Pipoca',  'cao', 'Dachshund',       12,  'pequeno', 'femea', '2025-03-04', 'medio', 1, 1, 0, 0, 0, 0, 1, 1,
     'Pipoca é curiosa e ativa, mas se adapta bem a espaços menores.',
     'disponivel', 3),

    -- gatos
    ('Mimi',   'gato', 'Siamês',          48,  'pequeno', 'femea', '2023-02-18', 'baixo', 1, 0, 0, 0, 1, 1, 1, 1,
     'Mimi é independente e tranquila. Prefere ambientes calmos.',
     'disponivel', 1),

    ('Pelé',   'gato', 'SRD',              8,  'pequeno', 'macho', '2025-10-02', 'alto',  1, 0, 1, 0, 0, 0, 1, 1,
     'Pelé é um gatinho filhote super curioso e brincalhão.',
     'disponivel', 2),

    ('Sombra', 'gato', 'SRD',             36,  'pequeno', 'macho', '2023-07-11', 'medio', 0, 0, 1, 0, 0, 1, 1, 1,
     'Sombra é tímido com crianças mas convive bem com outros gatos.',
     'disponivel', 3),

    -- animal em análise (para testar fluxo)
    ('Duque',  'cao', 'Bulldog Francês',  24,  'pequeno', 'macho', '2023-12-22', 'baixo', 1, 1, 0, 0, 1, 1, 1, 1,
     'Duque é calmo, carinhoso e se adapta bem a apartamento.',
     'em_analise', 1),

    -- mais animais disponíveis para a página inicial
    ('Luna',   'cao', 'Golden Retriever', 30,  'grande',  'femea', '2023-03-12', 'alto',  1, 1, 1, 1, 1, 1, 1, 1,
     'Luna é dócil, brincalhona e ama passeios longos com a família.',
     'disponivel', 1),

    ('Nina',   'gato', 'SRD',             14,  'pequeno', 'femea', '2025-06-19', 'medio', 1, 0, 1, 0, 0, 0, 1, 1,
     'Nina é curiosa, sociável e gosta de observar tudo pela janela.',
     'disponivel', 2),

    ('Tobias', 'cao', 'Beagle',           42,  'medio',   'macho', '2022-10-05', 'alto',  1, 1, 0, 0, 1, 1, 1, 1,
     'Tobias é farejador, animado e combina com tutores ativos.',
     'disponivel', 3),

    ('Amora',  'gato', 'Persa',           72,  'pequeno', 'femea', '2021-09-17', 'baixo', 1, 0, 0, 0, 1, 1, 1, 1,
     'Amora é tranquila, carinhosa e prefere uma rotina mais calma.',
     'disponivel', 1),

    ('Bento',  'cao', 'SRD',               7,  'medio',   'macho', '2025-11-14', 'medio', 1, 1, 1, 0, 0, 0, 1, 1,
     'Bento é filhote, aprende rápido e está pronto para crescer em família.',
     'disponivel', 2),

    ('Frida',  'gato', 'Angorá',          28,  'pequeno', 'femea', '2024-02-09', 'medio', 0, 0, 1, 0, 1, 1, 1, 1,
     'Frida é elegante, independente e convive bem com outros gatos.',
     'disponivel', 3),

    ('Apolo',  'cao', 'Border Collie',    20,  'medio',   'macho', '2024-08-27', 'alto',  1, 1, 0, 1, 1, 0, 1, 1,
     'Apolo é muito inteligente, precisa de estímulos e adora aprender comandos.',
     'disponivel', 1),

    ('Cacau',  'cao', 'Shih-tzu',         54,  'pequeno', 'femea', '2022-12-01', 'baixo', 1, 1, 1, 0, 1, 1, 1, 1,
     'Cacau é companheira, calma e se adapta muito bem a apartamento.',
     'disponivel', 2),

    ('Jade',   'gato', 'SRD',             10,  'pequeno', 'femea', '2025-09-10', 'alto',  1, 0, 1, 0, 0, 0, 1, 1,
     'Jade é filhote, brincalhona e gosta de interagir com pessoas.',
     'disponivel', 3),

    ('Gaia',   'outro', 'Coelha',         16,  'pequeno', 'femea', '2024-05-23', 'medio', 1, 0, 0, 0, 0, 1, 1, 1,
     'Gaia é uma coelha dócil, limpa e acostumada a ambientes internos.',
     'disponivel', 1);

-- ── adotantes ─────────────────────────────────────────────────
-- senha dos adotantes de exemplo = "admin123" em BCrypt
INSERT INTO adotante (nome, cpf, senha, email, telefone, endereco,
                       tipo_moradia, tem_criancas, tem_outros_animais,
                       nivel_atividade, preferencia_porte, preferencia_especie)
VALUES
    ('Maria Oliveira',  '111.111.111-11', '$2a$10$XP1tvcPQGda.a1VpAsYlGeN4oSwouCCevP8HRyaLNjK1ZcxnFUF4O', 'maria@email.com',  '(47) 99901-0001',
     'Rua das Flores, 100, Fraiburgo SC',
     'apartamento',       0, 0, 'moderado', 'pequeno',    'gato'),

    ('Carlos Souza',    '222.222.222-22', '$2a$10$XP1tvcPQGda.a1VpAsYlGeN4oSwouCCevP8HRyaLNjK1ZcxnFUF4O', 'carlos@email.com', '(47) 99901-0002',
     'Av. Principal, 500, Curitibanos SC',
     'casa_com_quintal',  1, 0, 'ativo',    'grande',     'cao'),

    ('Beatriz Lima',    '333.333.333-33', '$2a$10$XP1tvcPQGda.a1VpAsYlGeN4oSwouCCevP8HRyaLNjK1ZcxnFUF4O', 'beatriz@email.com','(47) 99901-0003',
     'Rua do Bosque, 22, Campos Novos SC',
     'casa_sem_quintal',  1, 1, 'moderado', 'pequeno',    'indiferente'),

    ('João Pedro Costa','444.444.444-44', '$2a$10$XP1tvcPQGda.a1VpAsYlGeN4oSwouCCevP8HRyaLNjK1ZcxnFUF4O', 'joao@email.com',   '(47) 99901-0004',
     'Rua Norte, 77, Fraiburgo SC',
     'apartamento',       0, 1, 'sedentario','indiferente','gato'),

    ('Fernanda Rocha',  '555.555.555-55', '$2a$10$XP1tvcPQGda.a1VpAsYlGeN4oSwouCCevP8HRyaLNjK1ZcxnFUF4O', 'fernanda@email.com','(47) 99901-0005',
     'Estrada Rural, km 5, Fraiburgo SC',
     'casa_com_quintal',  0, 0, 'ativo',    'grande',     'cao')
ON DUPLICATE KEY UPDATE
    senha = VALUES(senha),
    telefone = VALUES(telefone),
    endereco = VALUES(endereco),
    tipo_moradia = VALUES(tipo_moradia),
    tem_criancas = VALUES(tem_criancas),
    tem_outros_animais = VALUES(tem_outros_animais),
    nivel_atividade = VALUES(nivel_atividade),
    preferencia_porte = VALUES(preferencia_porte),
    preferencia_especie = VALUES(preferencia_especie);

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

UPDATE solicitacao_adocao
SET data_decisao = '2026-03-09 08:05:00',
    admin_responsavel_id = 1,
    dados_adotante_conferidos = 1,
    animal_disponivel_conferido = 1,
    contato_revisado = 1,
    observacao_admin = 'Solicitacao aprovada nos dados iniciais.'
WHERE animal_id = 9 AND adotante_id = 4 AND status = 'aprovada';

INSERT INTO solicitacao_moderacao_evento (solicitacao_id, admin_id, tipo, observacao, data_evento)
SELECT id, NULL, 'solicitacao_enviada', 'Solicitacao enviada pelo adotante.', data_solicitacao
FROM solicitacao_adocao
WHERE data_solicitacao >= '2026-03-09 00:00:00';

INSERT INTO solicitacao_moderacao_evento (solicitacao_id, admin_id, tipo, observacao, data_evento)
SELECT id, 1, 'aprovada', 'Solicitacao aprovada nos dados iniciais.', data_decisao
FROM solicitacao_adocao
WHERE animal_id = 9 AND adotante_id = 4 AND status = 'aprovada';

INSERT INTO notificacao (adotante_id, tipo, titulo, mensagem, lida, data_criacao, referencia_tipo, referencia_id)
VALUES
    (4, 'adocao', 'Solicitacao aprovada', 'Sua solicitacao para adotar Duque foi aprovada.', 0,
     '2026-03-09 08:05:00', 'solicitacao_adocao', 5);

-- ============================================================
--  SELECTs de verificação (executar para validar o script)
-- ============================================================

-- Quantos animais por status
SELECT status, COUNT(*) AS total
FROM animal
GROUP BY status;

-- Animais disponíveis com nome do protetor
SELECT
    a.id,
    a.nome,
    a.especie,
    a.porte,
    a.sexo,
    a.data_resgate,
    a.nivel_energia,
    a.microchip,
    a.castrado,
    a.vermifugado,
    a.vacinado,
    p.nome AS protetor
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
