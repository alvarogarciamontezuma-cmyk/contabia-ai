"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validación básica
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    if (!email.includes("@")) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    // Simulación de login (Fase 2 — sin autenticación real todavía)
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-blue-400">CONTABIA AI</h1>
          <p className="text-sm text-gray-500">Inicia sesión en tu cuenta</p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5"
          noValidate
        >
          {/* Error */}
          {error && (
            <div
              role="alert"
              className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3"
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition"
          >
            {loading ? "Verificando..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Nota de desarrollo */}
        <p className="text-center text-xs text-gray-700">
          Fase 2 — Autenticación simulada · CONTABIA AI
        </p>

      </div>
    </main>
  );
}
