import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI Kit",
  description: "Přehled sjednocených UI komponent",
  robots: { index: false, follow: false },
};

export default function UiKitLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
