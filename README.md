# AdotaPet

Sistema de adocao de animais com API Spring Boot, banco MySQL e frontend em HTML, CSS e JavaScript puro.

## Pre-requisitos

- Java 17
- Maven disponivel no terminal como `mvn`
- MySQL rodando localmente
- Python 3 para servir o frontend estatico
- Node.js apenas para rodar os testes do frontend

## Banco de dados

Crie e carregue o banco com o script principal:

```powershell
mysql -u root -p < database/adotapet_banco.sql
```

A API usa estes valores por padrao:

```text
DB_URL=jdbc:mysql://localhost:3306/adotapet?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Sao_Paulo
DB_USER=root
DB_PASSWORD=root
```

Se sua senha do MySQL nao for `root`, defina as variaveis antes de iniciar a API:

```powershell
$env:DB_USER="root"
$env:DB_PASSWORD="sua_senha"
```

O admin inicial do sistema e:

```text
E-mail: admin@adotapet.com
Senha: admin123
```

Se o banco ja existia antes da atualizacao da senha do admin, rode este ajuste no MySQL:

```sql
UPDATE admin
SET senha = '$2a$10$XP1tvcPQGda.a1VpAsYlGeN4oSwouCCevP8HRyaLNjK1ZcxnFUF4O'
WHERE email = 'admin@adotapet.com';
```

## Rodar com script no Windows

No Windows PowerShell, a partir da raiz do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

O script inicia:

- API em `http://localhost:8080`
- Frontend em `http://localhost:5500/index.html`

Deixe a janela do script aberta enquanto estiver usando o sistema. Ao pressionar Enter no script, ele encerra os dois processos.

## Rodar com script no Linux ou macOS

A partir da raiz do projeto:

```bash
chmod +x scripts/start-local.sh
./scripts/start-local.sh
```

O script inicia:

- API em `http://localhost:8080`
- Frontend em `http://localhost:5500/index.html`

Deixe o terminal do script aberto enquanto estiver usando o sistema. Ao pressionar Enter, ele encerra os dois processos.

Se voce usa PowerShell no Linux, tambem pode rodar o mesmo script do Windows:

```bash
pwsh -File ./scripts/start-local.ps1
```

## Rodar manualmente no Windows

Terminal 1, API:

```powershell
cd backend
mvn spring-boot:run
```

Terminal 2, frontend a partir da raiz do projeto:

```powershell
python -m http.server 5500 --directory frontend
```

Se o comando `python` nao existir no Windows, use:

```powershell
py -3 -m http.server 5500 --directory frontend
```

Depois acesse:

```text
http://localhost:5500/index.html
```

## Rodar manualmente no Linux ou macOS

Terminal 1, API:

```bash
cd backend
mvn spring-boot:run
```

Terminal 2, frontend a partir da raiz do projeto:

```bash
python3 -m http.server 5500 --directory frontend
```

Depois acesse:

```text
http://localhost:5500/index.html
```

## Testes

Frontend:

```powershell
node --test frontend/tests/*.mjs
```

Backend:

```powershell
cd backend
mvn test
```
