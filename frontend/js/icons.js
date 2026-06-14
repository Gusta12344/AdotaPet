const ICON_CLASSES = {
  "arrow-left": "fa-solid fa-arrow-left",
  arrowLeft: "fa-solid fa-arrow-left",
  "arrow-right": "fa-solid fa-arrow-right",
  bell: "fa-solid fa-bell",
  bolt: "fa-solid fa-bolt",
  building: "fa-solid fa-building",
  calendar: "fa-solid fa-calendar-days",
  cat: "fa-solid fa-cat",
  check: "fa-solid fa-check",
  "chevron-down": "fa-solid fa-chevron-down",
  "chevron-right": "fa-solid fa-chevron-right",
  chip: "fa-solid fa-microchip",
  clipboard: "fa-solid fa-clipboard-list",
  dog: "fa-solid fa-dog",
  energy: "fa-solid fa-bolt",
  filter: "fa-solid fa-filter",
  gender: "fa-solid fa-venus-mars",
  github: "fa-brands fa-github",
  heart: "fa-solid fa-heart",
  "heart-paw": "fa-solid fa-hand-holding-heart",
  home: "fa-solid fa-house",
  mail: "fa-solid fa-envelope",
  paw: "fa-solid fa-paw",
  pen: "fa-solid fa-pen",
  phone: "fa-solid fa-phone",
  pin: "fa-solid fa-location-dot",
  ruler: "fa-solid fa-ruler",
  scissors: "fa-solid fa-scissors",
  search: "fa-solid fa-magnifying-glass",
  shield: "fa-solid fa-shield-halved",
  "sign-out": "fa-solid fa-right-from-bracket",
  syringe: "fa-solid fa-syringe",
  user: "fa-solid fa-user",
  "user-plus": "fa-solid fa-user-plus",
  users: "fa-solid fa-users",
  warning: "fa-solid fa-triangle-exclamation",
  weight: "fa-solid fa-weight-scale",
  worm: "fa-solid fa-bug",
  x: "fa-solid fa-xmark",
};

export function createIcon(name, { className = "", documentRef = document } = {}) {
  const node = documentRef.createElement("i");
  node.className = [ICON_CLASSES[name] || "fa-solid fa-circle", "library-icon", className]
    .filter(Boolean)
    .join(" ");
  node.setAttribute("aria-hidden", "true");
  return node;
}
