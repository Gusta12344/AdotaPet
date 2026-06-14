import { createIcon } from "./icons.js";

export function renderSharedAuthShell(root = document) {
  const mount = root.querySelector?.("[data-shared-auth-shell]");
  if (!mount) {
    return false;
  }

  const documentRef = mount.ownerDocument || root;
  const isAdminShell = hasClass(root.body, "admin-shell-page");
  let rendered = false;

  if (!root.querySelector?.("[data-auth-header]")) {
    mount.append(buildHeader(documentRef, { isAdminShell }));
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

function buildHeader(documentRef, { isAdminShell = false } = {}) {
  const header = el(documentRef, "header", {
    className: isAdminShell ? "site-header admin-site-header" : "site-header",
  });
  const nav = el(documentRef, "nav", { className: "nav", attrs: { "aria-label": "Principal" } });

  nav.append(
    buildBrand(documentRef, { isAdminShell }),
    buildNavLinks(documentRef, { isAdminShell }),
    buildNavActions(documentRef)
  );
  header.append(nav);

  return header;
}

function buildBrand(documentRef, { isAdminShell = false } = {}) {
  const text = el(documentRef, "span", { className: "brand-text", text: "Adota" });
  text.append(el(documentRef, "span", { text: "Pet" }));
  const children = [
    el(documentRef, "img", { attrs: { src: "assets/adotapet-mark.svg", alt: "" } }),
    text,
  ];

  if (isAdminShell) {
    children.push(el(documentRef, "span", { className: "brand-context", text: "Area Administrativa" }));
  }

  return el(documentRef, "a", { className: "brand", attrs: { href: "index.html" } }, children);
}

function buildNavLinks(documentRef, { isAdminShell = false } = {}) {
  const links = [
    el(documentRef, "a", {
      text: "Inicio",
      attrs: { href: "index.html" },
    }),
  ];

  if (!isAdminShell) {
    links.push(el(documentRef, "a", {
      text: "Recomendados",
      attrs: { href: "recomendados.html", "data-auth-private": "", hidden: "" },
    }));
  }

  return el(documentRef, "div", { className: "nav-links" }, links);
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
      createIcon("bell", { documentRef }),
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
      createIcon("heart", { documentRef }),
    ]),
    el(documentRef, "button", {
      className: "login-button",
      text: "Fazer login",
      attrs: { type: "button", "data-login-open": "" },
    }, [
      createIcon("user", { documentRef }),
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
    createIcon("chevron-down", { documentRef }),
  ]);

  return el(documentRef, "div", { className: "account-menu", attrs: { "data-account-menu": "", hidden: "" } }, [
    trigger,
    el(documentRef, "div", { className: "account-dropdown", attrs: { role: "menu", "data-account-dropdown": "" } }, [
      el(documentRef, "a", {
        text: "Area administrativa",
        attrs: { href: "admin-painel.html", role: "menuitem", "data-admin-area": "", hidden: "" },
      }, [
        createIcon("building", { documentRef }),
      ]),
      el(documentRef, "button", {
        text: "Editar dados pessoais",
        attrs: { type: "button", role: "menuitem", "data-edit-profile": "" },
      }, [
        createIcon("pen", { documentRef }),
      ]),
      el(documentRef, "button", { text: "Sair", attrs: { type: "button", role: "menuitem", "data-logout": "" } }, [
        createIcon("sign-out", { documentRef }),
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
        createIcon("x", { documentRef }),
      ]),
      el(documentRef, "span", { className: "login-mark", attrs: { "aria-hidden": "true" } }, [
        createIcon("paw", { documentRef }),
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
      createIcon("arrow-right", { documentRef }),
    ]),
    registerLink,
  ]);
}

function buildFooter(documentRef) {
  const githubIcon = createIcon("github", { className: "site-footer-github-icon", documentRef });

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

function setAttributes(node, attrs = {}) {
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, String(value));
    if (name === "hidden") {
      node.hidden = true;
    }
  }
}

function hasClass(node, className) {
  return String(node?.className || "").split(/\s+/).includes(className);
}
