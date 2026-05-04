# 🐾 AdotaPet - Banco de Dados

Um sistema completo de gerenciamento de adoções de animais de estimação, desenvolvido para conectar protetoras, animais resgatados e adotantes.

**Instituição:** IFC Campus Fraiburgo | ADS 3ª Fase  
**Grupo:** 2  
**Desenvolvedores:** Gustavo Huçulak | Estefani Santos

---

## 📋 Sobre o Projeto

O **AdotaPet** é uma plataforma que gerencia o processo completo de adoção de animais:
- 🏢 Protetoras cadastram animais disponíveis para adoção
- 👥 Adotantes criam perfis com suas preferências
- 📋 Sistema de fila de solicitações de adoção
- 🔐 Painel administrativo para controle do sistema
- 📊 Análise de compatibilidade entre animal e adotante

---

## 🔧 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **MySQL** (versão 5.7+) ou **MariaDB** (versão 10.3+)
- **Cliente MySQL** (mysql-cli ou similar)
- Conhecimento básico de SQL

### Instalação do MySQL

#### Windows (via MySQL Installer)
1. Baixe em: https://dev.mysql.com/downloads/installer/
2. Execute o instalador
3. Configure como serviço do Windows
4. Defina senha do usuário `root`

#### Windows (via Chocolatey)
```powershell
choco install mysql
```

#### Linux (Debian/Ubuntu)
```bash
sudo apt-get update
sudo apt-get install mysql-server
```

#### macOS (via Homebrew)
```bash
brew install mysql
brew services start mysql
```

---

## 📂 Estrutura do Projeto

```
AdotaPet/
└── database/
    └── adotapet_banco.sql    ← Script do banco de dados
```

---

## 🚀 Como Executar o Script

### Opção 1: Via Linha de Comando (Recomendado)

#### Windows (PowerShell)
```powershell
# Abra o PowerShell e execute:
mysql -u root -p < C:\Caminho\Para\AdotaPet\database\adotapet_banco.sql
# Digite a senha do MySQL quando solicitado
```

#### Linux/macOS (Terminal)
```bash
mysql -u root -p < /caminho/para/AdotaPet/database/adotapet_banco.sql
# Digite a senha do MySQL quando solicitado
```

### Opção 2: Via MySQL Workbench (Interface Gráfica)

1. Abra **MySQL Workbench**
2. Conecte-se ao servidor MySQL com suas credenciais
3. Vá em **File** → **Open SQL Script**
4. Selecione o arquivo `adotapet_banco.sql`
5. Clique em **Execute** (⚡ ou Ctrl+Shift+Enter)
6. Verifique as mensagens de sucesso no console

### Opção 3: Via Cliente MySQL Interativo

```bash
mysql -u root -p

# Dentro do MySQL:
source C:/Caminho/Para/AdotaPet/database/adotapet_banco.sql;
# ou no Linux/macOS:
source /caminho/para/AdotaPet/database/adotapet_banco.sql;
```

---

## ✅ Verificação de Instalação

Após executar o script, execute os comandos para validar:

```sql
-- Conecte-se ao banco
USE adotapet;

-- Verifique as tabelas criadas
SHOW TABLES;

-- Verifique a quantidade de registros
SELECT 'admin'              AS tabela, COUNT(*) AS total FROM admin
UNION ALL
SELECT 'protetor',          COUNT(*) FROM protetor
UNION ALL
SELECT 'animal',            COUNT(*) FROM animal
UNION ALL
SELECT 'adotante',          COUNT(*) FROM adotante
UNION ALL
SELECT 'solicitacao_adocao',COUNT(*) FROM solicitacao_adocao;

-- Visualize os dados de exemplo
SELECT * FROM animal WHERE status = 'disponivel';
```

---

## 📊 Estrutura do Banco de Dados

### 1. **admin** - Administradores do Sistema
Gerencia usuários com acesso administrativo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | PK - Identificador único |
| `nome` | VARCHAR(100) | Nome do administrador |
| `email` | VARCHAR(150) | Email único |
| `senha` | VARCHAR(255) | Senha em hash BCrypt |

**Dados de teste:**
- Email: `admin@adotapet.com`
- Senha: `admin123` (hash: `$2a$10$7QJ9JjNkmPOGGpANn6gJFuBanJYG2lAmgqhLAZa8j5UZQY3z/mXoO`)

---

