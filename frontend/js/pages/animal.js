import { api } from "../api.js";
import { showAdoptionSuccessModal } from "../adoption-success-modal.js";
import { galleryUrls } from "../animal-gallery.js";
import { buildSolicitacaoPayload } from "../forms.js";
import { applyFavoriteButtonState, loadFavoriteIds, toggleFavorite } from "../favorites.js";
import { createHeaderAuthController } from "../header-auth.js";
import { createIcon } from "../icons.js";
import { readAuthenticatedAdotanteId } from "../state.js";
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
          detailIcon("paw"),
          element("span", { text: statusText(animal.status) }),
        ]),
        element("div", { className: "detail-thumb-strip", "aria-label": "Galeria do animal" }, thumbnails),
      ]),
      element("a", { className: "detail-back-link", href: "index.html" }, [
        detailIcon("arrow-left"),
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
      iconName ? detailIcon(iconName) : null,
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
    iconName ? element("span", { className: "detail-row-icon", "aria-hidden": "true" }, [detailIcon(iconName)]) : null,
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
      detailIcon("shield"),
      element("span", { text: "Protetor" }),
    ]),
    element("div", { className: "detail-protector-card" }, [
      element("span", { className: "detail-protector-logo", "aria-hidden": "true" }, [
        detailIcon("heart-paw"),
      ]),
      element("div", {}, [
        element("strong", { text: animal.protetorNome || "Instituto Amor de Patas" }),
        element("span", { text: animal.protetorLocal || animal.protetorCidade || "Sao Paulo - SP" }),
        element("a", { href: "recomendados.html" }, [
          "Ver perfil do protetor",
          detailIcon("chevron-right"),
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
  button.append(createIcon("heart", { className: "detail-heart" }));
  applyFavoriteButtonState(button, animal, favoriteIds.has(Number(animal.id)), { baseClass: "detail-favorite-toggle" });
  button.addEventListener("click", () => handleFavoriteToggle(button, animal));
  return button;
}

function adoptIcon() {
  const wrapper = element("span", { className: "detail-submit-icon", "aria-hidden": "true" });
  wrapper.append(detailIcon("heart-paw"));
  return wrapper;
}

function detailIcon(name) {
  return createIcon(name, { className: `detail-icon detail-icon-${name}` });
}

function energyMeter(level) {
  const activeCount = level === "baixo" ? 2 : level === "medio" ? 4 : 5;
  const meter = element("span", { className: "energy-meter", "aria-label": formatEnum(level) });
  for (let index = 0; index < 5; index += 1) {
    const bolt = detailIcon("bolt");
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
  action.disabled = true;

  try {
    const payload = buildSolicitacaoPayload(animalId, adotanteId);
    const solicitacao = await api.post("/adocoes", payload);
    clearNode(action);
    action.append(adoptIcon(), "Solicitação enviada");
    setFeedback(feedback, "");
    showAdoptionSuccessModal(solicitacao);
  } catch (error) {
    action.disabled = loadedAnimal?.status === "adotado";
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
