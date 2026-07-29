export const DEFAULT_TIMETABLE_COLOR_HEX = "#E2E8F0";
export const TIMETABLE_COLOR_HEX_PATTERN = "^#[0-9A-Fa-f]{6}$";
export const TIMETABLE_COLOR_HEX_REGEX = new RegExp(TIMETABLE_COLOR_HEX_PATTERN);

export function normalizeTimetableColorHex(value: string | null | undefined) {
  const colorHex = value?.trim();
  if (!colorHex || !TIMETABLE_COLOR_HEX_REGEX.test(colorHex)) {
    return DEFAULT_TIMETABLE_COLOR_HEX;
  }
  return colorHex.toUpperCase();
}

export function getTimetableTextColor(value: string | null | undefined) {
  const normalized = normalizeTimetableColorHex(value);
  const hex = normalized.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance >= 0.65 ? "#0F172A" : "#F8FAFC";
}
