import { readAdminCredentials } from "./auth.js";
import { createHeaderAuthController } from "./header-auth.js";
import { clearNode, element } from "./ui.js";

export const ADMIN_THEME_KEY = "adotapet.admin.theme";

const ADMIN_SIDEBAR_ID = "admin-sidebar";
const SIDEBAR_COLLAPSED_CLASS = "admin-sidebar-collapsed";
const GLOBAL_SEARCH_PLACEHOLDER = "Buscar animais, usuários, solicitações...";

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Painel",
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
    icon: "fa-rectangle-list",
    href: "admin-solicitacoes.html",
  },
  {
    id: "users",
    label: "Usuarios",
    icon: "fa-user-group",
    href: "admin-usuarios.html",
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: "fa-file-lines",
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
  showSearch = true,
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
  const searchInput = showSearch ? element("input", {
    type: "search",
    placeholder: searchPlaceholder || GLOBAL_SEARCH_PLACEHOLDER,
    autocomplete: "off",
    "data-admin-search": "",
  }) : null;

  if (searchInput && onSearch) {
    searchInput.addEventListener("input", () => onSearch(searchInput.value));
  }

  const headerActions = Array.isArray(actions) && actions.length
    ? actions
    : [renderPrimaryAction()];

  mount.append(
    renderSidebar(active),
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
  initializeSidebarToggle(mount);

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

function renderSidebar(active) {
  return element("aside", { id: ADMIN_SIDEBAR_ID, className: "admin-sidebar", "aria-label": "Navegação administrativa" }, [
    element("a", { className: "admin-sidebar-logo", href: "admin-visao-geral.html", "aria-label": "AdotaPet Administração" }, [
      element("img", { src: "assets/adotapet-mark.svg", alt: "" }),
      element("strong", {}, [
        document.createTextNode("Adota"),
        element("span", { text: "Pet" }),
      ]),
    ]),
    element("nav", { className: "admin-sidebar-nav" }, NAV_ITEMS.map((item) => renderNavLink(item, active))),
  ]);
}

function renderTopbar(searchInput, credentials, authController) {
  return element("header", { className: "admin-topbar" }, [
    element("button", {
      className: "admin-menu-button",
      type: "button",
      "aria-controls": ADMIN_SIDEBAR_ID,
      "aria-expanded": "true",
      "aria-label": "Recolher menu administrativo",
    }, [
      icon("fa-bars"),
    ]),
    searchInput ? element("label", { className: "admin-global-search" }, [
      element("span", { className: "sr-only", text: "Buscar" }),
      icon("fa-magnifying-glass", "admin-search-icon"),
      searchInput,
      element("kbd", { text: "⌘ K" }),
    ]) : null,
    element("div", { className: "admin-topbar-spacer" }),
    element("div", { className: "admin-topbar-notifications", "aria-label": "Notificações administrativas" }, [
      renderNotificationButton("fa-bell", "3", "Notificações", "admin-solicitacoes.html"),
    ]),
    renderAdminAccountMenu(credentials, authController),
  ]);
}

function renderAdminAccountMenu(credentials, authController) {
  const displayName = credentials?.email ? "Administrador" : "Administrador";
  const menu = element("div", {
    className: "account-menu admin-topbar-account-menu",
    "data-account-menu": "",
  });
  const trigger = element("button", {
    className: "profile-chip admin-topbar-account",
    type: "button",
    "aria-label": "Abrir menu da conta",
    "aria-haspopup": "menu",
    "aria-expanded": "false",
    "data-account-trigger": "",
    onClick(event) {
      event.stopPropagation();
      toggleAdminAccountMenu(menu);
    },
  }, [
    element("span", { className: "admin-topbar-avatar", text: "AD", "aria-hidden": "true" }),
    element("span", { className: "admin-topbar-name", "data-account-greeting": "", text: displayName }),
    icon("fa-chevron-down", "admin-topbar-chevron"),
  ]);
  const dropdown = element("div", {
    className: "account-dropdown",
    role: "menu",
    "data-account-dropdown": "",
    onClick(event) {
      event.stopPropagation();
    },
  }, [
    element("button", {
      type: "button",
      role: "menuitem",
      "data-edit-profile": "",
      onClick() {
        closeAdminAccountMenu(menu);
        window.location.href = "editar-dados.html";
      },
    }, [
      icon("fa-pen"),
      element("span", { text: "Editar dados pessoais" }),
    ]),
    element("button", {
      type: "button",
      role: "menuitem",
      "data-logout": "",
      onClick() {
        closeAdminAccountMenu(menu);
        authController?.logout?.();
      },
    }, [
      icon("fa-right-from-bracket"),
      element("span", { text: "Sair" }),
    ]),
  ]);

  menu.append(trigger, dropdown);
  document.addEventListener?.("click", () => closeAdminAccountMenu(menu));
  document.addEventListener?.("keydown", (event) => {
    if (event.key === "Escape") {
      closeAdminAccountMenu(menu);
    }
  });

  return menu;
}

function toggleAdminAccountMenu(menu) {
  const isOpen = !menu.classList.contains("account-menu-open");
  setAdminAccountMenuOpen(menu, isOpen);
}

function closeAdminAccountMenu(menu) {
  setAdminAccountMenuOpen(menu, false);
}

function setAdminAccountMenuOpen(menu, isOpen) {
  const dropdown = menu.querySelector("[data-account-dropdown]");
  menu.classList.toggle("account-menu-open", isOpen);
  menu.querySelector("[data-account-trigger]")?.setAttribute("aria-expanded", String(isOpen));
  dropdown?.classList.toggle("admin-account-dropdown-open", isOpen);

  if (!dropdown?.style) {
    return;
  }

  dropdown.style.opacity = isOpen ? "1" : "";
  dropdown.style.pointerEvents = isOpen ? "auto" : "";
  dropdown.style.transform = isOpen ? "translateY(0) scale(1)" : "";
  dropdown.style.visibility = isOpen ? "visible" : "";
}

function initializeSidebarToggle(shell) {
  const button = shell.querySelector(".admin-menu-button");
  if (!button) {
    return;
  }

  function syncButtonState() {
    const isCollapsed = shell.classList.contains(SIDEBAR_COLLAPSED_CLASS);
    button.setAttribute("aria-expanded", String(!isCollapsed));
    button.setAttribute("aria-label", isCollapsed ? "Expandir menu administrativo" : "Recolher menu administrativo");
    button.setAttribute("title", isCollapsed ? "Expandir menu" : "Recolher menu");
  }

  button.addEventListener("click", () => {
    shell.classList.toggle(SIDEBAR_COLLAPSED_CLASS);
    syncButtonState();
  });
  syncButtonState();
}

function renderPrimaryAction() {
  return element("a", { className: "button admin-primary-action", href: "admin-animais.html#novo" }, [
    icon("fa-plus"),
    element("span", { text: "Novo animal" }),
  ]);
}

function renderNotificationButton(iconName, count, label, href) {
  return element("a", { className: "admin-notification-button", href, "aria-label": label }, [
    icon(iconName),
    element("span", { className: "admin-notification-count", text: count }),
  ]);
}

function renderNavLink(item, active) {
  const isActive = active === item.id || item.activeIds?.includes(active);
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

function icon(name, className = "") {
  return element("i", {
    className: ["fa-solid", name, "library-icon", className].filter(Boolean).join(" "),
    "aria-hidden": "true",
  });
}
