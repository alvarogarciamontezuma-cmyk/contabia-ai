"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";

export default function ConfiguracionPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [email, setEmail] = useState("");

  // Cambio de contraseña
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [cargandoPassword, setCargandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState("");
  const [exitoPassword, setExitoPassword] = useState("");

  useEffect(() => {
    setMontado(true);
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  async function handleCambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorPassword("");
    setExitoPassword("");

    if (!passwordNueva) { setErrorPassword("Ingresa la nueva contraseña."); return; }
    if (passwordNueva.length < 8) { setErrorPassword("La contraseña debe tener al menos 8 caracteres."); return; }
    if (passwordNueva !== passwordConfirmar) { setErrorPassword("Las contraseñas no coinciden."); return; }

    setCargandoPassword(true);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.updateUser({ password: passwordNueva });

    setCargandoPassword(false);

    if (error) {
      setErrorPassword("Error al cambiar contraseña: " + error.message);
      return;
    }

    setExitoPassword("Contraseña actualizada correctamente.");
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
  }

  if (!montado) {
    return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-white">Configuración</h2>
        <p className="text-sm text-gray-500 mt-1">Perfil y seguridad de tu cuenta</p>
      </div>

      {/* Información de la cuenta */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Información de la cuenta</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Correo electrónico</span>
            <span className="text-sm text-white">{email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Empresa activa</span>
            <span className="text-sm text-white">{empresaActual?.nombre ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-400">País</span>
            <span className="text-sm text-white">{empresaActual?.pais ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Cambiar contraseña</h3>

        {errorPassword && (
          <div role="alert" className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {errorPassword}
          </div>
        )}

        {exitoPassword && (
          <div className="bg-green-950 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
            ✓ {exitoPassword}
          </div>
        )}

        <form onSubmit={handleCambiarPassword} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="password-nueva" className="block text-sm text-gray-400">
              Nueva contraseña <span className="text-red-500">*</span>
            </label>
            <input
              id="password-nueva"
              type="password"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password-confirmar" className="block text-sm text-gray-400">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <input
              id="password-confirmar"
              type="password"
              value={passwordConfirmar}
              onChange={(e) => setPasswordConfirmar(e.target.value)}
              placeholder="Repite la nueva contraseña"
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={cargandoPassword}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition"
          >
            {cargandoPassword ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </div>

      {/* Información del sistema */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Información del sistema</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Versión</span>
            <span>CONTABIA AI v0.14</span>
          </div>
          <div className="flex justify-between">
            <span>Base de datos</span>
            <span>Supabase PostgreSQL</span>
          </div>
          <div className="flex justify-between">
            <span>Servidor</span>
            <span>Vercel — Next.js 16</span>
          </div>
          <div className="flex justify-between">
            <span>País</span>
            <span>Panamá</span>
          </div>
        </div>
      </div>

    </div>
  );
}
