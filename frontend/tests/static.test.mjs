import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("frontend");
const pages = [
  "index.html",
  "cadastro.html",
  "editar-dados.html",
  "recomendados.html",
  "animal.html",
  "confirmacao.html",
  "admin.html",
  "admin-painel.html",
];

function readPage(page) {
  return fs.readFileSync(path.join(root, page), "utf8");
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
  const html = readPage("index.html");

  assert.match(html, /Não possui uma conta\?/);
  assert.match(html, /href="cadastro\.html"[^>]*>Cadastre-se aqui<\/a>/);
});

test("profile edit page keeps authenticated account controls in the header", () => {
  const html = readPage("editar-dados.html");

  assert.match(html, /data-auth-header/);
  assert.match(html, /data-auth-private/);
  assert.match(html, /data-account-menu/);
  assert.match(html, /data-account-greeting/);
  assert.match(html, /id="editar-dados-form"/);
});

test("animal detail page uses the authenticated header and login modal", () => {
  const html = readPage("animal.html");

  assert.match(html, /data-auth-header/);
  assert.match(html, /data-auth-private/);
  assert.match(html, /data-account-menu/);
  assert.match(html, /data-login-modal/);
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
