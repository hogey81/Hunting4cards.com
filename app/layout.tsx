import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import TabBar from "@/components/TabBar";
import { AccountSync } from "@/lib/account";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hunting4Cards",
  description: "Houd je kaartcollectie bij met actuele Cardmarket-prijzen.",
  appleWebApp: { capable: true, title: "Hunting4Cards", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#EEF2F8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap"
        />
      </head>
      <body>
        <main className="page">{children}</main>
        <AccountSync />
        <Suspense fallback={null}>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
