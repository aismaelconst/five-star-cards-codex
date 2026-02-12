export function formatLabel(format) {
  if (format === "expanded") return "GEMSTONE + PLATINUM";
  if (format === "ancient") return "ANCIENT";
  if (format === "ancient_expanded") return "ANCIENT + GEMSTONE + PLATINUM";
  return "CORE";
}

export function updateFormatButtons(state, elements) {
  const isCore =
    !state.format ||
    !["expanded", "ancient", "ancient_expanded"].includes(state.format);
  const isExpanded = state.format === "expanded";
  const isAncient = state.format === "ancient";
  const isAncientExpanded = state.format === "ancient_expanded";
  const toggle = (el, active) => {
    if (!el) return;
    el.classList.toggle("active", active);
    el.setAttribute("aria-pressed", active ? "true" : "false");
  };
  toggle(elements.formatCore, isCore);
  toggle(elements.formatExpanded, isExpanded);
  toggle(elements.formatAncient, isAncient);
  toggle(elements.formatAncientExpanded, isAncientExpanded);
  toggle(elements.hostFormatCore, isCore);
  toggle(elements.hostFormatExpanded, isExpanded);
  toggle(elements.hostFormatAncient, isAncient);
  toggle(elements.hostFormatAncientExpanded, isAncientExpanded);
}
