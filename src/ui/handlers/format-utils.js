const SELECTABLE_FORMATS = ["core", "expanded", "ancient", "mystic", "foundry"];

export function formatLabel(format) {
  if (format === "expanded") return "GILDED GEMS";
  if (format === "ancient") return "ANCIENT";
  if (format === "mystic") return "MYSTIC";
  if (format === "foundry") return "FOUNDRY";
  return "CORE";
}

function toggleButton(el, active, disabled = false) {
  if (!el) return;
  el.classList.toggle("active", active);
  el.setAttribute("aria-pressed", active ? "true" : "false");
  el.disabled = disabled;
}

export function updateFormatButtons(state, elements) {
  const format = SELECTABLE_FORMATS.includes(state.format) ? state.format : "core";
  const isCore = format === "core";
  const isExpanded = format === "expanded";
  const isAncient = format === "ancient";
  const isMystic = format === "mystic";
  const isFoundry = format === "foundry";

  toggleButton(elements.formatCore, isCore);
  toggleButton(elements.formatExpanded, isExpanded);
  toggleButton(elements.formatAncient, isAncient);
  toggleButton(elements.formatMystic, isMystic);
  toggleButton(elements.formatFoundry, isFoundry);
  toggleButton(elements.hostFormatCore, isCore);
  toggleButton(elements.hostFormatExpanded, isExpanded);
  toggleButton(elements.hostFormatAncient, isAncient);
  toggleButton(elements.hostFormatMystic, isMystic);
  toggleButton(elements.hostFormatFoundry, isFoundry);
}

export function updateCpuFormatButtons(state, elements) {
  const playerFormat = SELECTABLE_FORMATS.includes(state.format) ? state.format : "core";
  const selection = state.cpu?.opponentFormatSelection ?? state.cpu?.opponentFormat ?? null;
  const cpuButtons = [
    ["core", elements.cpuFormatCore],
    ["expanded", elements.cpuFormatExpanded],
    ["ancient", elements.cpuFormatAncient],
    ["mystic", elements.cpuFormatMystic],
    ["foundry", elements.cpuFormatFoundry],
  ];

  cpuButtons.forEach(([format, button]) => {
    const disabled = format === playerFormat;
    toggleButton(button, selection === format && !disabled, disabled);
    if (!button) return;
    if (disabled) {
      button.title = "CPU deck must be different from your deck.";
    } else {
      button.removeAttribute("title");
    }
  });

  toggleButton(elements.cpuFormatRandom, selection === "random_different");
}
