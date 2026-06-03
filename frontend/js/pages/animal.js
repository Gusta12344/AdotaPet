import { api } from "../api.js";
import { galleryUrls } from "../animal-gallery.js";
import { buildSolicitacaoPayload } from "../forms.js";
import { applyFavoriteButtonState, loadFavoriteIds, toggleFavorite } from "../favorites.js";
import { createHeaderAuthController } from "../header-auth.js";
import { readAuthenticatedAdotanteId, saveLastSolicitacao } from "../state.js";
import { $, clearNode, element, formatAge, formatBoolean, formatEnum, renderAnimalImage, setFeedback } from "../ui.js";

const detail = $("#animal-detail");
const feedback = $("#animal-feedback");
const action = $("#solicitar-adocao");
const actionsHost = $(".animal-detail-actions");
const headerAuth = createHeaderAuthController({
  onLogin(user) {
    if (user?.tipo === "adotante" && loadedAnimal) {
      syncFavoriteIds()
        .then(() => renderDetail(loadedAnimal))
        .catch((error) => setFeedback(feedback, error.message, "error"));
    }
  },
});
const params = new URLSearchParams(window.location.search);
const animalId = Number.parseInt(params.get("id"), 10);

let loadedAnimal = null;
let favoriteIds = new Set();

function renderDetail(animal) {
  clearNode(detail);
  const convivencia = normalizeConvivencia(animal);

  const actionBar = element("div", { className: "detail-action-bar" });
  if (action) {
    action.className = "button button-coral detail-submit";
    action.disabled = animal.status === "adotado";
    clearNode(action);
    action.append(adoptIcon(), animal.status === "adotado" ? "Animal ja adotado" : "Solicitar adocao");
    actionBar.append(action);
  }
  if (feedback) {
    actionBar.append(feedback);
  }
  if (actionsHost) {
    actionsHost.hidden = true;
  }

  const gallery = galleryUrls(animal);
  const heroImage = renderAnimalImage(animalForImage(animal, gallery[0]), { className: "detail-hero-image" });
  const thumbnails = gallery.map((url, index) => (
    detailThumb(animal, url, index === 0, (button, image) => {
      for (const thumb of thumbnails) {
        thumb.classList.remove("detail-thumb-active");
        thumb.setAttribute("aria-pressed", "false");
      }
      button.classList.add("detail-thumb-active");
      button.setAttribute("aria-pressed", "true");
      heroImage.src = image.currentSrc || image.src;
    })
  ));

  detail.append(element("section", { className: "animal-detail-shell" }, [
    element("aside", { className: "detail-photo-panel" }, [
      element("figure", { className: "detail-photo-frame" }, [
        heroImage,
        element("span", { className: "detail-status-pill" }, [
          icon("paw"),
          element("span", { text: statusText(animal.status) }),
        ]),
        element("div", { className: "detail-thumb-strip", "aria-label": "Galeria do animal" }, thumbnails),
      ]),
      element("a", { className: "detail-back-link", href: "index.html" }, [
        icon("arrow-left"),
        "Voltar",
      ]),
    ]),
    element("article", { className: "detail-info-panel" }, [
      element("p", { className: "detail-kicker", text: `Conheca ${animal.nome}` }),
      element("div", { className: "detail-name-row" }, [
        element("h1", { className: "detail-animal-name", text: animal.nome }),
        heartIcon(animal),
      ]),
      element("p", {
        className: "detail-description",
        text: animal.descricao || "Animal cadastrado no AdotaPet, pronto para encontrar uma familia compativel.",
      }),
      element("div", { className: "detail-divider", "aria-hidden": "true" }),
      element("div", { className: "detail-info-grid" }, [
        detailSection("Dados principais", [
          detailRow("Especie", speciesLabel(animal.especie), { iconName: "clipboard" }),
          detailRow("Raca", breedLabel(animal.raca), { iconName: "paw" }),
          detailRow("Idade", formatAge(animal.idadeMeses), { iconName: "calendar" }),
          detailRow("Porte", formatEnum(animal.porte), { iconName: "ruler" }),
          detailRow("Peso", weightLabel(animal), { iconName: "weight" }),
          detailRow("Sexo", sexLabel(animal), { iconName: "gender" }),
          detailRow("Data de resgate", formatDate(animal.dataResgate || animal.dataCadastro), { iconName: "calendar" }),
          detailRow("Vermifugado", yesNo(animal.vermifugado !== false), { iconName: "shield" }),
          detailRow("Vacinado", yesNo(animal.vacinado !== false), { iconName: "syringe" }),
          detailRow("Castrado", yesNo(animal.castrado !== false), { iconName: "scissors" }),
          detailRow("Microchip", yesNo(animal.microchip !== false), { iconName: "chip" }),
        ], "clipboard", "main"),
        element("div", { className: "detail-side-stack" }, [
          detailSection("Convivencia", [
            detailRow("Criancas", formatBoolean(convivencia.criancas), { tone: convivencia.criancas ? "success" : "danger" }),
            detailRow("Caes", formatBoolean(convivencia.caes), { tone: convivencia.caes ? "success" : "danger" }),
            detailRow("Gatos", formatBoolean(convivencia.gatos), { tone: convivencia.gatos ? "success" : "danger" }),
          ], "users"),
          detailSection("Cuidados", [
            detailRow("Nivel de energia", energyMeter(animal.nivelEnergia)),
            detailRow("Necess. de exercicios", exerciseLabel(animal.nivelEnergia)),
            detailRow("Tipo de ambiente ideal", animal.precisaEspaco ? "Casa com quintal" : "Apartamento"),
          ], "heart"),
          protectorSection(animal),
        ]),
      ]),
      actionBar,
    ]),
  ]));
}

