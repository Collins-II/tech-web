import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goodform — Good tech for good days",
  description: "Thoughtful tech, picked for the way you actually live.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
