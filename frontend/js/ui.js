import { chooseAnimalImageUrl, fallbackAnimalImageUrl, getCachedAnimalImageUrl } from "./images.js";
import { applyFavoriteButtonState } from "./favorites.js";
import { createIcon } from "./icons.js";
import { showToast } from "./notifications.js";

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === false) {
      continue;
    }

    if (key === "className") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "dataset") {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        node.dataset[dataKey] = dataValue;
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) {
      continue;
    }
    node.append(child);
  }

  return node;
}

export function setFeedback(target, message, type = "info") {
  if (!target) {
    return;
  }

  target.textContent = message || "";
  target.className = message ? `feedback feedback-${type}` : "feedback";

  if (message && ["success", "error"].includes(type)) {
    showToast({
      title: type === "success" ? "Atualizacao realizada" : "Atencao",
      body: message,
      type,
    });
  }
}

export function formatEnum(value) {
  if (!value) {
    return "-";
  }

  return String(value)
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) {
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return lower;
    })
    .join(" ");
}

export function formatBoolean(value) {
  return value ? "Sim" : "Nao";
}

export function formatAge(months) {
  const total = Number(months);
  if (!Number.isFinite(total) || total < 0) {
    return "-";
  }

  if (total < 12) {
    return `${total} ${total === 1 ? "mes" : "meses"}`;
  }

  const years = Math.floor(total / 12);
  const rest = total % 12;
  const yearText = `${years} ${years === 1 ? "ano" : "anos"}`;
  if (rest === 0) {
    return yearText;
  }

  return `${yearText} e ${rest} ${rest === 1 ? "mes" : "meses"}`;
}

export function getScoreLabel(score) {
  if (score >= 80) {
    return "Alta compatibilidade";
  }
  if (score >= 50) {
    return "Compatibilidade moderada";
  }
  return "Compatibilidade baixa";
}

