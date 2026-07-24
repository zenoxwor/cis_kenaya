import type { Metadata } from "next";
import { getLayoutDirection } from "@/lib/ui/layout-direction";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kenaya CIS Admin",
  description: "School management and documentation admin portal foundation."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const direction = getLayoutDirection();

  return (
    <html lang="en" dir={direction}>
      <body>{children}</body>
    </html>
  );
}
