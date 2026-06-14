import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { renderSharedAuthShell } from "../js/shared-auth-shell.js";

class TestElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.className = "";
    this.textContent = "";
    this.hidden = false;
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "hidden") {
      this.hidden = true;
    }
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
}

function documentMock() {
  const body = new TestElement("body");
  const root = {
    body,
    createElement(tagName) {
      const node = new TestElement(tagName);
      node.ownerDocument = root;
      return node;
    },
    createElementNS(_namespace, tagName) {
      const node = new TestElement(tagName);
      node.ownerDocument = root;
      return node;
    },
    querySelector(selector) {
      return findAll(body, selector)[0] || null;
    },
    querySelectorAll(selector) {
      return findAll(body, selector);
    },
  };
  body.ownerDocument = root;
  return root;
}

function findAll(node, selector, matches = []) {
  if (!node || typeof node === "string") {
    return matches;
  }
  const dataAttr = /^\[([^=\]]+)\]$/.exec(selector);
  if (dataAttr && Object.prototype.hasOwnProperty.call(node.attributes, dataAttr[1])) {
    matches.push(node);
  }
  if (selector.startsWith(".") && String(node.className || "").split(/\s+/).includes(selector.slice(1))) {
    matches.push(node);
  }
  for (const child of node.children || []) {
    findAll(child, selector, matches);
  }
  return matches;
}

test("renderSharedAuthShell cria header, modal e footer compartilhados", () => {
  const root = documentMock();
  const mount = root.createElement("div");
  mount.setAttribute("data-shared-auth-shell", "");
  root.body.append(mount);

  assert.equal(renderSharedAuthShell(root), true);
  assert.ok(root.querySelector("[data-auth-header]"));
  assert.ok(root.querySelector("[data-login-modal]"));
  assert.ok(root.querySelector("[data-site-footer]"));
  assert.equal(root.querySelector(".site-footer-github").getAttribute("href"), "https://github.com/Gusta12344");
});

test("shared auth shell nao usa innerHTML para montar controles", () => {
  const script = fs.readFileSync("frontend/js/shared-auth-shell.js", "utf8");
  assert.doesNotMatch(script, /innerHTML/);
});
