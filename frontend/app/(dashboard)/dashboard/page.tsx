"use client";

import { useContabia } from "@/lib/store/ContabiaContext";

export default function DashboardPage() {
  const { empresas, cuentas } = useContabia();

  const tarjetas = [
    {
      titulo: "Empresas registradas",
      valor: String(empresas.length),
      descripcion: empresas.length === 0 ? "Sin empresas todavía" : `${empresas.filter(e => e.activa).length} activa(s)`,
      color: "border-blue-800",
      icono: "🏢",
    },
    {
      titulo: "Asientos del mes",
      valor: "0",
      descripcion: "Sin movimientos",
      color: "border-green-800",
      icono: "📒",
    },
    {
      titulo: "Cuentas activas",
      valor: String(cuentas.filter(c => c.activa).length),
      descripcion: cuentas.length === 0 ? "Plan de cuentas vacío" : `${cuentas.length} en total`,
      color: "border-yellow-800",
      icono: "📋",
    },
    {
      titulo: "Motor contable",
      valor: "—",
      descripcion: "En desarrollo",
      color: "border-gray-700",
      icono: "⚙",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Bienvenida */}
      <div>
        <h2 className="text-2xl font-bold text-white">Panel principal</h2>
        <p className="text-sm text-gray-500 mt-1">
          Bienvenido a CONTABIA AI · Fase 2 en progreso
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map((t) => (
          <div
            key={t.titulo}
            className={`bg-gray-900 border ${t.color} rounded-xl p-5 space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {t.titulo}
              </span>
              <span className="text-xl">{t.icono}</span>
            </div>
            <p className="text-3xl font-bold text-white">{t.valor}</p>
            <p className="text-xs text-gray-600">{t.descripcion}</p>
          </div>
        ))}
      </div>

      {/* Estado del sistema */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-400">
          Estado del sistema
        </h3>
        <div className="space-y-2">
          {[
            { label: "Servidor Next.js", estado: "En línea", color: "bg-green-400" },
            { label: "Base de datos", estado: "Sin configurar", color: "bg-yellow-400" },
            { label: "Motor contable", estado: "En desarrollo", color: "bg-gray-600" },
            { label: "Autenticación", estado: "Simulada (Fase 2)", color: "bg-yellow-400" },
            { label: "Módulo ITBMS Panamá", estado: "Pendiente", color: "bg-gray-600" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
              <span className="text-sm text-gray-400 w-48">{item.label}</span>
              <span className="text-sm text-gray-600">{item.estado}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nota de fase */}
      <div className="bg-blue-950 border border-blue-900 rounded-xl p-4">
        <p className="text-sm text-blue-300">
          <span className="font-semibold">Fase 2 activa</span> — Login y estructura del dashboard completados.
          La autenticación es simulada. La base de datos y el motor contable se implementarán en fases posteriores.
        </p>
      </div>

    </div>
  );
}
