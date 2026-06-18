import { readAdminCredentials } from "./auth.js";
import { createHeaderAuthController } from "./header-auth.js";
import { clearNode, element } from "./ui.js";

export const ADMIN_THEME_KEY = "adotapet.admin.theme";

const DEFAULT_ADMIN_EMAIL = "admin@adotapet.com";
const GLOBAL_SEARCH_PLACEHOLDER = "Buscar animais, usuários, solicitações...";

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Visão geral",
    icon: "fa-house",
    href: "admin-visao-geral.html",
  },
  {
    id: "animals",
    label: "Animais",
    icon: "fa-paw",
    href: "admin-animais.html",
  },
  {
    id: "requests",
    label: "Solicitações",
    icon: "fa-clipboard-list",
    children: [
      { id: "requests-all", label: "Todas as solicitações", href: "admin-solicitacoes.html" },
      { id: "requests-analysis", label: "Em análise", href: "admin-solicitacoes.html?status=em_analise" },
      { id: "requests-approved", label: "Aprovadas", href: "admin-solicitacoes.html?status=aprovada" },
      { id: "requests-rejected", label: "Rejeitadas", href: "admin-solicitacoes.html?status=recusada" },
      { id: "requests-archived", label: "Arquivadas", href: "admin-solicitacoes.html?status=arquivada" },
    ],
  },
  {
    id: "moderation",
    label: "Central de moderação",
    icon: "fa-shield-halved",
    href: "admin-moderacao.html",
  },
  {
    id: "messages",
    label: "Mensagens",
    icon: "fa-comment-dots",
    href: "admin-mensagens.html",
  },
  {
    id: "users",
    label: "Usuários",
    icon: "fa-users",
    href: "admin-usuarios.html",
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: "fa-chart-line",
    href: "admin-relatorios.html",
  },
  {
    id: "settings",
    label: "Configurações",
    icon: "fa-gear",
    href: "admin-configuracoes.html",
  },
];

export function createAdminShell({
  active,
  title,
  subtitle = "",
  searchPlaceholder = "",
  onSearch = null,
  actions = null,
  content = null,
} = {}) {
  const mount = document.querySelector("[data-admin-page]");
  const credentials = readAdminCredentials(sessionStorage);

  if (!credentials) {
    window.location.href = "index.html?login=required";
    return null;
  }

  const authController = createHeaderAuthController({
    onLogout() {
      window.location.href = "index.html";
    },
  });
  applyAdminTheme();

  clearNode(mount);
  mount.className = "admin-shell";
  mount.setAttribute("data-admin-shell", "");

  const feedback = element("p", {
    className: "feedback admin-shell-feedback",
    role: "status",
    "aria-live": "polite",
    dataset: { adminFeedback: "true" },
  });
  const contentNode = content || element("section", { className: "admin-page" });
  const searchInput = element("input", {
    type: "search",
    placeholder: searchPlaceholder || GLOBAL_SEARCH_PLACEHOLDER,
    autocomplete: "off",
    "data-admin-search": "",
  });

  if (onSearch) {
    searchInput.addEventListener("input", () => onSearch(searchInput.value));
  }

  const headerActions = Array.isArray(actions) && actions.length
    ? actions
    : [renderPrimaryAction()];

  mount.append(
    renderSidebar(active, credentials, authController),
    element("section", { className: "admin-shell-main" }, [
      renderTopbar(searchInput, credentials, authController),
      element("main", { className: "admin-content-frame" }, [
        element("div", { className: "admin-content-header" }, [
          element("div", { className: "admin-page-heading" }, [
            element("h1", { text: title }),
            subtitle ? element("p", { className: "muted", text: subtitle }) : null,
            feedback,
          ]),
          element("div", { className: "admin-page-toolbar" }, headerActions),
        ]),
        contentNode,
      ]),
    ])
  );

  return {
    content: contentNode,
    feedback,
    search: searchInput,
  };
}

export function getAdminTheme(storage = localStorage) {
  return storage.getItem(ADMIN_THEME_KEY) === "dark" ? "dark" : "light";
}

export function setAdminTheme(theme, storage = localStorage) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  storage.setItem(ADMIN_THEME_KEY, nextTheme);
  applyAdminTheme(storage);
  return nextTheme;
}

export function applyAdminTheme(storage = localStorage) {
  document.documentElement.classList.toggle("admin-theme-dark", getAdminTheme(storage) === "dark");
}

function renderSidebar(active, credentials, authController) {
  return element("aside", { className: "admin-sidebar", "aria-label": "Navegação administrativa" }, [
    element("a", { className: "admin-sidebar-logo", href: "admin-visao-geral.html", "aria-label": "AdotaPet Administração" }, [
      element("img", { src: "assets/adotapet-mark.svg", alt: "" }),
      element("strong", {}, [
        document.createTextNode("Adota"),
        element("span", { text: "Pet" }),
      ]),
    ]),
    element("nav", { className: "admin-sidebar-nav" }, NAV_ITEMS.map((item) => (
      item.children ? renderRequestGroup(item, active) : renderNavLink(item, active)
    ))),
    element("div", { className: "admin-sidebar-footer" }, [
      renderThemeToggle(),
      renderSidebarAccount(credentials, authController),
    ]),
  ]);
}

