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
  "admin.html",
  "admin-painel.html",
  "admin-visao-geral.html",
  "admin-animais.html",
  "admin-solicitacoes.html",
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
  "admin.html",
  "admin-painel.html",
  "admin-visao-geral.html",
  "admin-animais.html",
  "admin-solicitacoes.html",
  "admin-usuarios.html",
  "admin-relatorios.html",
  "admin-configuracoes.html",
];
const adminPages = [
  "admin-visao-geral.html",
  "admin-animais.html",
  "admin-solicitacoes.html",
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

function headerAuthScript() {
  return fs.readFileSync(path.join(root, "js/header-auth.js"), "utf8");
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

test("global reset keeps form controls inside grid cells", () => {
  const reset = fs.readFileSync(path.join(root, "css/base/reset.css"), "utf8");

  assert.match(reset, /^\*,\s*\n\*::before,\s*\n\*::after\s*\{\s*\n\s*box-sizing:\s*border-box;/);
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

test("shared auth shell exposes adopter requests modal from the account menu", () => {
  const script = sharedAuthShellScript();
  const header = headerAuthScript();
  const css = readCssBundle();

  assert.match(script, /Minhas Solicitações/);
  assert.match(script, /data-my-requests/);
  assert.match(script, /data-requests-modal/);
  assert.match(script, /data-requests-list/);
  assert.match(script, /data-requests-feedback/);
  assert.match(header, /data-request-cancel/);
  assert.match(header, /\/adocoes\/\$\{request\.id\}\/cancelamento/);
  assert.match(css, /\.requests-dialog/);
  assert.match(css, /\.requests-list/);
  assert.match(css, /\.request-item-actions/);
  assert.match(css, /\.requests-status/);
  assert.match(css, /\.requests-status-canceled/);
  assert.match(css, /\.requests-empty/);
});

test("animal adoption uses success modal instead of confirmation page", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/animal.js"), "utf8");
  const css = readCssBundle();

  assert.ok(!fs.existsSync(path.join(root, "confirmacao.html")), "confirmacao.html should be removed");
  assert.ok(!fs.existsSync(path.join(root, "js/pages/confirmacao.js")), "confirmacao page script should be removed");
  assert.doesNotMatch(script, /confirmacao\.html/);
  assert.match(script, /showAdoptionSuccessModal/);
  assert.match(css, /\.adoption-success-dialog/);
  assert.match(css, /\.adoption-success-actions/);
});

test("admin solicitacoes is the only moderation destination", () => {
  const html = readPage("admin-solicitacoes.html");
  const shell = fs.readFileSync(path.join(root, "js/admin-shell.js"), "utf8");
  const script = fs.readFileSync(path.join(root, "js/pages/admin-solicitacoes.js"), "utf8");

  assert.ok(!fs.existsSync(path.join(root, "admin-moderacao.html")), "admin-moderacao.html should be removed");
  assert.match(html, /data-admin-page="requests"/);
  assert.match(html, /js\/pages\/admin-solicitacoes\.js/);
  assert.doesNotMatch(shell, /admin-moderacao\.html/);
  assert.doesNotMatch(script, /admin-moderacao\.html/);
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

test("admin shell owns navigation without request dropdown and dark mode state", () => {
  const shell = fs.readFileSync(path.join(root, "js/admin-shell.js"), "utf8");

  assert.match(shell, /admin-visao-geral\.html/);
  assert.match(shell, /admin-animais\.html/);
  assert.match(shell, /admin-solicitacoes\.html/);
  assert.doesNotMatch(shell, /admin-moderacao\.html/);
  assert.match(shell, /admin-usuarios\.html/);
  assert.match(shell, /admin-relatorios\.html/);
  assert.match(shell, /admin-configuracoes\.html/);
  assert.ok(!fs.existsSync(path.join(root, "admin-mensagens.html")), "admin-mensagens.html should be removed");
  assert.ok(!fs.existsSync(path.join(root, "js/pages/admin-mensagens.js")), "admin-mensagens page script should be removed");
  assert.doesNotMatch(shell, /activeIds:\s*\["requests", "moderation"\]/);
  assert.doesNotMatch(shell, /Organiza[cç][oõ]es|Comunicados|admin-mensagens\.html|fa-envelope|Mensagens/);
  assert.doesNotMatch(shell, /data-admin-requests-toggle/);
  assert.doesNotMatch(shell, /data-admin-requests-menu/);
  assert.doesNotMatch(shell, /requests-approved|requests-rejected|requests-archived/);
  assert.match(shell, /adotapet\.admin\.theme/);
  assert.doesNotMatch(shell, /Entrevistas|Central de ajuda/);
});

test("admin shell matches the referenced dashboard chrome", () => {
  const shell = fs.readFileSync(path.join(root, "js/admin-shell.js"), "utf8");
  const css = readCssBundle();

  assert.match(shell, /admin-sidebar-logo/);
  assert.match(shell, /Buscar animais, usuários, solicitações\.\.\./);
  assert.doesNotMatch(shell, /Todas as solicitações/);
  assert.doesNotMatch(shell, /Rejeitadas/);
  assert.doesNotMatch(shell, /Arquivadas/);
  assert.match(shell, /Novo animal/);
  assert.doesNotMatch(shell, /Precisa de ajuda\?/);
  assert.doesNotMatch(shell, /admin-sidebar-help/);
  assert.match(shell, /admin-sidebar-collapsed/);
  assert.match(shell, /aria-expanded/);
  assert.match(css, /\.admin-shell-page\s+\.site-header[\s\S]*display:\s*none/);
  assert.match(css, /--admin-sidebar-open-width:\s*232px/);
  assert.match(css, /--admin-sidebar-collapsed-width:\s*76px/);
  assert.match(css, /--admin-shell-content-gap:\s*24px/);
  assert.match(css, /--admin-bg:\s*#dfe5e2/);
  assert.match(css, /\.admin-shell-page\s+\.admin-shell\.admin-sidebar-collapsed\s*\{[\s\S]*--admin-sidebar-width:\s*var\(--admin-sidebar-collapsed-width\)/);
  assert.match(css, /\.admin-shell-page\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.admin-shell-page\s+\.admin-sidebar\s*\{[\s\S]*position:\s*fixed/);
  assert.match(css, /\.admin-shell-page\s+\.admin-sidebar-nav a,[\s\S]*font-size:\s*0\.92rem/);
  assert.match(css, /transition:\s*margin-left 240ms var\(--ease\)/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /overscroll-behavior:\s*contain/);
  assert.match(css, /margin-left:\s*calc\(var\(--admin-sidebar-width\) \+ var\(--admin-shell-content-gap\)\)/);
  assert.match(css, /\.admin-shell-page\s+\.admin-content-frame\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.admin-sidebar-logo/);
  assert.match(css, /\.admin-topbar-notifications/);
  assert.match(shell, /renderAdminAccountMenu\(credentials,\s*authController\)/);
  assert.match(shell, /data-account-menu/);
  assert.match(shell, /data-account-trigger/);
  assert.match(shell, /data-account-dropdown/);
  assert.match(shell, /data-edit-profile/);
  assert.match(shell, /data-logout/);
  assert.doesNotMatch(shell, /title:\s*"Sair da/);
  assert.match(css, /\.admin-topbar-account-menu\s+\.account-dropdown/);
  assert.match(css, /\.admin-topbar-account-menu\.account-menu-open\s+\.account-dropdown\s*\{[\s\S]*opacity:\s*1/);
  assert.match(shell, /admin-account-dropdown-open/);
  assert.match(shell, /dropdown\.style\.visibility\s*=\s*isOpen\s*\?\s*"visible"/);
  assert.match(css, /\.admin-topbar-account-menu\s+\.account-dropdown\.admin-account-dropdown-open\s*\{[\s\S]*visibility:\s*visible/);
  assert.match(css, /\.admin-topbar-account-menu\s+\.profile-chip/);
});

test("admin sidebar brand uses enlarged logo and AdotaPet text", () => {
  const css = readCssBundle();

  assert.match(css, /\.admin-shell-page\s+\.admin-sidebar-logo\s*\{[\s\S]*gap:\s*10px[\s\S]*min-height:\s*38px/);
  assert.match(css, /\.admin-shell-page\s+\.admin-sidebar-logo img\s*\{[\s\S]*width:\s*34px;[\s\S]*height:\s*34px;/);
  assert.match(css, /\.admin-shell-page\s+\.admin-sidebar-logo strong\s*\{[\s\S]*max-width:\s*150px;[\s\S]*font-size:\s*1\.64rem;/);
});

test("admin solicitacoes uses unified request list with filters and pagination", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/admin-solicitacoes.js"), "utf8");
  const css = readCssBundle();

  assert.match(script, /fetchModeracaoSolicitacoesLista/);
  assert.match(script, /fetchModeracaoDetalhe/);
  assert.match(script, /decidirModeracaoSolicitacao/);
  assert.match(script, /finalizarModeracaoSolicitacao/);
  assert.match(script, /reverterFinalizacaoModeracaoSolicitacao/);
  assert.match(script, /excluirModeracaoSolicitacao/);
  assert.match(script, /admin-request-toolbar/);
  assert.match(script, /admin-request-animal-table/);
  assert.match(script, /admin-request-animal-toggle/);
  assert.match(script, /getAnimatedDropdownTransition/);
  assert.match(script, /getRequestReviewFlow/);
  assert.match(script, /data-start-analysis-modal/);
  assert.match(script, /openStartAnalysisPrompt/);
  assert.match(script, /confirmStartAnalysis/);
  assert.match(script, /data-request-detail-row/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /admin-request-dropdown-inner/);
  assert.match(script, /admin-request-review-modal/);
  assert.match(script, /data-request-page-next/);
  assert.match(script, /data-request-page-prev/);
  assert.doesNotMatch(script, /startAnalysisButton|admin-request-start-analysis/);
  assert.match(script, /renderRequestDecisionActions/);
  assert.match(script, /admin-request-decision-footer/);
  assert.match(script, /renderRequestFinalizationActions/);
  assert.match(script, /data-request-finalize-success/);
  assert.match(script, /data-request-finalize-failed/);
  assert.match(script, /Finalizar adocao/);
  assert.match(script, /Voltar para disponivel/);
  assert.match(script, /renderRequestUndoFinalizationActions/);
  assert.match(script, /data-request-undo-finalization/);
  assert.match(script, /Voltar atras/);
  assert.doesNotMatch(script, /Checklist administrativo|checklistField|queueChecklistSave|saveChecklist|salvarModeracaoChecklist/);
  assert.match(script, /renderRequestHistoryToggle/);
  assert.match(script, /data-request-history-toggle/);
  assert.match(script, /data-request-history-panel/);
  assert.match(script, /Mostrar Historico/);
  assert.match(script, /data-request-delete/);
  assert.match(script, /fa-trash/);
  assert.match(script, /canDeleteSolicitacao/);
  assert.doesNotMatch(script, /reviewSection\("Historico"/);
  assert.doesNotMatch(script, /form\.append\(actions\)/);
  assert.doesNotMatch(script, /renderInsights|insightCard|data-request-insights|admin-request-insights|Animais com fila|Aguardando decisao/);
  assert.doesNotMatch(css, /\.admin-request-insights|\.admin-request-insight/);
  assert.doesNotMatch(script, /admin-moderacao\.html/);
  assert.match(css, /\.admin-request-toolbar/);
  assert.match(css, /\.admin-request-animal-table/);
  assert.match(css, /\.admin-request-animal-toggle/);
  assert.match(css, /\.admin-request-dropdown\s*\{[\s\S]*grid-template-rows:\s*0fr/);
  assert.match(css, /\.admin-request-detail-row-open\s+\.admin-request-dropdown\s*\{[\s\S]*grid-template-rows:\s*1fr/);
  assert.match(css, /\.admin-request-dropdown-inner\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.admin-request-review-modal/);
  assert.match(css, /\.admin-start-analysis-dialog/);
  assert.match(css, /\.admin-request-review-layout\.admin-animal-modal-layout/);
  assert.match(css, /\.admin-request-history-toggle/);
  assert.match(css, /\.admin-request-history-panel/);
  assert.match(css, /\.admin-request-decision-footer/);
  assert.match(css, /\.admin-request-finalization-panel/);
  assert.match(css, /\.admin-request-undo-finalization-panel/);
  assert.match(css, /\.admin-request-review-main\.admin-animal-detail-main/);
  assert.match(css, /\.admin-request-decision-footer\.admin-animal-modal-actions/);
  assert.match(css, /\.admin-request-action-buttons/);
  assert.match(css, /\.admin-request-delete/);
  assert.match(css, /\.admin-pagination/);
});

test("admin overview renders the referenced dashboard sections", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/admin-visao-geral.js"), "utf8");
  const css = readCssBundle();

  assert.match(script, /admin-reference-dashboard/);
  assert.match(script, /Animais recentes/);
  assert.match(script, /Fila de moderação/);
  assert.match(script, /Relatórios rápidos/);
  assert.match(script, /Solicitações recentes/);
  assert.match(script, /Atividade recente/);
  assert.doesNotMatch(script, /Mensagens não lidas|messagesList|fetchAdminUnreadMessages|admin-mensagens\.html/);
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
    ".admin-animal-table",
    ".admin-animal-action-dropdown",
    ".admin-animal-pagination",
    ".admin-animal-detail-dialog",
    ".admin-animal-profile-side",
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
  assert.doesNotMatch(script, /fetchAdminUnreadMessages|admin-mensagens\.html|messagesList/);
  assert.doesNotMatch(api, /\/admin\/mensagens|sendAdminMessage|fetchAdminUnreadMessages/);
});

test("admin animals uses modals for create and edit and exposes delete action", () => {
  const script = fs.readFileSync(path.join(root, "js/pages/admin-animais.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "js/admin-api.js"), "utf8");
  const css = readCssBundle();

  assert.match(script, /admin-animal-modal/);
  assert.match(script, /openAnimalModal/);
  assert.match(script, /deleteAdminAnimal/);
  assert.match(script, /filterAndSortAdminAnimals/);
  assert.match(script, /enhanceSelectDropdowns/);
  assert.match(script, /admin-animal-toolbar/);
  assert.match(script, /filterField\("Status"/);
  assert.match(script, /showSearch:\s*false/);
  assert.match(script, /admin-page admin-animals-page/);
  assert.match(script, /admin-animal-table/);
  assert.match(script, /admin-animal-action-menu/);
  assert.match(script, /data-animal-delete-modal/);
  assert.match(script, /data-animal-detail-modal/);
  assert.match(script, /openDetailModal/);
  assert.match(script, /confirmAnimalDeletion/);
  assert.match(script, /PAGE_SIZE\s*=\s*10/);
  assert.match(script, /paginateAdminAnimals/);
  assert.match(script, /data-animal-page-next/);
  assert.match(script, /data-animal-page-prev/);
  assert.match(script, /admin-animal-pagination/);
  assert.match(script, /fa-ellipsis-vertical/);
  assert.match(script, /Detalhes/);
  assert.match(script, /ONG/);
  assert.match(script, /fa-trash/);
  assert.doesNotMatch(script, /window\.confirm/);
  assert.doesNotMatch(script, /searchPlaceholder:\s*"Buscar animal"/);
  assert.doesNotMatch(script, /href:\s*"#novo"/);
  assert.doesNotMatch(script, /quickStatusButton|changeStatus|Disponibilizar|Pausar/);
  assert.match(css, /\.admin-animal-table/);
  assert.match(css, /\.admin-animal-action-dropdown/);
  assert.match(css, /\.admin-animal-delete-dialog/);
  assert.match(css, /\.admin-animal-detail-dialog/);
  assert.match(css, /\.admin-animal-profile-side/);
  assert.match(css, /\.admin-animal-delete-confirm/);
  assert.match(css, /\.admin-animal-pagination/);
  assert.match(css, /width:\s*min\(1100px,\s*calc\(100vw - 32px\)\)/);
  assert.match(css, /\.admin-animal-delete-dialog\s*\{[\s\S]*width:\s*min\(420px,\s*calc\(100vw - 32px\)\)/);
  assert.match(css, /overflow-y:\s*auto;\s*overflow-x:\s*hidden/);
  assert.match(css, /\.admin-shell-page\s+\.admin-animals-page\s+\.admin-animal-table-region\s*\{[\s\S]*margin-right:\s*-47px/);
  assert.doesNotMatch(css, /\.admin-shell-page\s+\.admin-animals-page\s*>\s*\.admin-card\s*\{[\s\S]*width:\s*calc/);
  assert.match(css, /\.admin-animal-table\s*\{[\s\S]*table-layout:\s*fixed/);
  assert.match(css, /@media\s*\(max-width:\s*1180px\)\s*\{[\s\S]*\.admin-animal-table thead\s*\{[\s\S]*display:\s*none/);
  assert.doesNotMatch(css, /\.admin-animal-table-wrap\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.doesNotMatch(css, /min-width:\s*1080px/);
  assert.match(api, /deleteAdminAnimal/);
  assert.match(api, /client\.delete\(`\/animais\/\$\{id\}`/);
});

test("admin form helpers stay shared between animals and users", () => {
  const components = fs.readFileSync(path.join(root, "js/admin-components.js"), "utf8");
  const animalPage = fs.readFileSync(path.join(root, "js/pages/admin-animais.js"), "utf8");
  const userPage = fs.readFileSync(path.join(root, "js/pages/admin-usuarios.js"), "utf8");
  const duplicatedHelperPattern = /function\s+(field|formSection|filterField|checkField|filterSelect|select|icon)\s*\(/;

  for (const helper of ["adminField", "adminFormSection", "adminFilterField", "adminFilterSelect", "adminCheckField", "adminSelect", "adminIcon"]) {
    assert.match(components, new RegExp(`export function ${helper}\\b`));
    assert.match(animalPage, new RegExp(`${helper} as `));
    assert.match(userPage, new RegExp(`${helper} as `));
  }

  assert.doesNotMatch(animalPage, duplicatedHelperPattern);
  assert.doesNotMatch(userPage, duplicatedHelperPattern);
});

test("admin users mirrors animals table behavior with filters and modals", () => {
  const shell = fs.readFileSync(path.join(root, "js/admin-shell.js"), "utf8");
  const script = fs.readFileSync(path.join(root, "js/pages/admin-usuarios.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "js/admin-api.js"), "utf8");
  const css = readCssBundle();

  assert.match(shell, /label:\s*"Usuarios"/);
  assert.doesNotMatch(shell, /label:\s*"Pessoas"/);
  assert.match(script, /Novo Usuario Admistrador/);
  assert.match(script, /admin-page admin-users-page/);
  assert.match(script, /admin-user-toolbar/);
  assert.match(script, /filterAndSortAdminUsers/);
  assert.match(script, /paginateAdminUsers/);
  assert.match(script, /enhanceSelectDropdowns/);
  assert.match(script, /showSearch:\s*false/);
  assert.match(script, /admin-animal-table/);
  assert.match(script, /admin-user-table/);
  assert.match(script, /tableHeader\("Usuario"/);
  assert.match(script, /tableHeader\("Perfil"/);
  assert.match(script, /tableHeader\("E-mail"/);
  assert.match(script, /tableHeader\("CPF"/);
  assert.match(script, /tableHeader\("Telefone"/);
  assert.match(script, /tableHeader\("Cadastro"/);
  assert.match(script, /admin-animal-action-menu/);
  assert.match(script, /fa-ellipsis-vertical/);
  assert.match(script, /element\("colgroup"/);
  assert.match(script, /admin-user-col-name/);
  assert.match(script, /admin-user-col-actions/);
  assert.match(script, /Editar/);
  assert.match(script, /Detalhes/);
  assert.match(script, /Excluir/);
  assert.match(script, /data-user-modal/);
  assert.match(script, /data-user-detail-modal/);
  assert.match(script, /data-user-delete-modal/);
  assert.match(script, /openCreateAdminModal/);
  assert.match(script, /openUserModal/);
  assert.match(script, /openDetailModal/);
  assert.match(script, /renderAdminUserDetail/);
  assert.match(script, /renderAdopterUserDetail/);
  assert.match(script, /renderAdminUserFormIntro/);
  assert.match(script, /admin-user-modal-admin-mode/);
  assert.match(script, /admin-user-admin-detail/);
  assert.match(script, /admin-user-admin-edit-summary/);
  assert.match(script, /Acesso administrativo/);
  assert.match(script, /Este cadastro e apenas administrativo/);
  assert.match(script, /Permissoes/);
  assert.match(script, /confirmUserDeletion/);
  assert.doesNotMatch(script, /admin-list|data-users-list|Cadastrar usuario|Tornar admin|promoteAdminUser|checkField\("Administrador"|adminCheckbox/);
  assert.match(api, /updateAdminUser/);
  assert.match(api, /deleteAdminUser/);
  assert.match(api, /client\.put\(`\/admin\/usuarios\/\$\{id\}`/);
  assert.match(api, /client\.delete\(`\/admin\/usuarios\/\$\{id\}`/);
  assert.match(css, /\.admin-users-page/);
  assert.match(css, /\.admin-user-toolbar/);
  assert.match(css, /\.admin-user-table/);
  assert.match(css, /\.admin-user-table\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*minmax\(240px,\s*1\.45fr\)\s+minmax\(126px,\s*0\.74fr\)\s+minmax\(190px,\s*1\.12fr\)\s+minmax\(152px,\s*0\.9fr\)\s+minmax\(140px,\s*0\.82fr\)\s+minmax\(160px,\s*0\.94fr\)\s+minmax\(76px,\s*0\.42fr\);\s*\}/);
  assert.match(css, /\.admin-user-col-name\s*\{\s*width:\s*21%;\s*\}/);
  assert.match(css, /\.admin-user-col-actions\s*\{\s*width:\s*7%;\s*\}/);
  assert.match(css, /\.admin-user-table\s+colgroup\s*\{\s*display:\s*none;\s*\}/);
  assert.match(css, /\.admin-user-table\s+thead,\s*\.admin-user-table\s+tbody,\s*\.admin-user-table\s+tr\s*\{\s*display:\s*contents;\s*\}/);
  assert.match(css, /\.admin-user-table\s+th,\s*\.admin-user-table\s+td\s*\{\s*min-width:\s*0;\s*width:\s*100%;\s*box-sizing:\s*border-box;\s*display:\s*flex;\s*align-items:\s*center;\s*justify-self:\s*stretch;\s*\}/);
  assert.match(css, /\.admin-user-table\.admin-animal-table\s+th,\s*\.admin-user-table\.admin-animal-table\s+td\s*\{\s*width:\s*100%;\s*\}/);
  assert.match(css, /\.admin-user-identity\s+>\s+div\s*\{\s*min-width:\s*0;\s*display:\s*grid;\s*gap:\s*2px;\s*\}/);
  assert.match(css, /\.admin-user-identity\s+strong\s*\{\s*overflow:\s*visible;\s*text-overflow:\s*clip;\s*white-space:\s*normal;\s*\}/);
  assert.match(css, /\.admin-user-table\s+\.admin-animal-actions-head,\s*\.admin-user-table\s+\.admin-animal-actions-cell\s*\{\s*width:\s*100%;\s*justify-content:\s*center;\s*overflow:\s*visible;\s*text-align:\s*center;\s*\}/);
  assert.match(css, /\.admin-user-action-menu-up\s+\.admin-animal-action-dropdown\s*\{\s*top:\s*auto;\s*bottom:\s*calc\(100%\s*\+\s*8px\);/);
  assert.match(css, /@media\s*\(max-width:\s*1320px\)\s*\{[\s\S]*\.admin-user-table,[\s\S]*\.admin-user-table\s+td\s*\{[\s\S]*display:\s*block;[\s\S]*width:\s*100%;[\s\S]*\}/);
  assert.match(css, /@media\s*\(max-width:\s*1320px\)\s*\{[\s\S]*\.admin-user-table\s+thead\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /@media\s*\(max-width:\s*1320px\)\s*\{[\s\S]*\.admin-user-table\s+td\s*\{[\s\S]*grid-template-columns:\s*118px\s+minmax\(0,\s*1fr\)/);
  assert.match(script, /admin-user-action-menu-up/);
  assert.match(script, /getBoundingClientRect/);
  assert.match(css, /\.admin-user-detail-modal/);
  assert.match(css, /\.admin-user-delete-modal/);
  assert.match(css, /\.admin-user-modal-admin-mode/);
  assert.match(css, /\.admin-user-modal-admin-mode\s+\.admin-user-phone-field,\s*\.admin-user-modal-admin-mode\s+\.admin-user-profile-section,\s*\.admin-user-modal-admin-mode\s+\.admin-user-check-section\s*\{\s*display:\s*none\s*!important;\s*\}/);
  assert.match(css, /\.admin-user-admin-edit-summary/);
  assert.match(css, /\.admin-user-admin-detail/);
  assert.match(css, /\.admin-user-admin-permission-list/);
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
