import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-block text-xs text-muted hover:text-foreground">
      ← Volver a {label}
    </Link>
  );
}