function normalizeConvivencia(animal) {
  const bomComAnimais = Boolean(animal?.bomComAnimais);
  return {
    criancas: Boolean(animal?.bomComCriancas),
    caes: Boolean(animal?.bomComCaes ?? bomComAnimais),
    gatos: Boolean(animal?.bomComGatos ?? bomComAnimais),
  };
}

function detailSection(title, rows, iconName = "", variant = "") {
  return element("section", { className: `detail-data-section${variant ? ` detail-data-section-${variant}` : ""}` }, [
    element("h2", {}, [
      iconName ? icon(iconName) : null,
      element("span", { text: title }),
    ]),
    element("dl", { className: "detail-data-list" }, rows),
  ]);
}

function detailRow(label, value, { tone = "", iconName = "" } = {}) {
  const valueNode = element("dd", { className: tone ? `detail-value-${tone}` : "" });
  if (value instanceof Node) {
    valueNode.append(value);
  } else {
    valueNode.textContent = value;
  }

  return element("div", { className: iconName ? "detail-data-row detail-data-row-icon" : "detail-data-row" }, [
    iconName ? element("span", { className: "detail-row-icon", "aria-hidden": "true" }, [icon(iconName)]) : null,
    element("dt", { text: label }),
    valueNode,
  ]);
}

function detailThumb(animal, url, active = false, onSelect = () => {}) {
  const image = renderAnimalImage(animalForImage(animal, url), { className: "detail-thumb-image" });
  const button = element("button", {
    className: active ? "detail-thumb detail-thumb-active" : "detail-thumb",
    type: "button",
    "aria-pressed": active ? "true" : "false",
    "aria-label": active ? "Foto principal selecionada" : "Foto do animal",
  }, [
    image,
  ]);

  button.addEventListener("click", () => onSelect(button, image));
  return button;
}

