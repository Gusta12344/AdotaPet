import { createAdminShell, getAdminTheme, setAdminTheme } from "../admin-shell.js";
import { adminCard } from "../admin-components.js";
import { element, setFeedback } from "../ui.js";

const darkModeToggle = element("input", {
  type: "checkbox",
  name: "darkMode",
  "data-admin-dark-mode": "",
});
darkModeToggle.checked = getAdminTheme() === "dark";

const content = element("main", { className: "admin-page admin-two-column" }, [
  adminCard("Aparencia", [
    settingRow("Modo escuro da area administrativa", "Mantem apenas as telas administrativas com tema escuro.", darkModeToggle),
  ]),
  adminCard("Preferencias operacionais", [
    settingRow("Atualizacao manual", "Os paineis carregam dados quando a pagina abre ou quando voce interage.", element("input", { type: "checkbox", checked: "checked", disabled: "disabled" })),
    settingRow("Relatorio padrao em CSV", "Formato leve para planilhas e auditoria.", element("input", { type: "checkbox", checked: "checked", disabled: "disabled" })),
  ]),
]);
const shell = createAdminShell({
  active: "settings",
  title: "Configuracoes",
  subtitle: "Ajustes locais da experiencia administrativa.",
  content,
});

if (shell) {
  darkModeToggle.addEventListener("change", () => {
    const theme = setAdminTheme(darkModeToggle.checked ? "dark" : "light");
    setFeedback(shell.feedback, theme === "dark" ? "Modo escuro ativado." : "Modo claro ativado.", "success");
  });
}

function settingRow(title, description, control) {
  return element("label", { className: "admin-setting-row" }, [
    element("span", {}, [
      element("strong", { text: title }),
      element("small", { text: description }),
    ]),
    control,
  ]);
}
