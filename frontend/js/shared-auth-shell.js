const SVG_NS = "http://www.w3.org/2000/svg";

export function renderSharedAuthShell(root = document) {
  const mount = root.querySelector?.("[data-shared-auth-shell]");
  if (!mount) {
    return false;
  }

  const documentRef = mount.ownerDocument || root;
  let rendered = false;

  if (!root.querySelector?.("[data-auth-header]")) {
    mount.append(buildHeader(documentRef));
    rendered = true;
  }

  if (!root.querySelector?.("[data-site-footer]")) {
    root.body?.append(buildFooter(documentRef));
    rendered = true;
  }

  if (!root.querySelector?.("[data-login-modal]")) {
    root.body?.append(buildLoginModal(documentRef));
    rendered = true;
  }

  return rendered;
}

function buildHeader(documentRef) {
  const header = el(documentRef, "header", { className: "site-header" });
  const nav = el(documentRef, "nav", { className: "nav", attrs: { "aria-label": "Principal" } });

  nav.append(
    buildBrand(documentRef),
    el(documentRef, "div", { className: "nav-links" }, [
      el(documentRef, "a", { text: "Inicio", attrs: { href: "index.html" } }),
      el(documentRef, "a", {
        text: "Recomendados",
        attrs: { href: "recomendados.html", "data-auth-private": "", hidden: "" },
      }),
    ]),
    buildNavActions(documentRef)
  );
  header.append(nav);

  return header;
}

function buildBrand(documentRef) {
  const text = el(documentRef, "span", { className: "brand-text", text: "Adota" });
  text.append(el(documentRef, "span", { text: "Pet" }));

  return el(documentRef, "a", { className: "brand", attrs: { href: "index.html" } }, [
    el(documentRef, "img", { attrs: { src: "assets/adotapet-mark.svg", alt: "" } }),
    text,
  ]);
}