function renderTopbar(searchInput, credentials, authController) {
  return element("header", { className: "admin-topbar" }, [
    element("button", { className: "admin-menu-button", type: "button", "aria-label": "Abrir menu administrativo" }, [
      icon("fa-bars"),
    ]),
    element("label", { className: "admin-global-search" }, [
      element("span", { className: "sr-only", text: "Buscar" }),
      icon("fa-magnifying-glass", "admin-search-icon"),
      searchInput,
      element("kbd", { text: "⌘ K" }),
    ]),
    element("div", { className: "admin-topbar-spacer" }),
    element("div", { className: "admin-topbar-notifications", "aria-label": "Notificações administrativas" }, [
      renderNotificationButton("fa-bell", "3", "Notificações"),
      renderNotificationButton("fa-envelope", "5", "Mensagens"),
    ]),
    element("button", {
      className: "admin-topbar-account",
      type: "button",
      title: "Sair da área administrativa",
      onClick() {
        authController?.logout?.();
      },
    }, [
      element("span", { className: "admin-topbar-avatar", text: "AD", "aria-hidden": "true" }),
      element("span", { className: "admin-topbar-name", text: "Administrador" }),
      icon("fa-chevron-down", "admin-topbar-chevron"),
    ]),
  ]);
}

function renderPrimaryAction() {
  return element("a", { className: "button admin-primary-action", href: "admin-animais.html#novo" }, [
    icon("fa-plus"),
    element("span", { text: "Novo animal" }),
  ]);
}

function renderNotificationButton(iconName, count, label) {
  return element("a", { className: "admin-notification-button", href: "admin-mensagens.html", "aria-label": label }, [
    icon(iconName),
    element("span", { className: "admin-notification-count", text: count }),
  ]);
}

function renderThemeToggle() {
  const checkbox = element("input", {
    type: "checkbox",
    "aria-label": "Alternar modo escuro",
    "data-admin-sidebar-theme": "",
  });
  checkbox.checked = getAdminTheme() === "dark";
  checkbox.addEventListener("change", () => {
    setAdminTheme(checkbox.checked ? "dark" : "light");
  });

  return element("label", { className: "admin-sidebar-theme" }, [
    icon("fa-moon"),
    element("span", { text: "Modo escuro" }),
    element("span", { className: "admin-theme-switch" }, [
      checkbox,
      element("span", { "aria-hidden": "true" }),
    ]),
  ]);
}

function renderSidebarAccount(credentials, authController) {
  return element("button", {
    className: "admin-sidebar-account",
    type: "button",
    title: "Sair da área administrativa",
    onClick() {
      authController?.logout?.();
    },
  }, [
    element("span", { className: "admin-sidebar-account-avatar" }, [
      icon("fa-user"),
    ]),
    element("span", { className: "admin-sidebar-account-text" }, [
      element("strong", { text: "Administrador" }),
      element("small", { text: credentials.email || DEFAULT_ADMIN_EMAIL }),
    ]),
    icon("fa-chevron-right", "admin-sidebar-account-arrow"),
  ]);
}

function renderNavLink(item, active) {
  const isActive = active === item.id;
  return element("a", {
    className: isActive ? "admin-sidebar-active" : "",
    href: item.href,
    "aria-current": isActive ? "page" : null,
    "data-admin-nav-action": item.id,
  }, [
    icon(item.icon, "admin-nav-icon"),
    element("span", { text: item.label }),
  ]);
}

function renderRequestGroup(item, active) {
  const isOpen = active === item.id || item.children.some((child) => child.id === active);
  const group = element("div", {
    className: `admin-nav-group${isOpen ? " admin-nav-group-open" : ""}`,
  });
  const button = element("button", {
    type: "button",
    "data-admin-requests-toggle": "",
    "aria-expanded": String(isOpen),
  }, [
    icon(item.icon, "admin-nav-icon"),
    element("span", { text: item.label }),
    icon("fa-chevron-down", "admin-nav-caret"),
  ]);
  const menu = element("div", {
    className: "admin-nav-submenu",
    "data-admin-requests-menu": "",
  }, item.children.map((child) => renderSubLink(child, active)));

  button.addEventListener("click", () => {
    const nextOpen = !group.classList.contains("admin-nav-group-open");
    group.classList.toggle("admin-nav-group-open", nextOpen);
    button.setAttribute("aria-expanded", String(nextOpen));
  });

  group.append(button, menu);
  return group;
}

function renderSubLink(item, active) {
  const isActive = active === item.id || (active === "requests" && item.id === getRequestActiveFromUrl());
  return element("a", {
    className: isActive ? "admin-sidebar-active" : "",
    href: item.href,
    "aria-current": isActive ? "page" : null,
    "data-admin-nav-action": item.id,
  }, [
    element("span", { text: item.label }),
  ]);
}

function getRequestActiveFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status") || "";
  if (status === "pendente") {
    return "requests-pending";
  }
  if (status === "em_analise") {
    return "requests-analysis";
  }
  if (status === "aprovada") {
    return "requests-approved";
  }
  if (status === "recusada") {
    return "requests-rejected";
  }
  if (status === "arquivada") {
    return "requests-archived";
  }
  return "requests-all";
}

function icon(name, className = "") {
  return element("i", {
    className: ["fa-solid", name, "library-icon", className].filter(Boolean).join(" "),
    "aria-hidden": "true",
  });
}
