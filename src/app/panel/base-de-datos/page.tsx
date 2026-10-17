import { redirect } from "next/navigation";

// La base de datos dejó de ser una pestaña del panel: sus datos quedan de
// fondo para las guías de clase. La ruta queda solo para no romper enlaces.
export default function DatabasePage() {
  redirect("/panel");
}
