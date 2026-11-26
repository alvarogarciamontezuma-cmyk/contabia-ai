"use client";

import { useState, useEffect } from "react";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";
import type { TipoCuenta } from "@/types/contabilidad";

type Reporte = "balance-comprobacion" | "estado-resultados" | "balance-general";

const TABS: { id: Reporte; label: string; icono: string }[] = [
  { id: "balance-comprobacion", label: "Balance de comprobación", icono: "📋" },
  { id: "estado-resultados",    label: "Estado de resultados",    icono: "📈" },
  { id: "balance-general",      label: "Balance general",         icono: "⚖" },
];

const colorTipo: Record<TipoCuenta, string> = {
  activo:     "text-blue-400",
  pasivo:     "text-red-400",
  patrimonio: "text-purple-400",
  ingreso:    "text-green-400",
  gasto:      "text-yellow-400",
};

export default function ReportesPage() {
  const { cuentas, asientos } = useContabia();
  const [montado, setMontado] = useState(false);
  const [reporte, setReporte] = useState<Reporte>("balance-comprobacion");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    setFechaDesde(`${yyyy}-${mm}-01`);
    setFechaHasta(`${yyyy}-${mm}-${dd}`);
  }, []);

  if (!montado) {
    return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;
  }

  function exportarCSV() {
    let filas: string[][] = [];
    if (reporte === "balance-comprobacion") {
      filas = [
        ["Código", "Cuenta", "Débitos", "Créditos", "Saldo"],
        ...todasCuentas.map(c => [c.codigo, c.nombre, String(c.debitos), String(c.creditos), String(c.saldo)]),
        ["", "TOTALES", String(totalDebitos), String(totalCreditos), ""],
      ];
    } else if (reporte === "estado-resultados") {
      filas = [
        ["Tipo", "Cuenta", "Monto"],
        ...cuentasPorTipo("ingreso").map(c => ["Ingreso", `${c.codigo} ${c.nombre}`, String(Math.abs(c.saldo))]),
        ["", "Total ingresos", String(totalIngresos)],
        ...cuentasPorTipo("gasto").map(c => ["Gasto", `${c.codigo} ${c.nombre}`, String(Math.abs(c.saldo))]),
        ["", "Total gastos", String(totalGastos)],
        ["", utilidad >= 0 ? "UTILIDAD" : "PÉRDIDA", String(Math.abs(utilidad))],
      ];
    } else {
      filas = [
        ["Tipo", "Cuenta", "Monto"],
        ...cuentasPorTipo("activo").map(c => ["Activo", `${c.codigo} ${c.nombre}`, String(Math.abs(c.saldo))]),
        ["", "Total activos", String(totalActivos)],
        ...cuentasPorTipo("pasivo").map(c => ["Pasivo", `${c.codigo} ${c.nombre}`, String(Math.abs(c.saldo))]),
        ["", "Total pasivos", String(totalPasivos)],
        ...cuentasPorTipo("patrimonio").map(c => ["Patrimonio", `${c.codigo} ${c.nombre}`, String(Math.abs(c.saldo))]),
        ["", "Total patrimonio", String(totalPatrimonio + utilidad)],
      ];
    }
    const csv = filas.map(f => f.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reporte}_${fechaDesde}_${fechaHasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filtrar asientos por período
  const asientosFiltrados = asientos.filter((a) => {
    const fa = new Date(a.fecha);
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta + "T23:59:59") : null;
    if (desde && fa < desde) return false;
    if (hasta && fa > hasta) return false;
    return true;
  });

  // Calcular saldos por cuenta
  const saldos: Record<string, { debitos: number; creditos: number }> = {};
  asientosFiltrados.forEach((a) => {
    a.lineas.forEach((l) => {
      if (!saldos[l.cuentaId]) saldos[l.cuentaId] = { debitos: 0, creditos: 0 };
      saldos[l.cuentaId].debitos += l.debito;
      saldos[l.cuentaId].creditos += l.credito;
    });
  });

  // Agrupar cuentas por tipo con saldos
  const cuentasPorTipo = (tipo: TipoCuenta) =>
    cuentas
      .filter((c) => c.tipo === tipo && c.activa && saldos[c.id])
      .map((c) => ({
        ...c,
        debitos: saldos[c.id]?.debitos ?? 0,
        creditos: saldos[c.id]?.creditos ?? 0,
        saldo: (saldos[c.id]?.debitos ?? 0) - (saldos[c.id]?.creditos ?? 0),
      }));

  // Totales por tipo
  const totalTipo = (tipo: TipoCuenta) =>
    cuentasPorTipo(tipo).reduce((s, c) => s + Math.abs(c.saldo), 0);

  const totalIngresos  = totalTipo("ingreso");
  const totalGastos    = totalTipo("gasto");
  const utilidad       = totalIngresos - totalGastos;

  const totalActivos   = totalTipo("activo");
  const totalPasivos   = totalTipo("pasivo");
  const totalPatrimonio = totalTipo("patrimonio");
  const ecuacionCuadra = Math.round((totalActivos - (totalPasivos + totalPatrimonio + utilidad)) * 100) === 0;

  // Totales balance comprobación
  const todasCuentas = cuentas.filter(c => c.activa && saldos[c.id]).map(c => ({
    ...c,
    debitos: saldos[c.id]?.debitos ?? 0,
    creditos: saldos[c.id]?.creditos ?? 0,
    saldo: (saldos[c.id]?.debitos ?? 0) - (saldos[c.id]?.creditos ?? 0),
  }));
  const totalDebitos  = todasCuentas.reduce((s, c) => s + c.debitos, 0);
  const totalCreditos = todasCuentas.reduce((s, c) => s + c.creditos, 0);
  const cuadra = Math.round((totalDebitos - totalCreditos) * 100) === 0;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Reportes financieros</h2>
          <p className="text-sm text-gray-500 mt-1">Estados financieros del período seleccionado</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()}
            className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition border border-gray-700">
            🖨 Imprimir / PDF
          </button>
          <button onClick={() => exportarCSV()}
            className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition border border-gray-700">
            ↓ Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label htmlFor="desde" className="block text-xs text-gray-400">Desde</label>
          <input id="desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="space-y-1">
          <label htmlFor="hasta" className="block text-xs text-gray-400">Hasta</label>
          <input id="hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="text-xs text-gray-500 pb-2">
          {asientosFiltrados.length} asiento{asientosFiltrados.length !== 1 ? "s" : ""} en el período
        </div>
      </div>

      {/* Tabs de reportes */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setReporte(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
              reporte === t.id ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"
            }`}>
            <span>{t.icono}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── BALANCE DE COMPROBACIÓN ── */}
      {reporte === "balance-comprobacion" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {todasCuentas.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-10">No hay movimientos en el período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Código</th>
                  <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Cuenta</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Débitos</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Créditos</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {todasCuentas.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-5 py-3 font-mono text-gray-400 text-xs">{c.codigo}</td>
                    <td className="px-5 py-3 text-white">{c.nombre}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">{formatearMoneda(c.debitos)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">{formatearMoneda(c.creditos)}</td>
                    <td className={`px-5 py-3 text-right font-mono font-semibold ${c.saldo >= 0 ? "text-blue-400" : "text-red-400"}`}>
                      {formatearMoneda(Math.abs(c.saldo))}{c.saldo < 0 && <span className="text-xs ml-1">(Cr)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-700 bg-gray-800/50">
                  <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-300">TOTALES</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-white">{formatearMoneda(totalDebitos)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-white">{formatearMoneda(totalCreditos)}</td>
                  <td className={`px-5 py-3 text-right font-mono font-bold ${cuadra ? "text-green-400" : "text-red-400"}`}>
                    {cuadra ? "✓ Cuadrado" : "✗ No cuadra"}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* ── ESTADO DE RESULTADOS ── */}
      {reporte === "estado-resultados" && (
        <div className="space-y-4">
          {/* Ingresos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 bg-green-950/30">
              <h3 className="text-sm font-semibold text-green-400">INGRESOS</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-800">
                {cuentasPorTipo("ingreso").length === 0 ? (
                  <tr><td colSpan={2} className="px-5 py-4 text-center text-gray-600">Sin ingresos en el período</td></tr>
                ) : cuentasPorTipo("ingreso").map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-white">{c.codigo} {c.nombre}</td>
                    <td className="px-5 py-3 text-right font-mono text-green-400">{formatearMoneda(Math.abs(c.saldo))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-800/30">
                  <td className="px-5 py-3 text-sm font-semibold text-white">Total ingresos</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-green-400">{formatearMoneda(totalIngresos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Gastos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 bg-yellow-950/30">
              <h3 className="text-sm font-semibold text-yellow-400">GASTOS</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-800">
                {cuentasPorTipo("gasto").length === 0 ? (
                  <tr><td colSpan={2} className="px-5 py-4 text-center text-gray-600">Sin gastos en el período</td></tr>
                ) : cuentasPorTipo("gasto").map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-white">{c.codigo} {c.nombre}</td>
                    <td className="px-5 py-3 text-right font-mono text-yellow-400">{formatearMoneda(Math.abs(c.saldo))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-800/30">
                  <td className="px-5 py-3 text-sm font-semibold text-white">Total gastos</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-yellow-400">{formatearMoneda(totalGastos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Resultado */}
          <div className={`rounded-xl p-5 border ${utilidad >= 0 ? "bg-green-950 border-green-800" : "bg-red-950 border-red-800"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-lg font-bold ${utilidad >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {utilidad >= 0 ? "UTILIDAD DEL PERÍODO" : "PÉRDIDA DEL PERÍODO"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Ingresos − Gastos</p>
              </div>
              <p className={`text-2xl font-bold font-mono ${utilidad >= 0 ? "text-green-300" : "text-red-300"}`}>
                {formatearMoneda(Math.abs(utilidad))}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-700">
            Este reporte es informativo. Debe validarse con un contador antes de usarlo en declaraciones fiscales.
          </p>
        </div>
      )}

      {/* ── BALANCE GENERAL ── */}
      {reporte === "balance-general" && (
        <div className="space-y-4">

          {/* Activos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 bg-blue-950/30">
              <h3 className="text-sm font-semibold text-blue-400">ACTIVOS</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-800">
                {cuentasPorTipo("activo").length === 0 ? (
                  <tr><td colSpan={2} className="px-5 py-4 text-center text-gray-600">Sin movimientos en activos</td></tr>
                ) : cuentasPorTipo("activo").map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-white">{c.codigo} {c.nombre}</td>
                    <td className="px-5 py-3 text-right font-mono text-blue-400">{formatearMoneda(Math.abs(c.saldo))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-800/30">
                  <td className="px-5 py-3 text-sm font-semibold text-white">Total activos</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-blue-400">{formatearMoneda(totalActivos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pasivos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 bg-red-950/30">
              <h3 className="text-sm font-semibold text-red-400">PASIVOS</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-800">
                {cuentasPorTipo("pasivo").length === 0 ? (
                  <tr><td colSpan={2} className="px-5 py-4 text-center text-gray-600">Sin movimientos en pasivos</td></tr>
                ) : cuentasPorTipo("pasivo").map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-white">{c.codigo} {c.nombre}</td>
                    <td className="px-5 py-3 text-right font-mono text-red-400">{formatearMoneda(Math.abs(c.saldo))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-800/30">
                  <td className="px-5 py-3 text-sm font-semibold text-white">Total pasivos</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-red-400">{formatearMoneda(totalPasivos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Patrimonio */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 bg-purple-950/30">
              <h3 className="text-sm font-semibold text-purple-400">PATRIMONIO</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-800">
                {cuentasPorTipo("patrimonio").length === 0 ? (
                  <tr><td colSpan={2} className="px-5 py-4 text-center text-gray-600">Sin movimientos en patrimonio</td></tr>
                ) : cuentasPorTipo("patrimonio").map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-white">{c.codigo} {c.nombre}</td>
                    <td className="px-5 py-3 text-right font-mono text-purple-400">{formatearMoneda(Math.abs(c.saldo))}</td>
                  </tr>
                ))}
                {utilidad !== 0 && (
                  <tr className="hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-white">Utilidad/Pérdida del período</td>
                    <td className={`px-5 py-3 text-right font-mono ${utilidad >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatearMoneda(utilidad)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-800/30">
                  <td className="px-5 py-3 text-sm font-semibold text-white">Total patrimonio</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-purple-400">
                    {formatearMoneda(totalPatrimonio + utilidad)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Ecuación contable */}
          <div className={`rounded-xl p-4 border ${ecuacionCuadra ? "bg-green-950 border-green-800" : "bg-red-950 border-red-800"}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className={`text-sm font-semibold ${ecuacionCuadra ? "text-green-300" : "text-red-300"}`}>
                {ecuacionCuadra ? "✓ Ecuación contable cuadrada" : "✗ Ecuación no cuadra — revisar asientos"}
              </span>
              <div className="flex gap-4 text-xs font-mono flex-wrap">
                <span className="text-blue-400">Activos: {formatearMoneda(totalActivos)}</span>
                <span className="text-gray-500">=</span>
                <span className="text-red-400">Pasivos: {formatearMoneda(totalPasivos)}</span>
                <span className="text-gray-500">+</span>
                <span className="text-purple-400">Patrimonio: {formatearMoneda(totalPatrimonio + utilidad)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-700">
            Este reporte es informativo. Debe validarse con un contador antes de presentarlo oficialmente.
          </p>
        </div>
      )}

    </div>
  );
}