function buildNavActions(documentRef) {
  const actions = el(documentRef, "div", {
    className: "nav-actions",
    attrs: { "aria-label": "Acoes rapidas", "data-auth-header": "" },
  });

  actions.append(
    el(documentRef, "button", {
      className: "icon-button has-badge",
      attrs: {
        type: "button",
        "aria-label": "Notificacoes",
        "aria-haspopup": "dialog",
        "aria-expanded": "false",
        "data-notifications-toggle": "",
        "data-auth-private": "",
        hidden: "",
      },
    }, [
      icon(documentRef, [
        "M15 17H9a4 4 0 0 0 6 0Z",
        "M18 14v-3a6 6 0 1 0-12 0v3l-2 2h16l-2-2Z",
      ]),
      el(documentRef, "span", {
        className: "notification-badge",
        attrs: { "data-notification-badge": "", hidden: "" },
      }),
    ]),
    el(documentRef, "a", {
      className: "favorite-button",
      text: "Favoritos",
      attrs: { href: "favoritos.html", "data-auth-private": "", hidden: "" },
    }, [
      icon(documentRef, ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"]),
    ]),
    el(documentRef, "button", {
      className: "login-button",
      text: "Fazer login",
      attrs: { type: "button", "data-login-open": "" },
    }, [
      icon(documentRef, ["M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z", "M4 21a8 8 0 0 1 16 0"]),
    ]),
    buildAccountMenu(documentRef)
  );

  return actions;
}

function buildAccountMenu(documentRef) {
  const trigger = el(documentRef, "button", {
    className: "profile-chip",
    attrs: {
      type: "button",
      "aria-label": "Abrir menu da conta",
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      "data-account-trigger": "",
    },
  }, [
    el(documentRef, "span", { className: "profile-avatar", attrs: { "aria-hidden": "true" } }),
    el(documentRef, "span", { attrs: { "data-account-greeting": "" } }),
    icon(documentRef, ["m7 10 5 5 5-5"]),
  ]);

  return el(documentRef, "div", { className: "account-menu", attrs: { "data-account-menu": "", hidden: "" } }, [
    trigger,
    el(documentRef, "div", { className: "account-dropdown", attrs: { role: "menu", "data-account-dropdown": "" } }, [
      el(documentRef, "a", {
        text: "Area administrativa",
        attrs: { href: "admin-painel.html", role: "menuitem", "data-admin-area": "", hidden: "" },
      }, [
        icon(documentRef, ["M3 21h18", "M5 21V7l8-4v18", "M19 21V11l-6-4", "M9 9h1", "M9 13h1", "M9 17h1"]),
      ]),
      el(documentRef, "button", {
        text: "Editar dados pessoais",
        attrs: { type: "button", role: "menuitem", "data-edit-profile": "" },
      }, [
        icon(documentRef, ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"]),
      ]),
      el(documentRef, "button", { text: "Sair", attrs: { type: "button", role: "menuitem", "data-logout": "" } }, [
        icon(documentRef, ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"]),
      ]),
    ]),
  ]);
}

function buildLoginModal(documentRef) {
  return el(documentRef, "div", { className: "login-modal", attrs: { "data-login-modal": "", hidden: "" } }, [
    el(documentRef, "button", {
      className: "login-backdrop",
      attrs: { type: "button", "aria-label": "Fechar login", "data-login-close": "" },
    }),
    el(documentRef, "section", {
      className: "login-dialog",
      attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "login-title" },
    }, [
      el(documentRef, "button", {
        className: "modal-close",
        attrs: { type: "button", "aria-label": "Fechar login", "data-login-close": "" },
      }, [
        icon(documentRef, ["M18 6 6 18", "m6 6 12 12"]),
      ]),
      el(documentRef, "span", { className: "login-mark", attrs: { "aria-hidden": "true" } }, [
        icon(documentRef, [
          { tag: "circle", attrs: { cx: "5.5", cy: "10.5", r: "2" } },
          { tag: "circle", attrs: { cx: "9.5", cy: "6.5", r: "2" } },
          { tag: "circle", attrs: { cx: "14.5", cy: "6.5", r: "2" } },
          { tag: "circle", attrs: { cx: "18.5", cy: "10.5", r: "2" } },
          "M7 17c1.8-3.2 8.2-3.2 10 0 1 1.8-.3 3.5-2.2 2.7a7.1 7.1 0 0 0-5.6 0C7.3 20.5 6 18.8 7 17Z",
        ]),
      ]),
      el(documentRef, "div", { className: "login-heading" }, [
        el(documentRef, "h2", { text: "Fazer login", attrs: { id: "login-title", "data-login-title": "" } }),
        el(documentRef, "p", {
          text: "Entre com CPF e senha para acessar favoritos, notificacoes e sua conta.",
          attrs: { "data-login-subtitle": "" },
        }),
      ]),
      buildLoginForm(documentRef),
    ]),
  ]);
}

function buildLoginForm(documentRef) {
  const registerLink = el(documentRef, "p", { className: "login-register-link", text: "Nao possui uma conta? " });
  registerLink.append(el(documentRef, "a", { text: "Cadastre-se aqui", attrs: { href: "cadastro.html" } }));

  return el(documentRef, "form", { className: "login-form", attrs: { "data-login-form": "" } }, [
    el(documentRef, "label", { className: "form-field" }, [
      el(documentRef, "span", { text: "CPF" }),
      el(documentRef, "input", {
        attrs: {
          name: "cpf",
          placeholder: "000.000.000-00",
          autocomplete: "username",
          inputmode: "numeric",
          required: "",
          maxlength: "14",
        },
      }),
    ]),
    el(documentRef, "label", { className: "form-field" }, [
      el(documentRef, "span", { text: "Senha" }),
      el(documentRef, "input", {
        attrs: { name: "senha", type: "password", placeholder: "Sua senha", autocomplete: "current-password", required: "" },
      }),
    ]),
    el(documentRef, "p", { className: "login-feedback", attrs: { role: "status", "data-login-feedback": "" } }),
    el(documentRef, "button", { className: "button button-coral login-submit", attrs: { type: "submit" } }, [
      el(documentRef, "span", { text: "Entrar", attrs: { "data-login-submit-text": "" } }),
      icon(documentRef, ["M5 12h14", "m13 6 6 6-6 6"]),
    ]),
    registerLink,
  ]);
}

function buildFooter(documentRef) {
  const githubIcon = icon(documentRef, [
    "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
    "M9 18c-4.51 2-5-2-7-2",
  ]);
  githubIcon.setAttribute("class", "site-footer-github-icon");

  return el(documentRef, "footer", {
    className: "site-footer",
    attrs: { "data-site-footer": "" },
  }, [
    el(documentRef, "div", { className: "site-footer-inner" }, [
      el(documentRef, "div", { className: "site-footer-info" }, [
        el(documentRef, "strong", { text: "Gustavo Maciel Huçulak" }),
        el(documentRef, "span", { text: "IFC Campus Fraiburgo" }),
      ]),
      el(documentRef, "a", {
        className: "site-footer-github",
        attrs: {
          href: "https://github.com/Gusta12344",
          target: "_blank",
          rel: "noreferrer",
          "aria-label": "GitHub de Gustavo Maciel Huçulak",
        },
      }, [
        githubIcon,
        el(documentRef, "span", { text: "GitHub" }),
      ]),
    ]),
  ]);
}

function el(documentRef, tagName, options = {}, children = []) {
  const node = documentRef.createElement(tagName);

  if (options.className) {
    node.className = options.className;
  }
  if (options.text) {
    node.textContent = options.text;
  }
  setAttributes(node, options.attrs);
  node.append(...children);

  return node;
}

function icon(documentRef, shapes) {
  const svg = documentRef.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  for (const shape of shapes) {
    const child = typeof shape === "string"
      ? documentRef.createElementNS(SVG_NS, "path")
      : documentRef.createElementNS(SVG_NS, shape.tag);

    if (typeof shape === "string") {
      child.setAttribute("d", shape);
    } else {
      setAttributes(child, shape.attrs);
    }

    svg.append(child);
  }

  return svg;
}

function setAttributes(node, attrs = {}) {
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, String(value));
    if (name === "hidden") {
      node.hidden = true;
    }
  }
}
