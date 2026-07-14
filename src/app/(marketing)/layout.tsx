import "./marketing.css";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingScripts } from "@/components/marketing/marketing-scripts";
import { DiscordIcon } from "@/components/marketing/discord-icon";
import { AuthNav } from "@/components/marketing/auth-nav";

const DISCORD_INVITE_URL = "https://discord.gg/XnTrEKEGw";

export const metadata: Metadata = {
  title: {
    default: "Special Delivery — Guild ROOC",
    template: "%s — Special Delivery",
  },
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://i.ytimg.com" />
      <noscript>
        <style>{`.reveal, .reveal-scroll, .reveal-left { opacity: 1 !important; transform: none !important; filter: none !important; }`}</style>
      </noscript>

      <header className="site-header">
        <div className="header-inner">
          <Link href="/#inicio" className="brand">
            <img
              src="/assets/mascota-fantasma-icono.svg"
              alt="Mascota fantasma de Special Delivery"
              className="brand-logo"
              width={40}
              height={40}
            />
            <span className="brand-name">Special Delivery</span>
          </Link>

          <button
            className="nav-toggle"
            id="navToggle"
            aria-expanded="false"
            aria-controls="primaryNav"
            aria-label="Abrir menú de navegación"
          >
            <span className="nav-toggle-bar"></span>
            <span className="nav-toggle-bar"></span>
            <span className="nav-toggle-bar"></span>
          </button>

          <nav className="primary-nav" id="primaryNav">
            <ul>
              <li>
                <Link href="/#inicio" className="nav-link">Inicio</Link>
              </li>
              <li>
                <Link href="/#historia" className="nav-link">Acerca de la Guild</Link>
              </li>
              <li>
                <Link href="/reclutamiento" className="nav-link">Reclutamiento</Link>
              </li>
            </ul>
            <AuthNav />
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img
              src="/assets/mascota-fantasma-icono.svg"
              alt="Mascota fantasma de Special Delivery"
              className="footer-logo"
              width={32}
              height={32}
              loading="lazy"
            />
            <span>Special Delivery</span>
          </div>

          <nav className="footer-nav" aria-label="Enlaces rápidos">
            <Link href="/#inicio">Inicio</Link>
            <Link href="/#historia">Acerca de la Guild</Link>
            <Link href="/reclutamiento">Reclutamiento</Link>
          </nav>

          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-discord"
            aria-label="Discord de Special Delivery"
          >
            <DiscordIcon />
          </a>
        </div>
        <p className="footer-copy">Special Delivery — ROOC &copy; 2026</p>
      </footer>

      <MarketingScripts />
    </>
  );
}
