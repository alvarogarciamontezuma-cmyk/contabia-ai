"use client";

import { useState, useEffect } from "react";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

type Vista = "diario" | "mayor";

export default function LibrosPage() {
  const { cuentas, asientos } = useContabia();
  const [montado, setMontado] = useState(false);
  const [vista, setVista] = useState<Vista>("diario");
  const [cuentaFiltro, setCuentaFiltro] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    setFechaDesde(`${yyyy}-${mm}-01`);
    setFechaHasta(`${yyyy}-${mm}-${String(hoy.getDate()).padStart(2, "0")}`);
  }, []);

  if (!montado) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  // Filtrar asientos por fechas
  const asientosFiltrados = asientos.filter((a) => {
    const fa = new Date(a.fecha);
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta + "T23:59:59") : null;
    if (desde && fa < desde) return false;
    if (hasta && fa > hasta) return false;
    return true;
  });

  // ── LIBRO MAYOR: movimientos por cuenta ──
  const movimientosPorCuenta: Record<string, { debitos: number; creditos: number; lineas: { fecha: Date; descripcion: string; debito: number; credito: number; saldoAcumulado: number }[] }> = {};

  asientosFiltrados
    .slice()
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .forEach((asiento) => {
      asiento.lineas.forEach((linea) => {
        if (!movimientosPorCuenta[linea.cuentaId]) {
          movimientosPorCuenta[linea.cuentaId] = { debitos: 0, creditos: 0, lineas: [] };
        }
        const m = movimientosPorCuenta[linea.cuentaId];
        m.debitos += linea.debito;
        m.creditos += linea.credito;
        const saldoAcumulado = m.debitos - m.creditos;
        m.lineas.push({ fecha: new Date(asiento.fecha), descripcion: asiento.descripcion, debito: linea.debito, credito: linea.credito, saldoAcumulado });
      });
    });

  const cuentasConMovimiento = cuentas.filter((c) => movimientosPorCuenta[c.id]);
  const cuentasFiltradas = cuentaFiltro
    ? cuentasConMovimiento.filter((c) => c.id === cuentaFiltro)
    : cuentasConMovimiento;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-white">Libros contables</h2>
        <p className="text-sm text-gray-500 mt-1">Libro diario y libro mayor del período</p>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="block text-xs text-gray-400">Desde</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-gray-400">Hasta</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {vista === "mayor" && (
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Cuenta</label>
            <select value={cuentaFiltro} onChange={(e) => setCuentaFiltro(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas las cuentas</option>
              {cuentasConMovimiento.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>
              ))}
            </select>
          </div>
        )}
        <div className="text-xs text-gray-500 pb-2">
          {asientosFiltrados.length} asiento{asientosFiltrados.length !== 1 ? "s" : ""} en el período
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setVista("diario")}
          className={`px-4 py-2 rounded-lg text-sm transition ${vista === "diario" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}>
          📅 Libro diario
        </button>
        <button onClick={() => setVista("mayor")}
          className={`px-4 py-2 rounded-lg text-sm transition ${vista === "mayor" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}>
          📖 Libro mayor
        </button>
      </div>

      {/* ── LIBRO DIARIO ── */}
      {vista === "diario" && (
        <div className="space-y-3">
          {asientosFiltrados.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
              <p className="text-gray-600 text-sm">No hay asientos en el período seleccionado.</p>
            </div>
          ) : (
            asientosFiltrados
              .slice()
              .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              .map((asiento, idx) => {
                const totalDeb = asiento.lineas.reduce((s, l) => s + l.debito, 0);
                return (
                  <div key={asiento.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 font-mono">#{idx + 1}</span>
                          <p className="text-white font-medium">{asiento.descripcion}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(asiento.fecha).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}
                          {" · "}{asiento.creadoPor}
                        </p>
                      </div>
                      <span className="font-mono text-sm text-gray-400">{formatearMoneda(totalDeb)}</span>
                    </div>
                    <table className="w-full text-xs border-t border-gray-800 pt-3">
                      <thead>
                        <tr className="text-gray-600">
                          <th className="text-left pb-1 font-normal">Cuenta</th>
                          <th className="text-right pb-1 font-normal">Débito</th>
                          <th className="text-right pb-1 font-normal">Crédito</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {asiento.lineas.map((linea, i) => {
                          const cuenta = cuentas.find((c) => c.id === linea.cuentaId);
                          return (
                            <tr key={i} className="text-gray-300">
                              <td className="py-1">{cuenta ? `${cuenta.codigo} ${cuenta.nombre}` : "—"}</td>
                              <td className="py-1 text-right font-mono">{linea.debito > 0 ? formatearMoneda(linea.debito) : ""}</td>
                              <td className="py-1 text-right font-mono">{linea.credito > 0 ? formatearMoneda(linea.credito) : ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ── LIBRO MAYOR ── */}
      {vista === "mayor" && (
        <div className="space-y-6">
          {cuentasFiltradas.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
              <p className="text-gray-600 text-sm">No hay movimientos en el período seleccionado.</p>
            </div>
          ) : (
            cuentasFiltradas.map((cuenta) => {
              const mov = movimientosPorCuenta[cuenta.id];
              const saldoFinal = mov.debitos - mov.creditos;
              return (
                <div key={cuenta.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-gray-500 mr-2">{cuenta.codigo}</span>
                      <span className="text-white font-medium">{cuenta.nombre}</span>
                    </div>
                    <span className={`font-mono text-sm font-semibold ${saldoFinal >= 0 ? "text-blue-400" : "text-red-400"}`}>
                      Saldo: {formatearMoneda(Math.abs(saldoFinal))}{saldoFinal < 0 ? " (Cr)" : ""}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-2">Fecha</th>
                        <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-2">Descripción</th>
                        <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-2">Débito</th>
                        <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-2">Crédito</th>
                        <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-2">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {mov.lineas.map((l, i) => (
                        <tr key={i} className="hover:bg-gray-800/50 transition">
                          <td className="px-5 py-2 text-gray-400 text-xs">{l.fecha.toLocaleDateString("es-PA")}</td>
                          <td className="px-5 py-2 text-gray-300">{l.descripcion}</td>
                          <td className="px-5 py-2 text-right font-mono text-gray-300">{l.debito > 0 ? formatearMoneda(l.debito) : "—"}</td>
                          <td className="px-5 py-2 text-right font-mono text-gray-300">{l.credito > 0 ? formatearMoneda(l.credito) : "—"}</td>
                          <td className={`px-5 py-2 text-right font-mono font-semibold ${l.saldoAcumulado >= 0 ? "text-blue-400" : "text-red-400"}`}>
                            {formatearMoneda(Math.abs(l.saldoAcumulado))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-700 bg-gray-800/30">
                        <td colSpan={2} className="px-5 py-2 text-xs font-semibold text-gray-400">TOTALES</td>
                        <td className="px-5 py-2 text-right font-mono font-bold text-white">{formatearMoneda(mov.debitos)}</td>
                        <td className="px-5 py-2 text-right font-mono font-bold text-white">{formatearMoneda(mov.creditos)}</td>
                        <td className={`px-5 py-2 text-right font-mono font-bold ${saldoFinal >= 0 ? "text-blue-400" : "text-red-400"}`}>
                          {formatearMoneda(Math.abs(saldoFinal))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
