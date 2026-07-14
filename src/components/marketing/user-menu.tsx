"use client";

import { useState } from "react";
import Link from "next/link";

export function UserMenu({
  label,
  avatarUrl,
  isAdmin,
}: {
  label: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="user-menu">
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="user-menu-avatar" />
        ) : (
          <span className="user-menu-avatar user-menu-avatar-fallback">
            {label.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="user-menu-label">{label}</span>
        <svg
          className={`user-menu-chevron${open ? " is-open" : ""}`}
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="user-menu-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div className="user-menu-dropdown" role="menu">
            <Link href="/panel" className="user-menu-item" onClick={() => setOpen(false)}>
              Ir a mi panel
            </Link>
            {isAdmin && (
              <Link href="/admin" className="user-menu-item" onClick={() => setOpen(false)}>
                Panel de Admin
              </Link>
            )}
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="user-menu-item user-menu-item-danger">
                Cerrar sesión
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
