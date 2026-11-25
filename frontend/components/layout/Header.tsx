"use client";

import { useContabia } from "@/lib/store/ContabiaContext";
import { useState } from "react";

export default function Header() {
  const { empresaActual, empresas, seleccionarEmpresa } = useContabia();
  const [mostrarMenu, setMostrarMenu] = useState(false);

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 relative">

        {/* Empresa activa */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Empresa:</span>
        <button
          onClick={() => setMostrarMenu((v) => !v)}
          className="flex items-center gap-2 text-sm text-gray-300 font-medium hover:text-white transition"
        >
          {empresaActual?.nombre ?? "Sin empresa"}
          {empresas.length > 1 && <span className="text-gray-600 text-xs">▼</span>}
        </button>

        {/* Menú de empresas */}
        {mostrarMenu && empresas.length > 1 && (
          <div className="absolute top-14 left-24 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 min-w-56 py-1">
            {empresas.map((e) => (
              <button
                key={e.id}
                onClick={() => { seleccionarEmpresa(e); setMostrarMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition ${
                  e.id === empresaActual?.id
                    ? "text-blue-400 bg-blue-950/50"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {e.nombre}
                {e.id === empresaActual?.id && <span className="ml-2 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Usuario */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Administrador</span>
        <div
          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold"
          aria-label="Avatar del usuario"
        >
          A
        </div>
      </div>
    </header>
  );
}
