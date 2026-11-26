"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string;
  numero_cuenta: string | null;
  tipo: string;
  moneda: string;
  saldo_inicial: number;
  activa: boolean;
}

interface MovimientoBancario {
  id: string;
  cuenta_bancaria_id: string;
  fecha: string;
  descripcion: string;
  tipo: "credito" | "debito";
  monto: number;
  referencia: string | null;
  conciliado: boolean;
}

const BANCOS_PANAMA = ["Banco General", "Banistmo", "Banco Nacional de Panamá", "BAC Credomatic", "Global Bank", "Multibank", "Otro"];

export default function BancosPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBancario[]>([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<"cuentas" | "movimientos">("cuentas");
  const [mostrarFormCuenta, setMostrarFormCuenta] = useState(false);
  const [mostrarFormMovimiento, setMostrarFormMovimiento] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });

  const [formCuenta, setFormCuenta] = useState({ nombre: "", banco: "Banco General", numeroCuenta: "", tipo: "corriente", moneda: "USD", saldoInicial: "" });
  const [formMovimiento, setFormMovimiento] = useState({ fecha: "", descripcion: "", tipo: "credito", monto: "", referencia: "" });

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    setFormMovimiento((f) => ({ ...f, fecha: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}` }));
  }, []);

  useEffect(() => { if (montado && empresaActual) cargarCuentas(); }, [montado, empresaActual?.id]);
  useEffect(() => { if (cuentaSeleccionada) cargarMovimientos(); }, [cuentaSeleccionada]);

  async function cargarCuentas() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("cuentas_bancarias").select("*").eq("empresa_id", empresaActual.id).order("nombre");
    setCuentas((data ?? []) as CuentaBancaria[]);
    if (data && data.length > 0 && !cuentaSeleccionada) setCuentaSeleccionada(data[0].id);
    setCargando(false);
  }

  async function cargarMovimientos() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("movimientos_bancarios").select("*")
      .eq("cuenta_bancaria_id", cuentaSeleccionada).order("fecha", { ascending: false });
    setMovimientos((data ?? []) as MovimientoBancario[]);
  }

  async function handleGuardarCuenta(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!formCuenta.nombre.trim()) { setMensaje({ texto: "El nombre es obligatorio.", tipo: "error" }); return; }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("cuentas_bancarias").insert({
      empresa_id: empresaActual!.id, nombre: formCuenta.nombre.trim(), banco: formCuenta.banco,
      numero_cuenta: formCuenta.numeroCuenta.trim() || null, tipo: formCuenta.tipo,
      moneda: formCuenta.moneda, saldo_inicial: parseFloat(formCuenta.saldoInicial) || 0,
    });
    if (error) { setMensaje({ texto: "Error: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Cuenta bancaria creada.", tipo: "exito" });
    setMostrarFormCuenta(false);
    setFormCuenta({ nombre: "", banco: "Banco General", numeroCuenta: "", tipo: "corriente", moneda: "USD", saldoInicial: "" });
    cargarCuentas();
  }

  async function handleGuardarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!formMovimiento.descripcion.trim()) { setMensaje({ texto: "La descripción es obligatoria.", tipo: "error" }); return; }
    if (!formMovimiento.monto) { setMensaje({ texto: "El monto es obligatorio.", tipo: "error" }); return; }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("movimientos_bancarios").insert({
      cuenta_bancaria_id: cuentaSeleccionada, empresa_id: empresaActual!.id,
      fecha: formMovimiento.fecha, descripcion: formMovimiento.descripcion.trim(),
      tipo: formMovimiento.tipo, monto: parseFloat(formMovimiento.monto),
      referencia: formMovimiento.referencia.trim() || null,
    });
    if (error) { setMensaje({ texto: "Error: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Movimiento registrado.", tipo: "exito" });
    setMostrarFormMovimiento(false);
    setFormMovimiento((f) => ({ ...f, descripcion: "", monto: "", referencia: "" }));
    cargarMovimientos();
  }

  // Calcular saldo actual
  const cuenta = cuentas.find(c => c.id === cuentaSeleccionada);
  const saldoActual = (cuenta?.saldo_inicial ?? 0) + movimientos.reduce((s, m) => m.tipo === "credito" ? s + m.monto : s - m.monto, 0);

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Bancos y tesorería</h2>
        <p className="text-sm text-gray-500 mt-1">Cuentas bancarias y movimientos</p>
      </div>

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setVista("cuentas")} className={`px-4 py-2 rounded-lg text-sm transition ${vista === "cuentas" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}>
          🏦 Cuentas bancarias
        </button>
        <button onClick={() => setVista("movimientos")} className={`px-4 py-2 rounded-lg text-sm transition ${vista === "movimientos" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}>
          📊 Movimientos
        </button>
      </div>

      {/* ── CUENTAS ── */}
      {vista === "cuentas" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setMostrarFormCuenta((v) => !v)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {mostrarFormCuenta ? "Cancelar" : "+ Nueva cuenta"}
            </button>
          </div>

          {mostrarFormCuenta && (
            <form onSubmit={handleGuardarCuenta} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">Nueva cuenta bancaria</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-sm text-gray-400">Nombre *</label>
                  <input type="text" value={formCuenta.nombre} onChange={(e) => setFormCuenta({ ...formCuenta, nombre: e.target.value })}
                    placeholder="Ej: Cuenta corriente operativa"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Banco</label>
                  <select value={formCuenta.banco} onChange={(e) => setFormCuenta({ ...formCuenta, banco: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {BANCOS_PANAMA.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">N° de cuenta</label>
                  <input type="text" value={formCuenta.numeroCuenta} onChange={(e) => setFormCuenta({ ...formCuenta, numeroCuenta: e.target.value })}
                    placeholder="Opcional"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Tipo</label>
                  <select value={formCuenta.tipo} onChange={(e) => setFormCuenta({ ...formCuenta, tipo: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="corriente">Corriente</option>
                    <option value="ahorros">Ahorros</option>
                    <option value="inversion">Inversión</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Saldo inicial</label>
                  <input type="number" min="0" step="0.01" value={formCuenta.saldoInicial} onChange={(e) => setFormCuenta({ ...formCuenta, saldoInicial: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition">Crear cuenta</button>
                <button type="button" onClick={() => setMostrarFormCuenta(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cuentas.length === 0 ? (
              <p className="text-gray-600 text-sm col-span-3 text-center py-10">No hay cuentas bancarias registradas.</p>
            ) : cuentas.map((c) => {
              const movsCuenta = movimientos.filter(m => m.cuenta_bancaria_id === c.id);
              const saldo = c.saldo_inicial + movsCuenta.reduce((s, m) => m.tipo === "credito" ? s + m.monto : s - m.monto, 0);
              return (
                <div key={c.id} className={`bg-gray-900 border rounded-xl p-5 space-y-3 cursor-pointer transition ${cuentaSeleccionada === c.id ? "border-blue-600" : "border-gray-800 hover:border-gray-600"}`}
                  onClick={() => { setCuentaSeleccionada(c.id); setVista("movimientos"); }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{c.nombre}</p>
                      <p className="text-xs text-gray-500">{c.banco}</p>
                    </div>
                    <span className="text-xs text-gray-600 capitalize">{c.tipo}</span>
                  </div>
                  <p className={`text-2xl font-bold font-mono ${saldo >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatearMoneda(saldo)}
                  </p>
                  {c.numero_cuenta && <p className="text-xs text-gray-600 font-mono">{c.numero_cuenta}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MOVIMIENTOS ── */}
      {vista === "movimientos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <select value={cuentaSeleccionada} onChange={(e) => setCuentaSeleccionada(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {cuenta && (
                <span className={`font-mono text-sm font-semibold ${saldoActual >= 0 ? "text-green-400" : "text-red-400"}`}>
                  Saldo: {formatearMoneda(saldoActual)}
                </span>
              )}
            </div>
            <button onClick={() => setMostrarFormMovimiento((v) => !v)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {mostrarFormMovimiento ? "Cancelar" : "+ Nuevo movimiento"}
            </button>
          </div>

          {mostrarFormMovimiento && (
            <form onSubmit={handleGuardarMovimiento} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">Nuevo movimiento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Fecha</label>
                  <input type="date" value={formMovimiento.fecha} onChange={(e) => setFormMovimiento({ ...formMovimiento, fecha: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Tipo</label>
                  <select value={formMovimiento.tipo} onChange={(e) => setFormMovimiento({ ...formMovimiento, tipo: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="credito">Crédito (entrada)</option>
                    <option value="debito">Débito (salida)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Monto *</label>
                  <input type="number" min="0" step="0.01" value={formMovimiento.monto} onChange={(e) => setFormMovimiento({ ...formMovimiento, monto: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-sm text-gray-400">Descripción *</label>
                  <input type="text" value={formMovimiento.descripcion} onChange={(e) => setFormMovimiento({ ...formMovimiento, descripcion: e.target.value })}
                    placeholder="Ej: Pago a proveedor ABC"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Referencia</label>
                  <input type="text" value={formMovimiento.referencia} onChange={(e) => setFormMovimiento({ ...formMovimiento, referencia: e.target.value })}
                    placeholder="Cheque, transferencia..."
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition">Registrar</button>
                <button type="button" onClick={() => setMostrarFormMovimiento(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
              </div>
            </form>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {movimientos.length === 0 ? (
              <p className="text-center text-gray-600 text-sm py-10">No hay movimientos en esta cuenta.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Fecha</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Descripción</th>
                    <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Crédito</th>
                    <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Débito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {movimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-800/50 transition">
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(m.fecha).toLocaleDateString("es-PA")}</td>
                      <td className="px-5 py-3 text-white">{m.descripcion}{m.referencia && <span className="text-xs text-gray-600 ml-2">({m.referencia})</span>}</td>
                      <td className="px-5 py-3 text-right font-mono text-green-400">{m.tipo === "credito" ? formatearMoneda(m.monto) : ""}</td>
                      <td className="px-5 py-3 text-right font-mono text-red-400">{m.tipo === "debito" ? formatearMoneda(m.monto) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
