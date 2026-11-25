"use client";

import { useState, useEffect } from "react";
import { useContabia } from "@/lib/store/ContabiaContext";
import Link from "next/link";

export default function DashboardPage() {
  const { empresas, cuentas, asientos, empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);

  useEffect(() => { setMontado(true); }, []);

  const asientosMes = montado ? asientos.filter(a => {
    const ahora = new Date();
    const fa = new Date(a.fecha);
    return fa.getMonth() === ahora.getMonth() && fa.getFullYear() === ahora.getFullYear();
  }).length : 0;

  const tarjetas = [
    {
      titulo: "Empresas registradas",
      valor: montado ? String(empresas.length) : "—",
      descripcion: !montado ? "" : empresas.length === 0 ? "Sin empresas todavía" : `${empresas.filter(e => e.activa).length} activa(s)`,
      color: "border-blue-800",
      icono: "🏢",
      href: "/dashboard/clientes",
    },
    {
      titulo: "Asientos del mes",
      valor: montado ? String(asientosMes) : "—",
      descripcion: !montado ? "" : asientos.length === 0 ? "Sin movimientos" : `${asientos.length} en total`,
      color: "border-green-800",
      icono: "📒",
      href: "/dashboard/asientos",
    },
    {
      titulo: "Cuentas activas",
      valor: montado ? String(cuentas.filter(c => c.activa).length) : "—",
      descripcion: !montado ? "" : cuentas.length === 0 ? "Plan de cuentas vacío" : `${cuentas.length} en total`,
      color: "border-yellow-800",
      icono: "📋",
      href: "/dashboard/cuentas",
    },
    {
      titulo: "Balance",
      valor: montado ? (asientos.length > 0 ? "✓" : "—") : "—",
      descripcion: asientos.length > 0 ? "Ver reporte" : "Sin movimientos",
      color: "border-purple-800",
      icono: "📊",
      href: "/dashboard/reportes",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Bienvenida */}
      <div>
        <h2 className="text-2xl font-bold text-white">Panel principal</h2>
        <p className="text-sm text-gray-500 mt-1">
          {montado && empresaActual ? empresaActual.nombre : "CONTABIA AI"}
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map((t) => (
          <Link key={t.titulo} href={t.href}
            className={`bg-gray-900 border ${t.color} rounded-xl p-5 space-y-2 hover:bg-gray-800/50 transition`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{t.titulo}</span>
              <span className="text-xl">{t.icono}</span>
            </div>
            <p className="text-3xl font-bold text-white">{t.valor}</p>
            <p className="text-xs text-gray-600">{t.descripcion}</p>
          </Link>
        ))}
      </div>

      {/* Estado del sistema */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-400">Estado del sistema</h3>
        <div className="space-y-2">
          {[
            { label: "Servidor Next.js",     estado: "En línea",           color: "bg-green-400" },
            { label: "Base de datos",         estado: "Supabase conectado", color: "bg-green-400" },
            { label: "Motor contable",        estado: "Operativo",          color: "bg-green-400" },
            { label: "Autenticación",         estado: "Activa",             color: "bg-green-400" },
            { label: "Separación por empresa", estado: "RLS activo",        color: "bg-green-400" },
            { label: "Módulo ITBMS Panamá",   estado: "Pendiente",          color: "bg-gray-600" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
              <span className="text-sm text-gray-400 w-48">{item.label}</span>
              <span className="text-sm text-gray-600">{item.estado}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/asientos"
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:bg-gray-800/50 transition text-center">
          <p className="text-2xl mb-2">📒</p>
          <p className="text-sm font-medium text-white">Nuevo asiento</p>
          <p className="text-xs text-gray-600 mt-1">Registrar movimiento contable</p>
        </Link>
        <Link href="/dashboard/clientes"
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:bg-gray-800/50 transition text-center">
          <p className="text-2xl mb-2">👥</p>
          <p className="text-sm font-medium text-white">Nuevo cliente</p>
          <p className="text-xs text-gray-600 mt-1">Crear empresa y usuario</p>
        </Link>
        <Link href="/dashboard/reportes"
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:bg-gray-800/50 transition text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm font-medium text-white">Ver reportes</p>
          <p className="text-xs text-gray-600 mt-1">Balance de comprobación</p>
        </Link>
      </div>

    </div>
  );
}
