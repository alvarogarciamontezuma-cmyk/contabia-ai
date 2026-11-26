"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

const YAPPY_NUMERO = process.env.NEXT_PUBLIC_YAPPY_NUMERO ?? "";
const MONTO_MENSUAL = 14.00;

interface Suscripcion {
  id: string;
  estado: "prueba" | "activa" | "vencida" | "suspendida";
  fecha_inicio: string;
  fecha_fin_prueba: string;
  fecha_proximo_pago: string | null;
  monto: number;
}

interface Pago {
  id: string;
  monto: number;
  metodo: string;
  estado: "pendiente" | "confirmado" | "rechazado";
  referencia: string | null;
  fecha_pago: string;
  notas: string | null;
}

export default function PagosPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario de pago
  const [mostrarForm, setMostrarForm] = useState(false);
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!empresaActual) return;
    cargarDatos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaActual?.id]);

  async function cargarDatos() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();

    const { data: sus } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaActual.id)
      .single();

    const { data: pags } = await supabase
      .from("pagos")
      .select("*")
      .eq("empresa_id", empresaActual.id)
      .order("fecha_pago", { ascending: false });

    setSuscripcion(sus ?? null);
    setPagos(pags ?? []);
    setCargando(false);
  }

  async function handleRegistrarPago(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setExito("");

    if (!referencia.trim()) {
      setError("Ingresa el número de referencia de tu pago Yappy.");
      return;
    }

    setEnviando(true);
    const supabase = createSupabaseBrowserClient();

    const { error: err } = await supabase.from("pagos").insert({
      empresa_id: empresaActual!.id,
      monto: MONTO_MENSUAL,
      moneda: "USD",
      metodo: "yappy",
      estado: "pendiente",
      referencia: referencia.trim(),
      notas: notas.trim() || null,
    });

    setEnviando(false);

    if (err) {
      setError("Error al registrar el pago: " + err.message);
      return;
    }

    setExito("Pago registrado. Será confirmado en menos de 24 horas.");
    setReferencia("");
    setNotas("");
    setMostrarForm(false);
    cargarDatos();
  }

  // Calcular días restantes de prueba
  const diasPrueba = suscripcion
    ? Math.max(0, Math.ceil((new Date(suscripcion.fecha_fin_prueba).getTime() - Date.now()) / 86400000))
    : 0;

  const colorEstado: Record<string, string> = {
    prueba:     "bg-blue-950 text-blue-400 border-blue-800",
    activa:     "bg-green-950 text-green-400 border-green-800",
    vencida:    "bg-red-950 text-red-400 border-red-800",
    suspendida: "bg-gray-800 text-gray-500 border-gray-700",
    pendiente:  "bg-yellow-950 text-yellow-400 border-yellow-800",
    confirmado: "bg-green-950 text-green-400 border-green-800",
    rechazado:  "bg-red-950 text-red-400 border-red-800",
  };

  if (!montado || cargando) {
    return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-white">Pagos y suscripción</h2>
        <p className="text-sm text-gray-500 mt-1">Gestiona tu plan de CONTABIA AI</p>
      </div>

      {exito && (
        <div className="bg-green-950 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
          ✓ {exito}
        </div>
      )}

      {/* Estado de la suscripción */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Estado de tu plan</h3>
          {suscripcion && (
            <span className={`text-xs border rounded-full px-3 py-1 ${colorEstado[suscripcion.estado]}`}>
              {suscripcion.estado === "prueba" ? "Período de prueba" :
               suscripcion.estado === "activa" ? "Activa" :
               suscripcion.estado === "vencida" ? "Vencida" : "Suspendida"}
            </span>
          )}
        </div>

        {suscripcion?.estado === "prueba" && (
          <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
            <p className="text-blue-300 font-semibold text-lg">{diasPrueba} días restantes de prueba gratuita</p>
            <p className="text-blue-500 text-xs mt-1">
              Tu período de prueba vence el {new Date(suscripcion.fecha_fin_prueba).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        )}

        {suscripcion?.estado === "vencida" && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4">
            <p className="text-red-300 font-semibold">Tu suscripción ha vencido</p>
            <p className="text-red-500 text-xs mt-1">Realiza tu pago para continuar usando CONTABIA AI.</p>
          </div>
        )}

        <div className="border-t border-gray-800 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Plan</span>
            <span className="text-white font-medium">CONTABIA AI — Mensual</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Precio</span>
            <span className="text-white font-semibold">{formatearMoneda(MONTO_MENSUAL)}/mes</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Empresa</span>
            <span className="text-white">{empresaActual?.nombre}</span>
          </div>
        </div>
      </div>

      {/* Instrucciones de pago Yappy */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Pagar con Yappy</h3>

        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="text-white font-medium text-sm">Instrucciones de pago</p>
              <p className="text-gray-500 text-xs">Sigue estos pasos desde tu app de Yappy</p>
            </div>
          </div>
          <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
            <li>Abre tu app de Yappy en Banco General</li>
            <li>Selecciona <strong className="text-white">Enviar dinero</strong></li>
            <li>
              Envía <strong className="text-white">{formatearMoneda(MONTO_MENSUAL)}</strong> al número:
              <span className="ml-2 bg-blue-900 text-blue-300 font-mono px-3 py-1 rounded-lg text-sm">
                {YAPPY_NUMERO}
              </span>
            </li>
            <li>En el concepto escribe: <strong className="text-white">{empresaActual?.nombre}</strong></li>
            <li>Guarda el número de referencia y regístralo abajo</li>
          </ol>
        </div>

        <button
          onClick={() => { setMostrarForm((v) => !v); setError(""); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {mostrarForm ? "Cancelar" : "Ya pagué — registrar pago"}
        </button>

        {mostrarForm && (
          <form onSubmit={handleRegistrarPago} className="space-y-4 pt-2">
            {error && (
              <div role="alert" className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="referencia" className="block text-sm text-gray-400">
                Número de referencia Yappy <span className="text-red-500">*</span>
              </label>
              <input id="referencia" type="text" value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: YAP-123456"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label htmlFor="notas" className="block text-sm text-gray-400">Notas (opcional)</label>
              <input id="notas" type="text" value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Información adicional"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={enviando}
              className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              {enviando ? "Registrando..." : "Registrar pago"}
            </button>
          </form>
        )}
      </div>

      {/* Historial de pagos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300">Historial de pagos</h3>
        </div>
        {pagos.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-8">No hay pagos registrados todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Fecha</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Referencia</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Monto</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {pagos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-gray-300">
                    {new Date(p.fecha_pago).toLocaleDateString("es-PA")}
                  </td>
                  <td className="px-5 py-3 font-mono text-gray-400 text-xs">{p.referencia ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-white">{formatearMoneda(p.monto)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${colorEstado[p.estado]}`}>
                      {p.estado === "pendiente" ? "Pendiente" :
                       p.estado === "confirmado" ? "Confirmado" : "Rechazado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
