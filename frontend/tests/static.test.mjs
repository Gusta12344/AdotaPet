import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("frontend");
const pages = [
  "index.html",
  "cadastro.html",
  "editar-dados.html",
  "favoritos.html",
  "recomendados.html",
  "animal.html",
  "confirmacao.html",
  "admin.html",
  "admin-painel.html",
  "admin-visao-geral.html",
  "admin-animais.html",
  "admin-solicitacoes.html",
  "admin-moderacao.html",
  "admin-mensagens.html",
  "admin-usuarios.html",
  "admin-relatorios.html",
  "admin-configuracoes.html",
];
const authShellPages = [
  "index.html",
  "cadastro.html",
  "editar-dados.html",
  "favoritos.html",
  "recomendados.html",
  "animal.html",
  "confirmacao.html",
  "admin.html",
  "admin-painel.html",
  "admin-visao-geral.html",
  "admin-animais.html",
  "admin-solicitacoes.html",
  "admin-moderacao.html",
  "admin-mensagens.html",
  "admin-usuarios.html",
  "admin-relatorios.html",
  "admin-configuracoes.html",
];
const adminPages = [
  "admin-visao-geral.html",
  "admin-animais.html",
  "admin-solicitacoes.html",
  "admin-moderacao.html",
  "admin-mensagens.html",
  "admin-usuarios.html",
  "admin-relatorios.html",
  "admin-configuracoes.html",
];

function readPage(page) {
  return fs.readFileSync(path.join(root, page), "utf8");
}

function sharedAuthShellScript() {
  return fs.readFileSync(path.join(root, "js/shared-auth-shell.js"), "utf8");
}