export function renderAnimalCard({ animal, score = null, compact = false, isFavorite = false, onFavoriteToggle = null }) {
  const hasExplicitScore = score !== null && score !== undefined;
  const isHomeCard = compact;
  const isRecommendationCard = hasExplicitScore && !isHomeCard;
  const displayScore = normalizeScore(score ?? getAnimalDisplayScore(animal));
  const convivencia = normalizeAnimalConvivencia(animal);
  const card = element("article", {
    className: [
      "animal-card",
      isRecommendationCard ? "animal-card-match" : "animal-card-premium",
      compact ? "animal-card-compact" : "",
      isHomeCard ? "animal-card-home" : "",
    ].filter(Boolean).join(" "),
  });
  const media = element("div", { className: "animal-card-media" }, [
    renderAnimalImage(animal, { className: "animal-card-image" }),
    element("span", { className: "animal-card-image-shade", "aria-hidden": "true" }),
  ]);

  if (!isRecommendationCard) {
    media.append(element("div", { className: "score" }, [
      element("strong", { text: `${displayScore}%` }),
      element("span", { text: "compatibilidade" }),
    ]));
  }

  let saveButton = null;
  const useIconOnlySave = isRecommendationCard || isHomeCard;
  const saveButtonClassName = (favorite) => [
    "button",
    "button-save",
    useIconOnlySave ? "button-save-icon-only" : "",
    favorite ? "button-save-active" : "",
  ].filter(Boolean).join(" ");
  const syncSaveButton = (favorite) => {
    if (!saveButton) {
      return;
    }
    saveButton.className = saveButtonClassName(favorite);
    const label = saveButton.querySelector?.("[data-save-label]");
    if (label) {
      label.textContent = favorite ? "Salvo" : "Salvar";
    }
    saveButton.setAttribute("aria-pressed", favorite ? "true" : "false");
    saveButton.setAttribute("aria-label", favorite ? `Remover ${animal.nome} dos favoritos` : `Salvar ${animal.nome} nos favoritos`);
    saveButton.setAttribute("title", favorite ? "Remover dos favoritos" : "Salvar nos favoritos");
  };
  const requestFavoriteToggle = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const result = onFavoriteToggle?.({ animal, button: favoriteButton });
    Promise.resolve(result).then((nextFavorite) => {
      if (typeof nextFavorite === "boolean") {
        syncSaveButton(nextFavorite);
      }
    });
  };
  const favoriteButton = element("button", {
    className: "favorite-toggle",
    type: "button",
    dataset: { animalId: animal.id },
  }, [
    createIcon("heart"),
  ]);
  applyFavoriteButtonState(favoriteButton, animal, isFavorite);
  favoriteButton.addEventListener("click", requestFavoriteToggle);
  media.append(favoriteButton);

  if (animal.status && !isRecommendationCard) {
    media.append(element("span", { className: "status-tag", text: formatStatus(animal.status) }));
  }

  card.append(media);

  const header = isRecommendationCard
    ? element("div", { className: "animal-card-header animal-card-match-header" }, [
      element("div", {}, [
        element("h3", { text: animal.nome }),
        element("p", { className: "muted", text: `${formatSpecies(animal.especie)} \u2022 ${formatAge(animal.idadeMeses)}` }),
      ]),
      element("span", { className: "animal-card-energy-badge", text: formatEnergy(animal.nivelEnergia) }),
    ])
    : element("div", { className: "animal-card-header" }, [
      element("div", { className: "animal-card-title-group" }, [
        element("h3", { text: animal.nome }),
        element("p", { className: "muted animal-card-meta", text: `${formatSpecies(animal.especie)} \u2022 ${formatEnum(animal.porte)}` }),
        element("p", { className: "muted animal-card-age", text: formatAge(animal.idadeMeses) }),
      ]),
      isHomeCard ? element("span", { className: "animal-size-tag" }, [
        animalIcon("paw"),
        element("span", { text: formatEnum(animal.porte) }),
      ]) : null,
    ]);

  const body = element("div", { className: "animal-card-body" }, [
    isRecommendationCard ? matchPanel(displayScore) : null,
    header,
    isRecommendationCard || isHomeCard ? null : animalChips(animal),
  ]);

  if (animal.descricao && (!compact || isHomeCard)) {
    body.append(element("p", { className: "animal-description", text: animal.descricao }));
  }

  if (isRecommendationCard) {
    body.append(matchReasonsPanel(animal, convivencia));
    body.append(matchChips(animal));
  } else {
    body.append(carePillGrid(animal, convivencia));
    body.append(environmentSummary(animal));
  }

  saveButton = element("button", {
    className: saveButtonClassName(isFavorite),
    type: "button",
    "aria-pressed": isFavorite ? "true" : "false",
    "aria-label": isFavorite ? `Remover ${animal.nome} dos favoritos` : `Salvar ${animal.nome} nos favoritos`,
    title: isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos",
  }, useIconOnlySave ? [
    element("span", { className: "button-save-icon", "aria-hidden": "true" }, [
      createIcon("heart"),
    ]),
  ] : [
    element("span", { className: "button-save-icon", "aria-hidden": "true" }, [
      createIcon("heart"),
    ]),
    element("span", { text: isFavorite ? "Salvo" : "Salvar", dataset: { saveLabel: true } }),
  ]);
  saveButton.addEventListener("click", requestFavoriteToggle);

  const actions = element("div", { className: "card-actions" }, [
    element("a", { className: "button button-card", href: `animal.html?id=${animal.id}`, text: "Ver detalhes" }),
    saveButton,
  ]);

  body.append(actions);
  card.append(body);
  return card;
}

export function renderAnimalImage(animal, { className = "animal-image" } = {}) {
  const image = element("img", {
    className,
    src: getCachedAnimalImageUrl(animal) || fallbackAnimalImageUrl(animal),
    alt: animal?.nome ? `Foto de ${animal.nome}` : "Foto do animal",
    loading: "lazy",
  });

  chooseAnimalImageUrl(animal).then((url) => {
    image.src = url;
  });

  image.addEventListener("error", () => {
    image.src = fallbackAnimalImageUrl(animal);
  }, { once: true });

  return image;
}

function fact(label, value) {
  return element("div", { className: "fact" }, [
    element("dt", { text: label }),
    element("dd", { text: value }),
  ]);
}

function animalChips(animal) {
  return element("div", { className: "animal-card-chips" }, [
    chip(formatEnum(animal.especie), "species"),
    chip(formatEnum(animal.porte), "size"),
    chip(formatAge(animal.idadeMeses), "age"),
  ]);
}

function matchChips(animal) {
  return element("div", { className: "animal-card-chips animal-card-match-chips" }, [
    chip(formatEnergy(animal.nivelEnergia), "energy"),
    chip(formatAge(animal.idadeMeses), "age"),
    chip(formatSpecies(animal.especie), "species"),
  ]);
}

function chip(text, variant = "") {
  return element("span", { className: variant ? `animal-chip animal-chip-${variant}` : "animal-chip", text });
}

function matchPanel(score) {
  const safeScore = normalizeScore(score);
  return element("section", { className: "match-panel match-score-panel", "aria-label": "Compatibilidade" }, [
    element("div", { className: "match-panel-header" }, [
      element("span", { text: getScoreLabel(safeScore) }),
      element("strong", { text: `${safeScore}%` }),
    ]),
    element("div", { className: "match-meter", "aria-hidden": "true" }, [
      element("span", { className: "match-meter-fill", style: `width: ${safeScore}%` }),
    ]),
  ]);
}

