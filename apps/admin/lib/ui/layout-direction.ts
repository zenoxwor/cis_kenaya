export type LayoutDirection = "ltr" | "rtl";

export function getLayoutDirection(): LayoutDirection {
  const configured = process.env.NEXT_PUBLIC_LAYOUT_DIRECTION;
  if (configured === "ltr" || configured === "rtl") {
    return configured;
  }

  return "ltr";
}