function readCssBundle(relativePath = "css/styles.css", seen = new Set()) {
  const absolutePath = path.join(root, relativePath);

  if (seen.has(absolutePath)) {
    return "";
  }

  seen.add(absolutePath);

  const css = fs.readFileSync(absolutePath, "utf8");
  const importPattern = /@import\s+url\(["']?(.+?)["']?\);\s*/g;

  return css.replace(importPattern, (_, importPath) => {
    const nextPath = path.normalize(path.join(path.dirname(relativePath), importPath));
    return `${readCssBundle(nextPath, seen)}\n`;
  });
}

function localRefs(html) {
  const refs = [];
  const pattern = /\b(?:href|src)="([^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    const ref = match[1];
    if (
      ref.startsWith("http") ||
      ref.startsWith("#") ||
      ref.startsWith("mailto:") ||
      ref.startsWith("tel:")
    ) {
      continue;
    }
    refs.push(ref.split("?")[0]);
  }
  return refs;
}

test("all planned frontend pages exist", () => {
  for (const page of pages) {
    assert.ok(fs.existsSync(path.join(root, page)), `${page} should exist`);
  }
});

test("HTML pages reference only existing local assets, scripts and pages", () => {
  for (const page of pages) {
    const html = readPage(page);
    for (const ref of localRefs(html)) {
      const target = path.resolve(root, ref);
      assert.ok(target.startsWith(root), `${page} should not reference outside frontend: ${ref}`);
      assert.ok(fs.existsSync(target), `${page} references missing file: ${ref}`);
    }
  }
});

test("each page loads the shared stylesheet and one page controller", () => {
  for (const page of pages) {
    const html = readPage(page);
    assert.match(html, /href="css\/styles\.css"/, `${page} should load shared CSS`);
    assert.match(html, /<script type="module" src="js\/pages\/.+\.js"><\/script>/, `${page} should load a module controller`);
  }
});

test("shared stylesheet imports the modular CSS architecture", () => {
  const stylesheet = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
  const imports = [...stylesheet.matchAll(/@import\s+url\("(.+?)"\);/g)].map((match) => match[1]);

  assert.ok(imports.length >= 12, "styles.css should stay as a CSS module manifest");
  assert.ok(imports.includes("./base/tokens.css"));
  assert.ok(imports.includes("./layout/site-shell.css"));
  assert.ok(imports.includes("./components/animal-card/base.css"));
  assert.ok(imports.includes("./components/animal-card/match.css"));
  assert.ok(imports.includes("./pages/animal-detail.css"));
  assert.ok(imports.includes("./admin/theme.css"));
  assert.ok(imports.includes("./admin/chrome.css"));

  for (const importPath of imports) {
    assert.ok(
      fs.existsSync(path.join(root, "css", importPath)),
      `${importPath} should exist`
    );
  }
});

test("login modal links users without an account to the registration page", () => {
  const script = sharedAuthShellScript();

  assert.match(script, /Nao possui uma conta\?/);
  assert.match(script, /href: "cadastro\.html"/);
  assert.match(script, /Cadastre-se aqui/);
});

test("profile edit page keeps authenticated account controls in the header", () => {
  const html = readPage("editar-dados.html");

  assert.match(html, /data-shared-auth-shell/);
  assert.doesNotMatch(html, /<header class="site-header">/);
  assert.doesNotMatch(html, /data-login-modal/);
  assert.match(html, /id="editar-dados-form"/);
});

test("shared pages mount the shared auth shell instead of duplicating header and modal", () => {
  for (const page of authShellPages) {
    const html = readPage(page);

    assert.match(html, /data-shared-auth-shell/, `${page} should mount shared auth shell`);
    assert.doesNotMatch(html, /<header class="site-header">/, `${page} should not duplicate header markup`);
    assert.doesNotMatch(html, /data-login-modal/, `${page} should not duplicate modal markup`);
  }
});

test("shared auth shell owns the reusable footer content", () => {
  const script = sharedAuthShellScript();

  assert.match(script, /site-footer/);
  assert.match(script, /Gustavo Maciel Huçulak/);
  assert.match(script, /IFC Campus Fraiburgo/);
  assert.match(script, /https:\/\/github\.com\/Gusta12344/);
  assert.match(script, /github/i);
});

test("shared auth shell keeps reusable account and login controls in one module", () => {
  const script = sharedAuthShellScript();

  assert.match(script, /data-auth-header/);
  assert.match(script, /data-auth-private/);
  assert.match(script, /data-account-menu/);
  assert.match(script, /data-account-greeting/);
  assert.match(script, /data-login-modal/);
  assert.match(script, /data-edit-profile/);
});

test("admin moderation panel exposes the central moderation structure", () => {
  const html = readPage("admin-moderacao.html");

  assert.match(html, /data-admin-page="moderation"/);
  assert.match(html, /data-status-tabs/);
  assert.match(html, /data-moderation-queue/);
  assert.match(html, /data-moderation-detail/);
  assert.match(html, /data-moderation-decision/);
  assert.match(html, /js\/pages\/admin-moderacao\.js/);
});

test("admin pages use the shared header and the shared admin shell", () => {
  for (const page of adminPages) {
    const html = readPage(page);

    assert.match(html, /data-shared-auth-shell/, `${page} should mount shared auth shell`);
    assert.match(html, /data-admin-page="/, `${page} should expose the admin page mount`);
    assert.match(html, /js\/pages\/admin-[a-z-]+\.js/, `${page} should load an admin page controller`);
    assert.doesNotMatch(html, /admin-sidebar-brand/, `${page} should not duplicate admin sidebar markup`);
    assert.doesNotMatch(html, /<header class="site-header">/, `${page} should not duplicate header markup`);
    assert.doesNotMatch(html, /data-login-modal/, `${page} should not duplicate modal markup`);
  }
});

test("admin shell owns navigation, request dropdown and dark mode state", () => {
  const shell = fs.readFileSync(path.join(root, "js/admin-shell.js"), "utf8");

  assert.match(shell, /admin-visao-geral\.html/);
  assert.match(shell, /admin-animais\.html/);
  assert.match(shell, /admin-solicitacoes\.html/);
  assert.match(shell, /admin-moderacao\.html/);
  assert.match(shell, /admin-mensagens\.html/);
  assert.match(shell, /admin-usuarios\.html/);
  assert.match(shell, /admin-relatorios\.html/);
  assert.match(shell, /admin-configuracoes\.html/);
  assert.match(shell, /data-admin-requests-toggle/);
  assert.match(shell, /data-admin-requests-menu/);
  assert.match(shell, /adotapet\.admin\.theme/);
  assert.doesNotMatch(shell, /Entrevistas|Central de ajuda/);
});

test("admin shell matches the referenced dashboard chrome", () => {
  const shell = fs.readFileSync(path.join(root, "js/admin-shell.js"), "utf8");
  const css = readCssBundle();

  assert.match(shell, /admin-sidebar-logo/);
  assert.match(shell, /Buscar animais, usuários, solicitações\.\.\./);
  assert.match(shell, /Todas as solicitações/);
  assert.match(shell, /Rejeitadas/);
  assert.match(shell, /Arquivadas/);
  assert.match(shell, /Novo animal/);
  assert.match(shell, /Modo escuro/);
  assert.match(shell, /admin@adotapet\.com/);
  assert.match(css, /\.admin-shell-page\s+\.site-header[\s\S]*display:\s*none/);
  assert.match(css, /\.admin-sidebar-logo/);
  assert.match(css, /\.admin-topbar-notifications/);
});

test("admin overview renders the referenced dashboard sections", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/admin-visao-geral.js"), "utf8");
  const css = readCssBundle();

  assert.match(script, /admin-reference-dashboard/);
  assert.match(script, /Animais recentes/);
  assert.match(script, /Fila de moderação/);
  assert.match(script, /Mensagens não lidas/);
  assert.match(script, /Relatórios rápidos/);
  assert.match(script, /Solicitações recentes/);
  assert.match(script, /Atividade recente/);
  assert.match(css, /\.admin-stat-card/);
  assert.match(css, /\.admin-dashboard-table/);
  assert.match(css, /\.admin-right-rail/);
});

test("admin css covers modal, dashboard and moderation classes used by the pages", () => {
  const css = readCssBundle();
  const criticalSelectors = [
    ".admin-day-metric",
    ".admin-message-initials",
    ".admin-overview-page",
    ".admin-reference-dashboard",
    ".admin-report-form",
    ".admin-animal-toolbar",
    ".admin-animal-filter-summary",
    ".moderation-icon",
    ".moderation-queue-panel",
    ".admin-animal-modal",
    ".admin-dashboard-card",
    ".admin-content-frame",
  ];

  for (const selector of criticalSelectors) {
    assert.match(css, new RegExp(`\\${selector}\\b`), `${selector} should be styled`);
  }
});

test("admin overview metric cards do not use mocked card values", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/admin-visao-geral.js"), "utf8");

  assert.doesNotMatch(script, /256|1842/);
  assert.doesNotMatch(script, /\+\d+/);
  assert.doesNotMatch(script, /desde ontem/);
  assert.doesNotMatch(script, /numberOrFallback\(resumo\.relatoriosGerados,\s*18\)/);
  assert.match(script, /resumo\.relatoriosGerados/);
});