### 2. **protetor** - Organizações Protetoras
Entidades que resgatam e cuidam dos animais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | PK - Identificador único |
| `nome` | VARCHAR(100) | Nome da organização |
| `email` | VARCHAR(150) | Email de contato |
| `telefone` | VARCHAR(20) | Telefone para contato |

**Dados de teste incluídos:**
- ONG Patinhas Felizes
- Abrigo Amigos de Patas
- Protetora Ana Lima

---

### 3. **animal** - Animais para Adoção
Animais resgatados e cadastrados no sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | PK - Identificador único |
| `nome` | VARCHAR(100) | Nome do animal |
| `especie` | ENUM | 'cao', 'gato' ou 'outro' |
| `raca` | VARCHAR(100) | Raça (padrão: 'SRD') |
| `idade_meses` | INT | Idade em meses |
| `porte` | ENUM | 'pequeno', 'medio' ou 'grande' |
| `nivel_energia` | ENUM | 'baixo', 'medio' ou 'alto' |
| `bom_com_criancas` | TINYINT(1) | 0/1 (booleano) |
| `bom_com_animais` | TINYINT(1) | 0/1 (booleano) |
| `precisa_espaco` | TINYINT(1) | 0/1 (requer quintal) |
| `descricao` | TEXT | Descrição detalhada |
| `status` | ENUM | 'disponivel', 'em_analise' ou 'adotado' |
| `data_cadastro` | DATETIME | Data de registro (automática) |
| `protetor_id` | INT | FK - Referência ao protetor |

**Dados de teste:** 9 animais (5 cães, 3 gatos, 1 em análise)

---

### 4. **adotante** - Pessoas Interessadas em Adotar
Usuários que desejam adotar um animal.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | PK - Identificador único |
| `nome` | VARCHAR(100) | Nome completo |
| `cpf` | VARCHAR(14) | CPF único (formato: 000.000.000-00) |
| `email` | VARCHAR(150) | Email único |
| `telefone` | VARCHAR(20) | Telefone para contato |
| `endereco` | VARCHAR(255) | Endereço completo |
| `tipo_moradia` | ENUM | 'apartamento', 'casa_sem_quintal', 'casa_com_quintal' |
| `tem_criancas` | TINYINT(1) | 0/1 (booleano) |
| `tem_outros_animais` | TINYINT(1) | 0/1 (booleano) |
| `nivel_atividade` | ENUM | 'sedentario', 'moderado' ou 'ativo' |
| `preferencia_porte` | ENUM | Tamanho preferido do animal |
| `preferencia_especie` | ENUM | Espécie preferida |
| `data_cadastro` | DATETIME | Data de registro (automática) |

**Dados de teste:** 5 adotantes com perfis variados

---

### 5. **solicitacao_adocao** - Fila de Adoções
Rastreia as solicitações de adoção e seu status.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | PK - Identificador único |
| `animal_id` | INT | FK - Referência ao animal |
| `adotante_id` | INT | FK - Referência ao adotante |
| `data_solicitacao` | DATETIME | Data/hora da solicitação (automática) |
| `status` | ENUM | 'pendente', 'aprovada' ou 'recusada' |

**Dados de teste:** 5 solicitações (simulando filas de espera)

---

## 📇 Índices

Para otimização de performance, o script cria os seguintes índices:

```sql
CREATE INDEX idx_animal_status       ON animal (status);
CREATE INDEX idx_animal_especie      ON animal (especie);
CREATE INDEX idx_sol_animal_status   ON solicitacao_adocao (animal_id, status);
CREATE INDEX idx_sol_data            ON solicitacao_adocao (data_solicitacao);
```

---

## 🔑 Credenciais de Teste

### Acesso Administrativo
```
Email:    admin@adotapet.com
Senha:    admin123
```

### CPFs de Adotantes (para testes)
- `111.111.111-11` - Maria Oliveira
- `222.222.222-22` - Carlos Souza
- `333.333.333-33` - Beatriz Lima
- `444.444.444-44` - João Pedro Costa
- `555.555.555-55` - Fernanda Rocha

---

## 💡 Exemplos de Consultas Úteis

### Animais Disponíveis
```sql
SELECT a.id, a.nome, a.especie, a.porte, a.nivel_energia, p.nome AS protetor
FROM animal a
JOIN protetor p ON a.protetor_id = p.id
WHERE a.status = 'disponivel'
ORDER BY a.data_cadastro DESC;
```

