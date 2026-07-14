import type { Metadata } from "next";
import "./globals.css";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <div className="flex flex-1">
          <SiteSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1">{children}</main>
          </div>
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
