export function formatLabel(format) {
  if (format === "expanded") return "GILDED GEMS";
  if (format === "ancient") return "ANCIENT";
  if (format === "minted") return "MINTED";
  return "CORE";
}

export function updateFormatButtons(state, elements) {
  const isCore =
    !state.format || !["expanded", "ancient", "minted"].includes(state.format);
  const isExpanded = state.format === "expanded";
  const isAncient = state.format === "ancient";
  const isMinted = state.format === "minted";
  const toggle = (el, active) => {
    if (!el) return;
    el.classList.toggle("active", active);
    el.setAttribute("aria-pressed", active ? "true" : "false");
  };
  toggle(elements.formatCore, isCore);
  toggle(elements.formatExpanded, isExpanded);
  toggle(elements.formatAncient, isAncient);
  toggle(elements.formatMinted, isMinted);
  toggle(elements.hostFormatCore, isCore);
  toggle(elements.hostFormatExpanded, isExpanded);
  toggle(elements.hostFormatAncient, isAncient);
  toggle(elements.hostFormatMinted, isMinted);
}
