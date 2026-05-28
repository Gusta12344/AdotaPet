import { chooseAnimalImageUrl, fallbackAnimalImageUrl } from "./images.js";

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

export function renderAnimalCard({ animal, score = null, compact = false }) {
  const card = element("article", { className: compact ? "animal-card animal-card-compact" : "animal-card" });
  const displayScore = score ?? getAnimalDisplayScore(animal);
  const media = element("div", { className: "animal-card-media" }, [
    renderAnimalImage(animal, { className: "animal-card-image" }),
  ]);

  media.append(element("div", { className: "score" }, [
    element("span", { text: "Compatibilidade" }),
    element("strong", { text: `${displayScore}%` }),
  ]));

  media.append(element("button", {
    className: "favorite-toggle",
    type: "button",
    "aria-label": `Salvar ${animal.nome}`,
  }));

  if (animal.status) {
    media.append(element("span", { className: "status-tag", text: formatEnum(animal.status) }));
  }

  card.append(media);

  const header = element("div", { className: "animal-card-header" }, [
    element("div", {}, [
      element("h3", { text: animal.nome }),
      element("p", { className: "muted", text: `${formatEnum(animal.especie)} - ${formatEnum(animal.porte)} - ${formatAge(animal.idadeMeses)}` }),
    ]),
    element("div", { className: "animal-tags" }, [
      element("span", { text: formatEnum(animal.porte) }),
      element("span", { text: formatAge(animal.idadeMeses) }),
    ]),
  ]);

  const body = element("div", { className: "animal-card-body" }, [
    header,
  ]);

  if (animal.descricao && !compact) {
    body.append(element("p", { className: "animal-description", text: animal.descricao }));
  }

  body.append(element("dl", { className: "animal-facts" }, [
    fact("Castracao", animal.castrado === false ? "Nao" : "Sim"),
    fact("Vacinado", animal.vacinado === false ? "Nao" : "Sim"),
    fact("Vermifugado", animal.vermifugado === false ? "Nao" : "Sim"),
    fact("Energia", formatEnum(animal.nivelEnergia)),
    fact("Sociavel", animal.bomComAnimais ? "Muito" : "Moderado"),
    fact("Ambiente ideal", animal.precisaEspaco ? "Casa com quintal" : "Apartamento"),
  ]));

  const actions = element("div", { className: "card-actions" }, [
    element("a", { className: "button button-card", href: `animal.html?id=${animal.id}`, text: "Ver detalhes" }),
    element("button", { className: "button button-save", type: "button", text: "Salvar" }),
  ]);

  if (score !== null && score !== undefined) {
    actions.prepend(element("span", { className: "score-label", text: getScoreLabel(score) }));
  }

  body.append(actions);
  card.append(body);
  return card;
}

export function renderAnimalImage(animal, { className = "animal-image" } = {}) {
  const image = element("img", {
    className,
    src: fallbackAnimalImageUrl(animal),
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

function getAnimalDisplayScore(animal) {
  const base = Number.isFinite(Number(animal?.id)) ? Number(animal.id) : String(animal?.nome || "").length;
  const score = 78 + ((base * 7) % 17);
  return Math.min(score, 94);
}