function matchReasonsPanel(animal, convivencia) {
  return element("section", { className: "match-reasons-panel", "aria-label": "Por que combina" }, [
    element("h4", { text: "Por que combina com voc\u00ea" }),
    element("ul", { className: "match-reasons" }, matchReasons(animal, convivencia).map((reason) => (
      element("li", {}, [
        element("span", { className: "match-reason-icon", "aria-hidden": "true" }, [
          animalIcon(reason.icon),
        ]),
        element("span", { className: "match-reason-text", text: reason.text }),
      ])
    ))),
  ]);
}

function matchReasons(animal, convivencia) {
  const coexistence = convivencia.caes
    ? "Convive bem com outros c\u00e3es"
    : convivencia.gatos
      ? "Convive bem com gatos"
      : "Perfil tranquilo para convivencia individual";

  return [
    {
      icon: "home",
      text: animal.precisaEspaco ? "Combina com casa com quintal" : "Mora em apartamento",
    },
    {
      icon: "energy",
      text: "N\u00edvel de energia compat\u00edvel",
    },
    {
      icon: "paw",
      text: coexistence,
    },
  ];
}

function animalIcon(name) {
  return createIcon(name, { className: `animal-icon animal-icon-${name}` });
}

function formatSpecies(value) {
  const species = String(value || "").toLowerCase();
  if (species === "cao" || species === "cachorro") {
    return "C\u00e3o";
  }
  if (species === "gato") {
    return "Gato";
  }
  return formatEnum(value);
}

function formatEnergy(value) {
  const energy = String(value || "").toLowerCase();
  if (energy === "baixo" || energy === "baixa") {
    return "Baixo";
  }
  if (energy === "medio" || energy === "media") {
    return "M\u00e9dio";
  }
  if (energy === "alto" || energy === "alta") {
    return "Alto";
  }
  return formatEnum(value);
}

function formatStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status === "disponivel") {
    return "Dispon\u00edvel";
  }
  if (status === "adotado") {
    return "Adotado";
  }
  return formatEnum(value);
}

function carePillGrid(animal, convivencia) {
  const items = [
    carePill("Castrado", animal.castrado === false ? "Nao" : "Sim", animal.castrado === false ? "neutral" : "success", "scissors"),
    carePill("Vacinado", animal.vacinado === false ? "Nao" : "Sim", animal.vacinado === false ? "neutral" : "success", "shield"),
    carePill("Vermifugado", animal.vermifugado === false ? "Nao" : "Sim", animal.vermifugado === false ? "neutral" : "success", "worm"),
    carePill("Energia", formatEnergy(animal.nivelEnergia), "info", "energy"),
    carePill("C\u00e3es", formatBoolean(convivencia.caes), convivencia.caes ? "success" : "neutral", "dog"),
    carePill("Gatos", formatBoolean(convivencia.gatos), convivencia.gatos ? "success" : "neutral", "cat"),
  ];

  return element("div", { className: "care-pill-grid" }, items);
}

function carePill(label, value, tone = "neutral", iconName = "paw") {
  return element("div", { className: `care-pill care-pill-${tone}` }, [
    element("span", { className: "care-pill-icon", "aria-hidden": "true" }, [
      animalIcon(iconName),
    ]),
    element("span", { className: "care-pill-label", text: label }),
    element("strong", { className: "care-pill-value", text: value }),
  ]);
}

function environmentSummary(animal) {
  return element("div", { className: "animal-environment" }, [
    element("span", { className: "animal-environment-icon", "aria-hidden": "true" }, [
      animalIcon("building"),
    ]),
    element("div", {}, [
      element("span", { text: "Ambiente ideal" }),
      element("strong", { text: animal.precisaEspaco ? "Casa com quintal" : "Apartamento" }),
    ]),
  ]);
}

function normalizeAnimalConvivencia(animal) {
  const bomComAnimais = Boolean(animal?.bomComAnimais);
  return {
    caes: Boolean(animal?.bomComCaes ?? bomComAnimais),
    gatos: Boolean(animal?.bomComGatos ?? bomComAnimais),
  };
}

function getAnimalDisplayScore(animal) {
  const base = Number.isFinite(Number(animal?.id)) ? Number(animal.id) : String(animal?.nome || "").length;
  const score = 78 + ((base * 7) % 17);
  return Math.min(score, 94);
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(Math.round(score), 100));
}