function protectorSection(animal) {
  return element("section", { className: "detail-data-section detail-protector-section" }, [
    element("h2", {}, [
      icon("shield"),
      element("span", { text: "Protetor" }),
    ]),
    element("div", { className: "detail-protector-card" }, [
      element("span", { className: "detail-protector-logo", "aria-hidden": "true" }, [
        icon("heart-paw"),
      ]),
      element("div", {}, [
        element("strong", { text: animal.protetorNome || "Instituto Amor de Patas" }),
        element("span", { text: animal.protetorLocal || animal.protetorCidade || "Sao Paulo - SP" }),
        element("a", { href: "recomendados.html" }, [
          "Ver perfil do protetor",
          icon("chevron-right"),
        ]),
      ]),
    ]),
  ]);
}

function heartIcon(animal) {
  const button = element("button", {
    className: "detail-favorite-toggle",
    type: "button",
    dataset: { animalId: animal.id },
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "detail-heart");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z");
  svg.append(path);
  button.append(svg);
  applyFavoriteButtonState(button, animal, favoriteIds.has(Number(animal.id)), { baseClass: "detail-favorite-toggle" });
  button.addEventListener("click", () => handleFavoriteToggle(button, animal));
  return button;
}

function adoptIcon() {
  const wrapper = element("span", { className: "detail-submit-icon", "aria-hidden": "true" });
  wrapper.append(icon("heart-paw"));
  return wrapper;
}

function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `detail-icon detail-icon-${name}`);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  const pathSets = {
    "arrow-left": ["M19 12H5", "m7 7-7-7 7-7"],
    calendar: ["M8 2v4", "M16 2v4", "M3 9h18", "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"],
    "chevron-right": ["m9 18 6-6-6-6"],
    chip: ["M8 2v3", "M16 2v3", "M8 19v3", "M16 19v3", "M2 8h3", "M2 16h3", "M19 8h3", "M19 16h3", "M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z", "M9 9h6v6H9Z"],
    clipboard: ["M9 4h6", "M10 2h4a2 2 0 0 1 2 2v2H8V4a2 2 0 0 1 2-2Z", "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2", "M8 12h8", "M8 16h6"],
    gender: ["M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z", "M12 13v8", "M9 18h6"],
    heart: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"],
    ruler: ["M4 19V5h16v14H4Z", "M8 5v4", "M12 5v3", "M16 5v4"],
    scissors: ["M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M8 7l12 10", "M8 17 20 7"],
    shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", "m9.5 12 1.8 1.8L15 10"],
    syringe: ["M18 2 22 6", "M17 7l-9 9", "M14 4l6 6", "M6 18l-4 4", "M5 14l5 5"],
    users: ["M16 19a4 4 0 0 0-8 0", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M22 19a4 4 0 0 0-5-3.9", "M17 3.5a3 3 0 0 1 0 5.8"],
    weight: ["M6 8h12l1.6 12H4.4L6 8Z", "M9 8a3 3 0 0 1 6 0"],
  };

  if (name === "paw" || name === "heart-paw") {
    appendPaw(svg);
    if (name === "heart-paw") {
      appendPath(svg, "M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z");
    }
    return svg;
  }

  if (name === "bolt") {
    appendPath(svg, "M13 2 4 14h7l-1 8 9-13h-7l1-7Z");
    return svg;
  }

  for (const d of pathSets[name] || pathSets.heart) {
    appendPath(svg, d);
  }

  return svg;
}

function appendPaw(svg) {
  appendCircle(svg, 5.5, 10.5, 1.7);
  appendCircle(svg, 9.3, 6.6, 1.7);
  appendCircle(svg, 14.7, 6.6, 1.7);
  appendCircle(svg, 18.5, 10.5, 1.7);
  appendPath(svg, "M7 17c1.8-3.2 8.2-3.2 10 0 1 1.8-.3 3.5-2.2 2.7a7.1 7.1 0 0 0-5.6 0C7.3 20.5 6 18.8 7 17Z");
}

function appendCircle(svg, cx, cy, r) {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", r);
  svg.append(circle);
}

function appendPath(svg, d) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.append(path);
}

function energyMeter(level) {
  const activeCount = level === "baixo" ? 2 : level === "medio" ? 4 : 5;
  const meter = element("span", { className: "energy-meter", "aria-label": formatEnum(level) });
  for (let index = 0; index < 5; index += 1) {
    const bolt = icon("bolt");
    if (index >= activeCount) {
      bolt.classList.add("energy-muted");
    }
    meter.append(bolt);
  }
  return meter;
}

