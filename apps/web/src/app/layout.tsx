import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kachkozavr",
  description: "MVP bootstrap for trainer-student control loop"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
