import type { Metadata, Viewport } from "next";
import "./globals.css";
import LayoutShell from "./components/LayoutShell";

export const metadata: Metadata = {
  title: "کۆگای دۆستان",
  description: "POS and ERP System",
};

export const viewport: Viewport = {
  width: "1280",
  initialScale: 0.3,
  minimumScale: 0.1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      dir="rtl"
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