### Fila de Solicitações Pendentes
```sql
SELECT
    sa.id,
    sa.data_solicitacao,
    a.nome AS animal,
    ad.nome AS adotante,
    sa.status
FROM solicitacao_adocao sa
JOIN animal a ON sa.animal_id = a.id
JOIN adotante ad ON sa.adotante_id = ad.id
WHERE sa.status = 'pendente'
ORDER BY sa.data_solicitacao ASC;
```

### Animais Compatíveis com um Adotante
```sql
SELECT a.nome, a.especie, a.porte, a.descricao
FROM animal a
JOIN adotante ad ON 1=1
WHERE ad.id = 1  -- ID do adotante
  AND a.status = 'disponivel'
  AND (
    (ad.preferencia_porte = 'indiferente' OR ad.preferencia_porte = a.porte)
    AND (ad.preferencia_especie = 'indiferente' OR ad.preferencia_especie = a.especie)
    AND (ad.tem_criancas = 0 OR a.bom_com_criancas = 1)
    AND (ad.tipo_moradia != 'apartamento' OR a.precisa_espaco = 0)
  );
```

### Estatísticas por Protetor
```sql
SELECT
    p.nome AS protetor,
    COUNT(a.id) AS total_animais,
    SUM(CASE WHEN a.status = 'disponivel' THEN 1 ELSE 0 END) AS disponveis,
    SUM(CASE WHEN a.status = 'adotado' THEN 1 ELSE 0 END) AS adotados
FROM protetor p
LEFT JOIN animal a ON p.id = a.protetor_id
GROUP BY p.id, p.nome;
```

---

## ⚙️ Charset e Collation

O banco utiliza:
- **Charset:** `utf8mb4` (suporta emojis e caracteres especiais)
- **Collation:** `utf8mb4_unicode_ci` (case-insensitive, compatível com Unicode)

Isso garante suporte completo a caracteres especiais portugueses (ã, ç, é, etc.).

---

## 🔐 Considerações de Segurança

⚠️ **IMPORTANTE:** Este script contém dados de teste e senhas exemplo. Para **produção**:

1. **Altere a senha do admin:**
   ```sql
   UPDATE admin SET senha = '<novo_hash_bcrypt>' WHERE id = 1;
   ```

2. **Use variáveis de ambiente** para credenciais

3. **Configure backups regulares**

4. **Implemente SSL/TLS** para conexões ao banco

5. **Restrinja permissões** de usuários MySQL

---

## 📋 Checklist de Setup

- [ ] MySQL/MariaDB instalado e rodando
- [ ] Script SQL executado sem erros
- [ ] Banco `adotapet` criado com sucesso
- [ ] 5 tabelas criadas
- [ ] Dados de teste inseridos
- [ ] Índices criados
- [ ] Querys de verificação executadas
- [ ] Acesso administrativo testado

---

## 📝 Notas Adicionais

- O script é **idempotente**: pode ser executado múltiplas vezes sem erro (usa `IF NOT EXISTS`)
- Todas as tabelas têm **timestamps automáticos** via `CURRENT_TIMESTAMP`
- **Integridade referencial** garantida por Foreign Keys
- **Validações** de dados (CHECK constraints, UNIQUE, NOT NULL)

---

## 🐛 Troubleshooting

### "Access Denied for user 'root'@'localhost'"
Verifique se a senha está correta. Execute:
```bash
mysql -u root -p
```

### "Unknown database 'adotapet'"
Execute o script SQL novamente, garantindo que nenhum erro ocorreu durante a execução.

### Permissão negada ao executar o arquivo
No Windows, use caminho com barra invertida:
```powershell
mysql -u root -p < "C:\Caminho\Completo\adotapet_banco.sql"
```

### Script parou no meio
Verifique a mensagem de erro. Geralmente é de sintaxe ou permissão. Execute novamente depois de corrigir.

---

## 📚 Recursos Úteis

- [Documentação MySQL](https://dev.mysql.com/doc/)
- [MySQL Workbench](https://www.mysql.com/products/workbench/)
- [SQLite vs MySQL - Comparação](https://www.sqlite.org/index.html)

---

## 📧 Contato

Para dúvidas sobre o projeto AdotaPet:
- Gustavo Huçulak
- Estefani Santos

**Instituição:** IFC Campus Fraiburgo - Análise e Desenvolvimento de Sistemas (3ª Fase)

---

## 📄 Licença

Este projeto é fornecido como material didático para fins educacionais.

---

**Última atualização:** Maio de 2026  
**Versão do Banco:** 1.0