test("admin overview system sections do not render mocked dashboard data", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/admin-visao-geral.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "js/admin-api.js"), "utf8");

  assert.doesNotMatch(script, /FALLBACK_/);
  assert.doesNotMatch(script, /Thor|Luna|Mel|Nina|Fred|Juliana Ferreira|Rafael Pereira|Amanda Costa|Lucas Silva|Mariana Barbosa/);
  assert.doesNotMatch(script, /2025-05-|24\/05\/2025|23\/05\/2025|22\/05\/2025|Ontem|2 dias/);
  assert.doesNotMatch(script, /Tenho interesse|Gostaria de mais|Obrigado pelo retorno|Novo animal cadastrado|Conteúdo denunciado em revisão/);
  assert.match(script, /fetchAdminUnreadMessages/);
  assert.match(api, /\/admin\/mensagens\/nao-lidas/);
});

test("admin animals uses modals for create and edit and exposes delete action", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/admin-animais.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "js/admin-api.js"), "utf8");

  assert.match(script, /admin-animal-modal/);
  assert.match(script, /openAnimalModal/);
  assert.match(script, /deleteAdminAnimal/);
  assert.match(script, /filterAndSortAdminAnimals/);
  assert.match(script, /enhanceSelectDropdowns/);
  assert.match(script, /admin-animal-toolbar/);
  assert.match(script, /fa-trash/);
  assert.doesNotMatch(script, /href:\s*"#novo"/);
  assert.doesNotMatch(script, /quickStatusButton|changeStatus|Disponibilizar|Pausar/);
  assert.match(api, /deleteAdminAnimal/);
  assert.match(api, /client\.delete\(`\/animais\/\$\{id\}`/);
});

