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
];

function readPage(page) {
  return fs.readFileSync(path.join(root, page), "utf8");
}

function sharedAuthShellScript() {
  return fs.readFileSync(path.join(root, "js/shared-auth-shell.js"), "utf8");
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

test("admin animal form accepts multiple uploaded images", () => {
  const html = readPage("admin-painel.html");
  const inputMatch = html.match(/<input[^>]+id="imagens"[^>]+>/);

  assert.ok(inputMatch, "admin animal image input should exist");
  assert.match(inputMatch[0], /name="imagens"/);
  assert.match(inputMatch[0], /type="file"/);
  assert.match(inputMatch[0], /multiple/);
});

test("admin panel uses the authenticated shared header and login modal", () => {
  const html = readPage("admin-painel.html");

  assert.match(html, /data-shared-auth-shell/);
  assert.doesNotMatch(html, /<header class="site-header">/);
  assert.doesNotMatch(html, /data-login-modal/);
  assert.doesNotMatch(html, /id="admin-logout"/);
});

test("hidden profile sections stay hidden even when component classes define display", () => {
  const css = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");

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
