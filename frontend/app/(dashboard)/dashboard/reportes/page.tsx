"use client";

import { useState, useEffect } from "react";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";
import type { TipoCuenta } from "@/types/contabilidad";

const etiquetaTipo: Record<TipoCuenta, string> = {
  activo:     "Activo",
  pasivo:     "Pasivo",
  patrimonio: "Patrimonio",
  ingreso:    "Ingreso",
  gasto:      "Gasto",
};

const colorTipo: Record<TipoCuenta, string> = {
  activo:     "text-blue-400",
  pasivo:     "text-red-400",
  patrimonio: "text-purple-400",
  ingreso:    "text-green-400",
  gasto:      "text-yellow-400",
};

interface FilaBalance {
  cuentaId: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  totalDebitos: number;
  totalCreditos: number;
  saldo: number;
}

export default function ReportesPage() {
  const { cuentas, asientos } = useContabia();
  const [montado, setMontado] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    setMontado(true);
    // Fecha por defecto: primer día del mes actual hasta hoy
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    setFechaDesde(`${yyyy}-${mm}-01`);
    setFechaHasta(`${yyyy}-${mm}-${dd}`);
  }, []);

  if (!montado) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-800 rounded animate-pulse" />
        <div className="h-96 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Filtrar asientos por rango de fechas
  const asientosFiltrados = asientos.filter((a) => {
    const fa = new Date(a.fecha);
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta + "T23:59:59") : null;
    if (desde && fa < desde) return false;
    if (hasta && fa > hasta) return false;
    return true;
  });

  // Calcular totales por cuenta
  const mapaBalance: Record<string, { debitos: number; creditos: number }> = {};

  asientosFiltrados.forEach((asiento) => {
    asiento.lineas.forEach((linea) => {
      if (!mapaBalance[linea.cuentaId]) {
        mapaBalance[linea.cuentaId] = { debitos: 0, creditos: 0 };
      }
      mapaBalance[linea.cuentaId].debitos += linea.debito;
      mapaBalance[linea.cuentaId].creditos += linea.credito;
    });
  });

  // Construir filas del balance
  const filas: FilaBalance[] = cuentas
    .filter((c) => c.activa)
    .map((cuenta) => {
      const movimientos = mapaBalance[cuenta.id] ?? { debitos: 0, creditos: 0 };
      const saldo = movimientos.debitos - movimientos.creditos;
      return {
        cuentaId: cuenta.id,
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        totalDebitos: movimientos.debitos,
        totalCreditos: movimientos.creditos,
        saldo,
      };
    })
    .filter((f) => f.totalDebitos > 0 || f.totalCreditos > 0); // Solo cuentas con movimiento

  // Totales generales
  const totalDebitos = filas.reduce((s, f) => s + f.totalDebitos, 0);
  const totalCreditos = filas.reduce((s, f) => s + f.totalCreditos, 0);
  const cuadra = Math.round((totalDebitos - totalCreditos) * 100) === 0;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-white">Reportes</h2>
        <p className="text-sm text-gray-500 mt-1">Balance de comprobación</p>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label htmlFor="desde" className="block text-xs text-gray-400">Desde</label>
          <input
            id="desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="hasta" className="block text-xs text-gray-400">Hasta</label>
          <input
            id="hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-gray-500 pb-2">
          {asientosFiltrados.length} asiento{asientosFiltrados.length !== 1 ? "s" : ""} en el período
        </div>
      </div>

      {/* Tabla del balance */}
      {filas.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-600 text-sm">No hay movimientos en el período seleccionado.</p>
          <p className="text-gray-700 text-xs mt-1">Registra asientos contables para ver el balance.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Código</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Cuenta</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Tipo</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Débitos</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Créditos</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filas.map((fila) => (
                <tr key={fila.cuentaId} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 font-mono text-gray-400 text-xs">{fila.codigo}</td>
                  <td className="px-5 py-3 text-white">{fila.nombre}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className={`text-xs ${colorTipo[fila.tipo]}`}>
                      {etiquetaTipo[fila.tipo]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-gray-300">
                    {fila.totalDebitos > 0 ? formatearMoneda(fila.totalDebitos) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-gray-300">
                    {fila.totalCreditos > 0 ? formatearMoneda(fila.totalCreditos) : "—"}
                  </td>
                  <td className={`px-5 py-3 text-right font-mono font-semibold ${
                    fila.saldo > 0 ? "text-blue-400" : fila.saldo < 0 ? "text-red-400" : "text-gray-500"
                  }`}>
                    {formatearMoneda(Math.abs(fila.saldo))}
                    {fila.saldo < 0 && <span className="text-xs ml-1">(Cr)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totales */}
            <tfoot>
              <tr className="border-t-2 border-gray-700 bg-gray-800/50">
                <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-300">
                  TOTALES
                </td>
                <td className="px-5 py-3 text-right font-mono font-bold text-white">
                  {formatearMoneda(totalDebitos)}
                </td>
                <td className="px-5 py-3 text-right font-mono font-bold text-white">
                  {formatearMoneda(totalCreditos)}
                </td>
                <td className={`px-5 py-3 text-right font-mono font-bold ${cuadra ? "text-green-400" : "text-red-400"}`}>
                  {cuadra ? "✓ Cuadrado" : "✗ No cuadra"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Indicador de partida doble */}
      {filas.length > 0 && (
        <div className={`rounded-xl p-4 border text-sm flex items-center justify-between ${
          cuadra
            ? "bg-green-950 border-green-800 text-green-300"
            : "bg-red-950 border-red-800 text-red-300"
        }`}>
          <span className="font-medium">
            {cuadra
              ? "✓ La contabilidad cuadra — débitos iguales a créditos"
              : "✗ La contabilidad no cuadra — revisar asientos"}
          </span>
          <div className="flex gap-6 font-mono text-xs">
            <span>Débitos: <strong>{formatearMoneda(totalDebitos)}</strong></span>
            <span>Créditos: <strong>{formatearMoneda(totalCreditos)}</strong></span>
          </div>
        </div>
      )}

      {/* Nota legal */}
      <p className="text-xs text-gray-700">
        Este reporte es informativo. Los cálculos fiscales y legales deben validarse con un profesional contable competente.
      </p>

    </div>
  );
}
