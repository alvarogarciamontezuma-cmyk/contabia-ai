"use client";

import { useState, useEffect } from "react";
import { generarFacturaPDF } from "@/lib/utils/pdf";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";
import { TASAS_ITBMS } from "@/lib/contabilidad/itbms";

interface ClienteEmpresa { id: string; nombre: string; }

interface LineaForm {
  _id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  itbmsPorcentaje: number;
}

interface Factura {
  id: string;
  numero: string;
  tipo: string;
  fecha: string;
  fecha_vencimiento: string | null;
  subtotal: number;
  itbms: number;
  total: number;
  estado: string;
  notas: string | null;
  clientes_empresa: { nombre: string } | null;
}

// Contador para IDs únicos — solo se incrementa en el cliente
let _contadorLinea = 0;
function nuevaLinea(): LineaForm {
  return { _id: `linea-factura-${++_contadorLinea}`, descripcion: "", cantidad: 1, precioUnitario: 0, itbmsPorcentaje: 7 };
}

const LINEAS_INICIALES: LineaForm[] = [
  { _id: "linea-factura-inicial-1", descripcion: "", cantidad: 1, precioUnitario: 0, itbmsPorcentaje: 7 },
];

const colorEstado: Record<string, string> = {
  borrador:  "bg-gray-800 text-gray-400 border-gray-700",
  emitida:   "bg-blue-950 text-blue-400 border-blue-800",
  pendiente: "bg-yellow-950 text-yellow-400 border-yellow-800",
  pagada:    "bg-green-950 text-green-400 border-green-800",
  vencida:   "bg-red-950 text-red-400 border-red-800",
  anulada:   "bg-gray-800 text-gray-500 border-gray-700",
};

