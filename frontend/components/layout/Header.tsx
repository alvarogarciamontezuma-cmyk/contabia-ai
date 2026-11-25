"use client";

import { useContabia } from "@/lib/store/ContabiaContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Header() {
  const { empresaActual, empresas, seleccionarEmpresa } = useContabia();
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [mostrarUsuario, setMostrarUsuario] = useState(false);
  const [iniciales, setIniciales] = useState("A");
  const [emailUsuario, setEmailUsuario] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? "";
      setEmailUsuario(email);
      setIniciales(email ? email[0].toUpperCase() : "A");
    });
  }, []);

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

        {mostrarMenu && empresas.length > 1 && (
          <div className="absolute top-14 left-24 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 min-w-56 py-1">
            {empresas.map((e) => (
              <button key={e.id}
                onClick={() => { seleccionarEmpresa(e); setMostrarMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition ${
                  e.id === empresaActual?.id ? "text-blue-400 bg-blue-950/50" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}>
                {e.nombre}{e.id === empresaActual?.id && <span className="ml-2 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Usuario */}
      <div className="relative">
        <button
          onClick={() => setMostrarUsuario((v) => !v)}
          className="flex items-center gap-3 hover:opacity-80 transition"
        >
          <span className="text-sm text-gray-400 hidden sm:block">{emailUsuario}</span>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {iniciales}
          </div>
        </button>

        {mostrarUsuario && (
          <div className="absolute top-12 right-0 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 min-w-48 py-1">
            <div className="px-4 py-2 border-b border-gray-700">
              <p className="text-xs text-gray-500 truncate">{emailUsuario}</p>
            </div>
            <Link href="/dashboard/configuracion"
              onClick={() => setMostrarUsuario(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
              ⚙ Configuración
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