test("hidden profile sections stay hidden even when component classes define display", () => {
  const css = readCssBundle();

  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
});

test("favorite navigation points to the favorites page", () => {
  const script = sharedAuthShellScript();

  assert.match(script, /className: "favorite-button"/);
  assert.match(script, /href: "favoritos\.html"/);
});

test("recommended navigation is hidden until the user is signed in", () => {
  const script = sharedAuthShellScript();

  assert.match(script, /href: "recomendados\.html"/);
  assert.match(script, /"data-auth-private": ""/);
  assert.match(script, /hidden: ""/);
});

test("public top navigation does not expose recommended page links", () => {
  for (const page of pages) {
    const html = readPage(page);
    const navMatch = html.match(/<div class="nav-links">([\s\S]*?)<\/div>/);
    const recommendedLink = navMatch?.[1].match(/<a[^>]+href="recomendados\.html"[^>]*>/)?.[0];

    if (!recommendedLink) {
      continue;
    }

    assert.match(recommendedLink, /data-auth-private/, `${page} should not expose recommended navigation to guests`);
    assert.match(recommendedLink, /hidden/, `${page} should hide recommended navigation before login`);
  }
});

test("notification bell is wired for the shared notification controller", () => {
  const script = sharedAuthShellScript();

  assert.match(script, /data-notifications-toggle/);
  assert.match(script, /data-notification-badge/);
  assert.doesNotMatch(script, /notification-badge">2/);
});

test("animal detail controller renders the premium detail sections", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/animal.js"), "utf8");

  assert.match(script, /detail-photo-panel/);
  assert.match(script, /Dados principais/);
  assert.match(script, /Convivencia/);
  assert.match(script, /Cuidados/);
  assert.match(script, /Protetor/);
});

test("top navigation does not show the registration tab", () => {
  for (const page of pages) {
    const html = readPage(page);
    const navMatch = html.match(/<div class="nav-links">([\s\S]*?)<\/div>/);

    if (!navMatch) {
      continue;
    }

    assert.doesNotMatch(navMatch[1], /href="cadastro\.html"/, `${page} should not show Cadastro in the top navigation`);
  }
});

test("frontend pages use the shared Font Awesome icon library instead of hand-built code icons", () => {
  const iconLibraryLink = /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.5\.2\/css\/all\.min\.css/;
  const productionScripts = [
    "js/shared-auth-shell.js",
    "js/ui.js",
    "js/pages/animal.js",
    "js/admin-moderacao-render.js",
  ];
  const css = readCssBundle();

  for (const page of pages) {
    const html = readPage(page);
    assert.match(html, iconLibraryLink, `${page} should load Font Awesome`);
    assert.doesNotMatch(html, /<svg\b/i, `${page} should not build icons with inline SVG`);
  }

  for (const scriptPath of productionScripts) {
    const script = fs.readFileSync(path.join(root, scriptPath), "utf8");
    assert.doesNotMatch(script, /createElementNS|svgIcon|function icon\(/, `${scriptPath} should use library icons`);
  }

  assert.doesNotMatch(css, /content:\s*"\\(?:2661|2665|2304|2303)"/, "CSS should not use unicode icon content");
});