export default function FacturasPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<ClienteEmpresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    clienteId: "", numero: "", tipo: "factura",
    fecha: "", fechaVencimiento: "", notas: "",
  });
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()]);

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    setForm((f) => ({ ...f, fecha: `${yyyy}-${mm}-${dd}`, numero: `F-${Date.now().toString().slice(-6)}` }));
  }, []);

  useEffect(() => { if (montado && empresaActual) { cargarFacturas(); cargarClientes(); } }, [montado, empresaActual?.id]);

  async function cargarFacturas() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("facturas")
      .select("*, clientes_empresa(nombre)")
      .eq("empresa_id", empresaActual.id)
      .order("fecha", { ascending: false });
    setFacturas((data ?? []) as Factura[]);
    setCargando(false);
  }

  async function cargarClientes() {
    if (!empresaActual) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("clientes_empresa").select("id, nombre")
      .eq("empresa_id", empresaActual.id).order("nombre");
    setClientes((data ?? []) as ClienteEmpresa[]);
  }

  // Calcular totales
  const calcularLinea = (l: LineaForm) => {
    const subtotal = Math.round(l.cantidad * l.precioUnitario * 100) / 100;
    const itbmsMonto = Math.round(subtotal * (l.itbmsPorcentaje / 100) * 100) / 100;
    return { subtotal, itbmsMonto, total: subtotal + itbmsMonto };
  };

  const totales = lineas.reduce((acc, l) => {
    const c = calcularLinea(l);
    return { subtotal: acc.subtotal + c.subtotal, itbms: acc.itbms + c.itbmsMonto, total: acc.total + c.total };
  }, { subtotal: 0, itbms: 0, total: 0 });

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!form.numero.trim()) { setMensaje({ texto: "El número de factura es obligatorio.", tipo: "error" }); return; }
    if (!form.fecha) { setMensaje({ texto: "La fecha es obligatoria.", tipo: "error" }); return; }
    if (lineas.some(l => !l.descripcion.trim())) { setMensaje({ texto: "Todas las líneas deben tener descripción.", tipo: "error" }); return; }

    setGuardando(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: factura, error: errFact } = await supabase.from("facturas").insert({
      empresa_id: empresaActual!.id,
      cliente_id: form.clienteId || null,
      numero: form.numero.trim(),
      tipo: form.tipo,
      fecha: form.fecha,
      fecha_vencimiento: form.fechaVencimiento || null,
      subtotal: Math.round(totales.subtotal * 100) / 100,
      itbms: Math.round(totales.itbms * 100) / 100,
      total: Math.round(totales.total * 100) / 100,
      estado: "emitida",
      notas: form.notas.trim() || null,
      creado_por: user?.email ?? "sistema",
    }).select().single();

    if (errFact) { setGuardando(false); setMensaje({ texto: "Error: " + errFact.message, tipo: "error" }); return; }

    const lineasDB = lineas.map((l) => {
      const c = calcularLinea(l);
      return { factura_id: factura.id, descripcion: l.descripcion, cantidad: l.cantidad, precio_unitario: l.precioUnitario, itbms_porcentaje: l.itbmsPorcentaje, subtotal: c.subtotal, itbms_monto: c.itbmsMonto, total: c.total };
    });

    await supabase.from("lineas_factura").insert(lineasDB);
    setGuardando(false);
    setMensaje({ texto: `Factura ${factura.numero} creada correctamente.`, tipo: "exito" });
    setMostrarForm(false);
    setLineas([nuevaLinea()]);
    cargarFacturas();
  }

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Facturas</h2>
          <p className="text-sm text-gray-500 mt-1">{facturas.length} documento{facturas.length !== 1 ? "s" : ""} registrado{facturas.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setMostrarForm((v) => !v); setMensaje({ texto: "", tipo: "" }); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {mostrarForm ? "Cancelar" : "+ Nueva factura"}
        </button>
      </div>

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-300">Nueva factura</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Número *</label>
              <input type="text" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="factura">Factura</option>
                <option value="cotizacion">Cotización</option>
                <option value="recibo">Recibo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Cliente</label>
              <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin cliente</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Fecha *</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Vencimiento</label>
              <input type="date" value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-400">Notas</label>
              <input type="text" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Opcional"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Líneas */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 uppercase tracking-wider px-1">
              <span className="col-span-4">Descripción</span>
              <span className="col-span-2 text-right">Cant.</span>
              <span className="col-span-2 text-right">Precio</span>
              <span className="col-span-2 text-right">ITBMS</span>
              <span className="col-span-1 text-right">Total</span>
              <span className="col-span-1" />
            </div>
            {lineas.map((linea) => {
              const c = calcularLinea(linea);
              return (
                <div key={linea._id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input type="text" value={linea.descripcion} onChange={(e) => setLineas(ls => ls.map(l => l._id === linea._id ? { ...l, descripcion: e.target.value } : l))}
                      placeholder="Descripción" className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" value={linea.cantidad || ""} onChange={(e) => setLineas(ls => ls.map(l => l._id === linea._id ? { ...l, cantidad: Number(e.target.value) || 0 } : l))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" value={linea.precioUnitario || ""} onChange={(e) => setLineas(ls => ls.map(l => l._id === linea._id ? { ...l, precioUnitario: Number(e.target.value) || 0 } : l))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <select value={linea.itbmsPorcentaje} onChange={(e) => setLineas(ls => ls.map(l => l._id === linea._id ? { ...l, itbmsPorcentaje: Number(e.target.value) } : l))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value={0}>Exento</option>
                      <option value={7}>7%</option>
                      <option value={10}>10%</option>
                      <option value={15}>15%</option>
                    </select>
                  </div>
                  <div className="col-span-1 text-right font-mono text-xs text-gray-300">{formatearMoneda(c.total)}</div>
                  <div className="col-span-1 flex justify-center">
                    <button type="button" onClick={() => setLineas(ls => ls.filter(l => l._id !== linea._id))} disabled={lineas.length <= 1}
                      className="text-gray-600 hover:text-red-400 disabled:opacity-20 transition text-lg leading-none">×</button>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => setLineas(ls => [...ls, nuevaLinea()])}
              className="text-blue-400 hover:text-blue-300 text-sm transition">+ Agregar línea</button>
          </div>

          {/* Totales */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="font-mono">{formatearMoneda(totales.subtotal)}</span></div>
            <div className="flex justify-between text-yellow-400"><span>ITBMS</span><span className="font-mono">{formatearMoneda(totales.itbms)}</span></div>
            <div className="flex justify-between text-white font-semibold border-t border-gray-700 pt-2"><span>Total</span><span className="font-mono">{formatearMoneda(totales.total)}</span></div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={guardando}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              {guardando ? "Guardando..." : "Crear factura"}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {facturas.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No hay facturas registradas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Número</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Cliente</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Fecha</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Total</th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {facturas.map((f) => (
                <tr key={f.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 text-white font-mono">{f.numero}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{f.clientes_empresa?.nombre ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{new Date(f.fecha).toLocaleDateString("es-PA")}</td>
                  <td className="px-5 py-3 text-right font-mono text-white">{formatearMoneda(f.total)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs border rounded-full px-2.5 py-1 ${colorEstado[f.estado] ?? colorEstado.borrador}`}>
                      {f.estado.charAt(0).toUpperCase() + f.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={async () => {
                        const supabase = createSupabaseBrowserClient();
                        const { data: lineasDB } = await supabase.from("lineas_factura").select("*").eq("factura_id", f.id);
                        // Cargar datos completos de la empresa
                        const { data: empData } = await supabase.from("empresas").select("*").eq("id", empresaActual!.id).single();
                        // Cargar datos del cliente si existe
                        let clienteData: any = null;
                        if (f.clientes_empresa) {
                          const { data: cd } = await supabase.from("clientes_empresa").select("*").eq("empresa_id", empresaActual!.id).eq("nombre", f.clientes_empresa.nombre).single();
                          clienteData = cd;
                        }
                        generarFacturaPDF({
                          empresa: {
                            nombre: empData?.nombre ?? empresaActual?.nombre ?? "",
                            nombreComercial: empData?.nombre_comercial,
                            ruc: empData?.ruc,
                            direccion: empData?.direccion,
                            telefono: empData?.telefono,
                            email: empData?.email_empresa,
                            sitioWeb: empData?.sitio_web,
                            moneda: empData?.moneda ?? "USD",
                            logoUrl: empData?.logo_url ?? null,
                            banco: empData?.banco ?? null,
                            numeroCuenta: empData?.numero_cuenta ?? null,
                            yappy: empData?.yappy ?? null,
                          },
                          clienteNombre: f.clientes_empresa?.nombre ?? null,
                          clienteRuc: clienteData?.ruc ?? null,
                          clienteDireccion: clienteData?.direccion ?? null,
                          clienteTelefono: clienteData?.telefono ?? null,
                          numero: f.numero,
                          tipo: f.tipo,
                          fecha: new Date(f.fecha).toLocaleDateString("es-PA"),
                          fechaVencimiento: f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString("es-PA") : null,
                          validezDias: f.tipo === "cotizacion" ? 7 : null,
                          condicionPago: f.tipo === "cotizacion" ? "Crédito a 30 días" : null,
                          lineas: (lineasDB ?? []).map((l: any) => ({
                            descripcion: l.descripcion,
                            cantidad: Number(l.cantidad),
                            precioUnitario: Number(l.precio_unitario),
                            itbmsPorcentaje: Number(l.itbms_porcentaje),
                            subtotal: Number(l.subtotal),
                            itbmsMonto: Number(l.itbms_monto),
                            total: Number(l.total),
                          })),
                          subtotal: f.subtotal,
                          descuento: 0,
                          itbms: f.itbms,
                          total: f.total,
                          notas: f.notas,
                        });
                      }} className="text-green-400 hover:text-green-300 text-xs transition">
                        ↓ PDF
                      </button>
                      {f.estado !== "anulada" && (
                        <button onClick={async () => {
                          if (!confirm(`¿Anular la factura ${f.numero}? Esta acción no se puede deshacer.`)) return;
                          const supabase = createSupabaseBrowserClient();
                          await supabase.from("facturas").update({ estado: "anulada" }).eq("id", f.id);
                          cargarFacturas();
                        }} className="text-red-400 hover:text-red-300 text-xs transition">
                          Anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-700">
        ⚠ Las facturas deben validarse con un contador antes de presentarlas a la DGI de Panamá.
      </p>
    </div>
  );
}
