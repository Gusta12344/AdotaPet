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
  const header = element("div", { className: "animal-card-header" }, [
    element("div", {}, [
      element("h3", { text: animal.nome }),
      element("p", { className: "muted", text: `${formatEnum(animal.especie)} - ${formatEnum(animal.porte)} - ${formatAge(animal.idadeMeses)}` }),
    ]),
  ]);

  if (score !== null && score !== undefined) {
    header.append(element("div", { className: "score", text: `${score}%` }));
  }

  card.append(header);

  if (animal.descricao && !compact) {
    card.append(element("p", { className: "animal-description", text: animal.descricao }));
  }

  card.append(element("dl", { className: "animal-facts" }, [
    fact("Energia", formatEnum(animal.nivelEnergia)),
    fact("Criancas", formatBoolean(animal.bomComCriancas)),
    fact("Outros animais", formatBoolean(animal.bomComAnimais)),
    fact("Precisa de espaco", formatBoolean(animal.precisaEspaco)),
  ]));

  const actions = element("div", { className: "card-actions" }, [
    element("a", { className: "button button-secondary", href: `animal.html?id=${animal.id}`, text: "Ver detalhes" }),
  ]);

  if (score !== null && score !== undefined) {
    actions.prepend(element("span", { className: "score-label", text: getScoreLabel(score) }));
  }

  card.append(actions);
  return card;
}

function fact(label, value) {
  return element("div", { className: "fact" }, [
    element("dt", { text: label }),
    element("dd", { text: value }),
  ]);
}
