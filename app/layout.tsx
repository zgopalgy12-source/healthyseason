import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Healthy Season", template: "%s | Healthy Season" },
  description: "Conheça o que come e acompanhe os seus objetivos de nutrição.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-PT"><body>{children}</body></html>;
}
