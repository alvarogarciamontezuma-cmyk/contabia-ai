"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modulos = [
  {
    grupo: "Principal",
    items: [
      { href: "/dashboard", label: "Inicio", icono: "⊞" },
    ],
  },
  {
    grupo: "Contabilidad",
    items: [
      { href: "/dashboard/empresas", label: "Empresas", icono: "🏢" },
      { href: "/dashboard/cuentas", label: "Plan de cuentas", icono: "📋" },
      { href: "/dashboard/asientos", label: "Asientos", icono: "📒" },
      { href: "/dashboard/reportes", label: "Reportes", icono: "📊" },
    ],
  },
  {
    grupo: "Sistema",
    items: [
      { href: "/dashboard/configuracion", label: "Configuración", icono: "⚙" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-800">
        <span className="text-blue-400 font-bold text-lg tracking-tight">
          CONTABIA AI
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6 px-3">
        {modulos.map((grupo) => (
          <div key={grupo.grupo}>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-2 mb-2">
              {grupo.grupo}
            </p>
            <ul className="space-y-1">
              {grupo.items.map((item) => {
                const activo = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                        activo
                          ? "bg-blue-600 text-white font-medium"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <span className="text-base">{item.icono}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Pie del sidebar */}
      <div className="p-4 border-t border-gray-800">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800 hover:text-white transition w-full"
        >
          <span>⏻</span>
          Cerrar sesión
        </Link>
      </div>
    </aside>
  );
}
