export const COMPACT_BOARD_MEDIA_QUERY = "(max-width: 820px), (max-height: 760px)";

export function isCompactBoardViewport(win = typeof window !== "undefined" ? window : null) {
  if (!win || typeof win.matchMedia !== "function") return false;
  return win.matchMedia(COMPACT_BOARD_MEDIA_QUERY).matches;
}

export function syncCompactBoardViewport(
  win = typeof window !== "undefined" ? window : null,
  doc = typeof document !== "undefined" ? document : null
) {
  const compact = isCompactBoardViewport(win);
  if (doc?.body) {
    doc.body.classList.toggle("compact-board", compact);
  }
  return compact;
}

export function isCompactBoardActive({
  win = typeof window !== "undefined" ? window : null,
  doc = typeof document !== "undefined" ? document : null,
} = {}) {
  if (doc?.body?.classList?.contains("compact-board")) {
    return true;
  }
  return isCompactBoardViewport(win);
}
