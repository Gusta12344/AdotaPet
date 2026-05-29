export function enhanceSelectDropdowns(root = document, { documentRef = document } = {}) {
  const fields = Array.from(root?.querySelectorAll?.(".filter-field") || []);
  const dropdowns = [];
  for (const field of fields) {
    const dropdown = enhanceSelectDropdown(field, {
      documentRef,
      onOpen: () => {
        for (const activeDropdown of dropdowns) {
          activeDropdown.close();
        }
      },
    });
    if (dropdown) {
      dropdowns.push(dropdown);
    }
  }

  if (documentRef?.addEventListener) {
    documentRef.addEventListener("click", (event) => {
      for (const dropdown of dropdowns) {
        if (!dropdown.field.contains?.(event.target)) {
          dropdown.close();
        }
      }
    });
  }

  if (root?.addEventListener) {
    root.addEventListener("reset", () => {
      const setTimer = globalThis.window?.setTimeout || globalThis.setTimeout;
      setTimer(() => {
        for (const dropdown of dropdowns) {
          dropdown.syncLabel();
          dropdown.close();
        }
      }, 0);
    });
  }

  return dropdowns;
}

export function enhanceSelectDropdown(field, { documentRef = document, onOpen = null } = {}) {
  const select = findNativeSelect(field);
  if (!select || String(field.className || "").includes("filter-field-enhanced")) {
    return null;
  }

  addClass(field, "filter-field-enhanced");
  addClass(select, "filter-field-native");

  const button = documentRef.createElement("button");
  button.type = "button";
  button.className = "filter-select-trigger";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const menu = documentRef.createElement("div");
  menu.className = "filter-select-menu";
  menu.setAttribute("role", "listbox");

  const options = Array.from(select.options || []).map((option) => {
    const optionButton = documentRef.createElement("button");
    optionButton.type = "button";
    optionButton.className = "filter-select-option";
    optionButton.textContent = option.textContent || option.label || option.value;
    optionButton.setAttribute("role", "option");
    optionButton.setAttribute("data-value", option.value);
    optionButton.addEventListener("click", (event) => {
      event.stopPropagation?.();
      select.value = option.value;
      syncLabel();
      dispatchNativeChange(select);
      close();
    });
    menu.append(optionButton);
    return optionButton;
  });

  field.append(button, menu);
  syncLabel();

  button.addEventListener("click", (event) => {
    event.stopPropagation?.();
    if (String(field.className || "").includes("filter-field-open")) {
      close();
    } else {
      open();
    }
  });

  button.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });

  select.addEventListener("change", syncLabel);

  function open() {
    onOpen?.();
    addClass(field, "filter-field-open");
    button.setAttribute("aria-expanded", "true");
  }

  function close() {
    removeClass(field, "filter-field-open");
    button.setAttribute("aria-expanded", "false");
  }

  function syncLabel() {
    const selected = Array.from(select.options || []).find((option) => option.value === select.value)
      || select.options?.[0];
    const label = selected?.textContent || selected?.label || selected?.value || "";
    button.textContent = label;

    for (const optionButton of options) {
      const selectedOption = optionButton.getAttribute("data-value") === select.value;
      optionButton.setAttribute("aria-selected", selectedOption ? "true" : "false");
      toggleClass(optionButton, "filter-select-option-active", selectedOption);
    }
  }

  return {
    button,
    close,
    field,
    menu,
    open,
    options,
    select,
    syncLabel,
  };
}

function findNativeSelect(field) {
  if (typeof field.querySelector === "function") {
    return field.querySelector("select");
  }

  return Array.from(field.children || []).find((child) => String(child.tagName || "").toLowerCase() === "select");
}

function dispatchNativeChange(select) {
  if (typeof Event === "function") {
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  select.dispatchEvent({ type: "change" });
}

function addClass(node, className) {
  toggleClass(node, className, true);
}

function removeClass(node, className) {
  toggleClass(node, className, false);
}

function toggleClass(node, className, shouldHave) {
  if (node.classList) {
    node.classList.toggle(className, shouldHave);
    return;
  }

  const classes = new Set(String(node.className || "").split(/\s+/).filter(Boolean));
  if (shouldHave) {
    classes.add(className);
  } else {
    classes.delete(className);
  }
  node.className = Array.from(classes).join(" ");
}
