"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function RegistroPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Paso 1 — Datos de acceso
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Paso 2 — Datos de la empresa / negocio
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [tipoPerfil, setTipoPerfil] = useState("empresa");
  const [pais, setPais] = useState("Panamá");
  const [moneda, setMoneda] = useState("USD");

  function handleSiguiente(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) { setError("Ingresa un correo válido."); return; }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== passwordConfirm) { setError("Las contraseñas no coinciden."); return; }
    setPaso(2);
  }

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombreEmpresa.trim()) { setError("El nombre es obligatorio."); return; }

    setCargando(true);
    const supabase = createSupabaseBrowserClient();

    // 1. Crear cuenta en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user) {
      setCargando(false);
      if (authError?.message.includes("already registered")) {
        setError("Ya existe una cuenta con ese correo. Inicia sesión.");
      } else {
        setError("Error al crear la cuenta: " + (authError?.message ?? "desconocido"));
      }
      return;
    }

    // 2. Crear la empresa vinculada al usuario
    const { data: empresa, error: errEmpresa } = await supabase
      .from("empresas")
      .insert({ nombre: nombreEmpresa.trim(), pais, moneda, activa: true })
      .select().single();

    if (errEmpresa || !empresa) {
      setCargando(false);
      setError("Cuenta creada pero hubo un error al configurar tu empresa. Contacta soporte.");
      return;
    }

    // 3. Vincular usuario con empresa
    await supabase.from("usuarios_empresas").insert({
      user_id: authData.user.id,
      empresa_id: empresa.id,
      rol: "administrador",
    });

    // 4. Crear suscripción de prueba (30 días)
    const fechaPrueba = new Date();
    fechaPrueba.setDate(fechaPrueba.getDate() + 30);
    await supabase.from("suscripciones").insert({
      empresa_id: empresa.id,
      estado: "prueba",
      fecha_fin_prueba: fechaPrueba.toISOString(),
      monto: 14.00,
    });

    // 5. Crear plan de cuentas básico
    const cuentasBase = [
      { codigo: "1.0.00", nombre: "ACTIVO", tipo: "activo", empresa_id: empresa.id, activa: true },
      { codigo: "1.1.01", nombre: "Caja General", tipo: "activo", empresa_id: empresa.id, activa: true },
      { codigo: "1.1.02", nombre: "Banco", tipo: "activo", empresa_id: empresa.id, activa: true },
      { codigo: "2.0.00", nombre: "PASIVO", tipo: "pasivo", empresa_id: empresa.id, activa: true },
      { codigo: "2.1.01", nombre: "Cuentas por pagar", tipo: "pasivo", empresa_id: empresa.id, activa: true },
      { codigo: "3.0.00", nombre: "PATRIMONIO", tipo: "patrimonio", empresa_id: empresa.id, activa: true },
      { codigo: "3.1.01", nombre: "Capital", tipo: "patrimonio", empresa_id: empresa.id, activa: true },
      { codigo: "4.0.00", nombre: "INGRESOS", tipo: "ingreso", empresa_id: empresa.id, activa: true },
      { codigo: "4.1.01", nombre: "Ventas", tipo: "ingreso", empresa_id: empresa.id, activa: true },
      { codigo: "5.0.00", nombre: "GASTOS", tipo: "gasto", empresa_id: empresa.id, activa: true },
      { codigo: "5.1.01", nombre: "Gastos generales", tipo: "gasto", empresa_id: empresa.id, activa: true },
    ];
    await supabase.from("cuentas").insert(cuentasBase);

    setCargando(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-blue-400">CONTABIA AI</h1>
          <p className="text-sm text-gray-500">
            {paso === 1 ? "Crea tu cuenta gratuita" : "Configura tu negocio"}
          </p>
          {/* Indicador de paso */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className={`w-8 h-1 rounded-full transition ${paso >= 1 ? "bg-blue-500" : "bg-gray-700"}`} />
            <div className={`w-8 h-1 rounded-full transition ${paso >= 2 ? "bg-blue-500" : "bg-gray-700"}`} />
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5">

          {error && (
            <div role="alert" className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* ── Paso 1: Acceso ── */}
          {paso === 1 && (
            <form onSubmit={handleSiguiente} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Correo electrónico
                </label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com" autoComplete="email"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Contraseña
                </label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
              <div className="space-y-1">
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-300">
                  Confirmar contraseña
                </label>
                <input id="passwordConfirm" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repite la contraseña" autoComplete="new-password"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
              <button type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition">
                Continuar →
              </button>
            </form>
          )}

          {/* ── Paso 2: Negocio ── */}
          {paso === 2 && (
            <form onSubmit={handleRegistrar} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">¿Cómo describes tu negocio?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { valor: "independiente", label: "Independiente", icono: "👤" },
                    { valor: "pequeno", label: "Pequeño negocio", icono: "🏪" },
                    { valor: "empresa", label: "Empresa", icono: "🏢" },
                  ].map((op) => (
                    <button key={op.valor} type="button"
                      onClick={() => setTipoPerfil(op.valor)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition ${
                        tipoPerfil === op.valor ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                      }`}>
                      <span className="text-xl">{op.icono}</span>
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="nombreEmpresa" className="block text-sm font-medium text-gray-300">
                  {tipoPerfil === "independiente" ? "Tu nombre o marca" : "Nombre del negocio"} *
                </label>
                <input id="nombreEmpresa" type="text" value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)}
                  placeholder={tipoPerfil === "independiente" ? "Juan García / Mi Marca" : "Mi Empresa S.A."}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">País</label>
                  <select value={pais} onChange={(e) => setPais(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {["Panamá", "Costa Rica", "Colombia", "México"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Moneda</label>
                  <select value={moneda} onChange={(e) => setMoneda(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {["USD", "CRC", "COP", "MXN"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Prueba gratuita */}
              <div className="bg-blue-950 border border-blue-800 rounded-lg p-3 text-xs text-blue-300">
                🎉 <strong>30 días gratis</strong> — Sin tarjeta de crédito. Después, solo USD 14/mes.
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setPaso(1); setError(""); }}
                  className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition">
                  ← Volver
                </button>
                <button type="submit" disabled={cargando}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition">
                  {cargando ? "Creando cuenta..." : "Crear cuenta gratis"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Link al login */}
        <p className="text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition">
            Inicia sesión
          </Link>
        </p>

        <p className="text-center text-xs text-gray-700">
          CONTABIA AI · Panamá 2026
        </p>
      </div>
    </main>
  );
}
