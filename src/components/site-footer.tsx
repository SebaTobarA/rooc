import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {siteConfig.name} — {siteConfig.tagline}. Proyecto de fans, sin afiliación
          oficial.
        </p>
        <Link href="/admin/login" className="hover:text-foreground">
          Panel admin
        </Link>
      </div>
    </footer>
  );
}
