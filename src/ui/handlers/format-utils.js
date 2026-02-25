export function formatLabel(format) {
  if (format === "expanded") return "GILDED GEMS";
  if (format === "ancient") return "ANCIENT";
  if (format === "mystic") return "MYSTIC";
  return "CORE";
}

export function updateFormatButtons(state, elements) {
  const isCore =
    !state.format || !["expanded", "ancient", "mystic"].includes(state.format);
  const isExpanded = state.format === "expanded";
  const isAncient = state.format === "ancient";
  const isMystic = state.format === "mystic";
  const toggle = (el, active) => {
    if (!el) return;
    el.classList.toggle("active", active);
    el.setAttribute("aria-pressed", active ? "true" : "false");
  };
  toggle(elements.formatCore, isCore);
  toggle(elements.formatExpanded, isExpanded);
  toggle(elements.formatAncient, isAncient);
  toggle(elements.formatMystic, isMystic);
  toggle(elements.hostFormatCore, isCore);
  toggle(elements.hostFormatExpanded, isExpanded);
  toggle(elements.hostFormatAncient, isAncient);
  toggle(elements.hostFormatMystic, isMystic);
}
