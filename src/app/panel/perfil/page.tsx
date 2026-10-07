import { redirect } from "next/navigation";

// El perfil se fusionó con el inicio del panel (ver ProfileSection). La ruta
// queda solo para no romper enlaces viejos.
export default function ProfilePage() {
  redirect("/panel");
}