function animalForImage(animal, url) {
  return url ? { ...animal, imagemUrls: [url] } : animal;
}

function speciesLabel(value) {
  if (value === "cao") {
    return "Cachorro";
  }
  if (value === "gato") {
    return "Gato";
  }
  return formatEnum(value);
}

function breedLabel(value) {
  const cleanValue = String(value || "SRD").trim();
  return cleanValue.toLowerCase() === "srd" ? "SRD (Vira-lata)" : cleanValue;
}

function sexLabel(animal) {
  return animal.sexo ? formatEnum(animal.sexo) : "Femea";
}

function weightLabel(animal) {
  const rawWeight = animal.pesoKg ?? animal.peso;
  const numericWeight = Number(rawWeight);
  if (Number.isFinite(numericWeight) && numericWeight > 0) {
    return `${numericWeight} kg`;
  }

  if (animal.porte === "pequeno") {
    return "8 kg";
  }
  if (animal.porte === "grande") {
    return "28 kg";
  }
  return "18 kg";
}

function yesNo(value) {
  return value ? "Sim" : "Nao";
}

function exerciseLabel(level) {
  if (level === "baixo") {
    return "Baixa";
  }
  if (level === "medio") {
    return "Media";
  }
  return "Alta";
}

function formatDate(value) {
  if (!value) {
    return "12/03/2023";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "12/03/2023";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function statusText(status) {
  return status === "disponivel" ? "Disponivel para adocao" : formatEnum(status);
}

async function loadAnimal() {
  if (!Number.isInteger(animalId) || animalId <= 0) {
    if (actionsHost) {
      actionsHost.hidden = false;
    }
    setFeedback(feedback, "Animal invalido.", "error");
    if (action) {
      action.disabled = true;
    }
    return;
  }

  setFeedback(feedback, "Carregando animal...");

  try {
    loadedAnimal = await api.get(`/animais/${animalId}`);
    await syncFavoriteIds();
    renderDetail(loadedAnimal);
    setFeedback(feedback, "");
  } catch (error) {
    if (actionsHost) {
      actionsHost.hidden = false;
    }
    setFeedback(feedback, error.message, "error");
    if (action) {
      action.disabled = true;
    }
  }
}

action?.addEventListener("click", async () => {
  const adotanteId = readCurrentAdotanteId();
  if (!adotanteId) {
    setFeedback(feedback, "Entre como adotante para solicitar a adocao.", "error");
    headerAuth.openLoginModal();
    return;
  }

  setFeedback(feedback, "Registrando solicitacao...");

  try {
    const payload = buildSolicitacaoPayload(animalId, adotanteId);
    const solicitacao = await api.post("/adocoes", payload);
    saveLastSolicitacao(sessionStorage, solicitacao);
    window.location.href = `confirmacao.html?solicitacaoId=${solicitacao.id}`;
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
});

async function syncFavoriteIds() {
  const adotanteId = readCurrentAdotanteId();
  favoriteIds = adotanteId ? await loadFavoriteIds(adotanteId) : new Set();
}

async function handleFavoriteToggle(button, animal) {
  const adotanteId = readCurrentAdotanteId();
  if (!adotanteId) {
    setFeedback(feedback, "Entre como adotante para salvar favoritos.", "error");
    headerAuth.openLoginModal();
    return;
  }

  button.disabled = true;
  try {
    const isFavorite = await toggleFavorite(animal, { adotanteId, favoriteIds });
    applyFavoriteButtonState(button, animal, isFavorite, { baseClass: "detail-favorite-toggle" });
    setFeedback(feedback, isFavorite ? "Animal adicionado aos favoritos." : "Animal removido dos favoritos.");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function readCurrentAdotanteId() {
  return readAuthenticatedAdotanteId();
}

loadAnimal();
