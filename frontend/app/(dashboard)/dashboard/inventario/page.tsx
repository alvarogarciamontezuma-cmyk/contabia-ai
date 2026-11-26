"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useContabia } from "@/lib/store/ContabiaContext";
import { formatearMoneda } from "@/lib/contabilidad/motorContable";

interface Producto {
  id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  tipo: "producto" | "servicio";
  precio_venta: number;
  costo: number;
  itbms_porcentaje: number;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
  activo: boolean;
}

interface MovimientoInventario {
  id: string;
  tipo: "entrada" | "salida" | "ajuste";
  cantidad: number;
  costo_unitario: number | null;
  descripcion: string;
  fecha: string;
  productos: { nombre: string } | null;
}

export default function InventarioPage() {
  const { empresaActual } = useContabia();
  const [montado, setMontado] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<"productos" | "movimientos">("productos");
  const [mostrarFormProducto, setMostrarFormProducto] = useState(false);
  const [mostrarFormMovimiento, setMostrarFormMovimiento] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });

  const [formProducto, setFormProducto] = useState({
    codigo: "", nombre: "", descripcion: "", tipo: "producto",
    precioVenta: "", costo: "", itbmsPorcentaje: "7",
    stockMinimo: "0", unidad: "unidad",
  });

  const [formMovimiento, setFormMovimiento] = useState({
    productoId: "", tipo: "entrada", cantidad: "", costoUnitario: "",
    descripcion: "", fecha: "",
  });

  useEffect(() => {
    setMontado(true);
    const hoy = new Date();
    setFormMovimiento((f) => ({ ...f, fecha: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}` }));
  }, []);

  useEffect(() => { if (montado && empresaActual) { cargarProductos(); cargarMovimientos(); } }, [montado, empresaActual?.id]);

  async function cargarProductos() {
    if (!empresaActual) return;
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("productos").select("*").eq("empresa_id", empresaActual.id).order("nombre");
    setProductos((data ?? []) as Producto[]);
    setCargando(false);
  }

  async function cargarMovimientos() {
    if (!empresaActual) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("movimientos_inventario")
      .select("*, productos(nombre)").eq("empresa_id", empresaActual.id)
      .order("fecha", { ascending: false }).limit(50);
    setMovimientos((data ?? []) as MovimientoInventario[]);
  }

  async function handleGuardarProducto(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!formProducto.nombre.trim()) { setMensaje({ texto: "El nombre es obligatorio.", tipo: "error" }); return; }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("productos").insert({
      empresa_id: empresaActual!.id,
      codigo: formProducto.codigo.trim() || null,
      nombre: formProducto.nombre.trim(),
      descripcion: formProducto.descripcion.trim() || null,
      tipo: formProducto.tipo,
      precio_venta: parseFloat(formProducto.precioVenta) || 0,
      costo: parseFloat(formProducto.costo) || 0,
      itbms_porcentaje: parseFloat(formProducto.itbmsPorcentaje) || 0,
      stock_actual: 0,
      stock_minimo: parseFloat(formProducto.stockMinimo) || 0,
      unidad: formProducto.unidad,
    });
    if (error) { setMensaje({ texto: "Error: " + error.message, tipo: "error" }); return; }
    setMensaje({ texto: "Producto creado.", tipo: "exito" });
    setMostrarFormProducto(false);
    setFormProducto({ codigo: "", nombre: "", descripcion: "", tipo: "producto", precioVenta: "", costo: "", itbmsPorcentaje: "7", stockMinimo: "0", unidad: "unidad" });
    cargarProductos();
  }

  async function handleGuardarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    if (!formMovimiento.productoId) { setMensaje({ texto: "Selecciona un producto.", tipo: "error" }); return; }
    if (!formMovimiento.cantidad) { setMensaje({ texto: "La cantidad es obligatoria.", tipo: "error" }); return; }
    if (!formMovimiento.descripcion.trim()) { setMensaje({ texto: "La descripción es obligatoria.", tipo: "error" }); return; }

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cantidad = parseFloat(formMovimiento.cantidad);

    const { error: errMov } = await supabase.from("movimientos_inventario").insert({
      producto_id: formMovimiento.productoId, empresa_id: empresaActual!.id,
      tipo: formMovimiento.tipo, cantidad,
      costo_unitario: parseFloat(formMovimiento.costoUnitario) || null,
      descripcion: formMovimiento.descripcion.trim(),
      fecha: formMovimiento.fecha, creado_por: user?.email ?? "sistema",
    });
    if (errMov) { setMensaje({ texto: "Error: " + errMov.message, tipo: "error" }); return; }

    // Actualizar stock
    const producto = productos.find(p => p.id === formMovimiento.productoId);
    if (producto) {
      const delta = formMovimiento.tipo === "entrada" ? cantidad : formMovimiento.tipo === "salida" ? -cantidad : cantidad;
      await supabase.from("productos").update({ stock_actual: producto.stock_actual + delta }).eq("id", producto.id);
    }

    setMensaje({ texto: "Movimiento registrado.", tipo: "exito" });
    setMostrarFormMovimiento(false);
    setFormMovimiento((f) => ({ ...f, productoId: "", cantidad: "", costoUnitario: "", descripcion: "" }));
    cargarProductos();
    cargarMovimientos();
  }

  const productosConStockBajo = productos.filter(p => p.tipo === "producto" && p.stock_actual <= p.stock_minimo && p.stock_minimo > 0);

  if (!montado || cargando) return <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Inventario</h2>
        <p className="text-sm text-gray-500 mt-1">{productos.length} producto{productos.length !== 1 ? "s" : ""} y servicio{productos.length !== 1 ? "s" : ""}</p>
      </div>

      {productosConStockBajo.length > 0 && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-300 font-medium">⚠ Stock bajo: {productosConStockBajo.map(p => p.nombre).join(", ")}</p>
        </div>
      )}

      {mensaje.texto && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${mensaje.tipo === "exito" ? "bg-green-950 border-green-800 text-green-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setVista("productos")} className={`px-4 py-2 rounded-lg text-sm transition ${vista === "productos" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}>
          📦 Productos y servicios
        </button>
        <button onClick={() => setVista("movimientos")} className={`px-4 py-2 rounded-lg text-sm transition ${vista === "movimientos" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}>
          🔄 Movimientos
        </button>
      </div>

      {/* ── PRODUCTOS ── */}
      {vista === "productos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setMostrarFormProducto((v) => !v)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {mostrarFormProducto ? "Cancelar" : "+ Nuevo producto"}
            </button>
          </div>

          {mostrarFormProducto && (
            <form onSubmit={handleGuardarProducto} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">Nuevo producto / servicio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: "pcodigo", label: "Código", campo: "codigo" as const, placeholder: "SKU-001" },
                  { id: "pnombre", label: "Nombre *", campo: "nombre" as const, placeholder: "Nombre del producto" },
                  { id: "punidad", label: "Unidad", campo: "unidad" as const, placeholder: "unidad, kg, hora..." },
                  { id: "pprecio", label: "Precio de venta", campo: "precioVenta" as const, placeholder: "0.00" },
                  { id: "pcosto", label: "Costo", campo: "costo" as const, placeholder: "0.00" },
                  { id: "pstock_min", label: "Stock mínimo", campo: "stockMinimo" as const, placeholder: "0" },
                ].map(({ id, label, campo, placeholder }) => (
                  <div key={id} className="space-y-1">
                    <label htmlFor={id} className="block text-sm text-gray-400">{label}</label>
                    <input id={id} type="text" value={formProducto[campo]} onChange={(e) => setFormProducto({ ...formProducto, [campo]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Tipo</label>
                  <select value={formProducto.tipo} onChange={(e) => setFormProducto({ ...formProducto, tipo: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">ITBMS</label>
                  <select value={formProducto.itbmsPorcentaje} onChange={(e) => setFormProducto({ ...formProducto, itbmsPorcentaje: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="0">Exento</option>
                    <option value="7">7%</option>
                    <option value="10">10%</option>
                    <option value="15">15%</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition">Crear</button>
                <button type="button" onClick={() => setMostrarFormProducto(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition">Cancelar</button>
              </div>
            </form>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {productos.length === 0 ? (
              <p className="text-center text-gray-600 text-sm py-10">No hay productos registrados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Nombre</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Tipo</th>
                    <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Precio</th>
                    <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden md:table-cell">Costo</th>
                    <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {productos.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/50 transition">
                      <td className="px-5 py-3">
                        <p className="text-white">{p.nombre}</p>
                        {p.codigo && <p className="text-xs text-gray-600 font-mono">{p.codigo}</p>}
                      </td>
                      <td className="px-5 py-3 text-gray-400 capitalize hidden sm:table-cell">{p.tipo}</td>
                      <td className="px-5 py-3 text-right font-mono text-white">{formatearMoneda(p.precio_venta)}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-400 hidden md:table-cell">{formatearMoneda(p.costo)}</td>
                      <td className={`px-5 py-3 text-right font-mono font-semibold ${p.tipo === "servicio" ? "text-gray-500" : p.stock_actual <= p.stock_minimo && p.stock_minimo > 0 ? "text-red-400" : "text-green-400"}`}>
                        {p.tipo === "servicio" ? "—" : `${p.stock_actual} ${p.unidad}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── MOVIMIENTOS ── */}
      {vista === "movimientos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setMostrarFormMovimiento((v) => !v)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {mostrarFormMovimiento ? "Cancelar" : "+ Registrar movimiento"}
            </button>
          </div>

          {mostrarFormMovimiento && (
            <form onSubmit={handleGuardarMovimiento} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">Nuevo movimiento de inventario</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-sm text-gray-400">Producto *</label>
                  <select value={formMovimiento.productoId} onChange={(e) => setFormMovimiento({ ...formMovimiento, productoId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar producto</option>
                    {productos.filter(p => p.tipo === "producto").map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Tipo</label>
                  <select value={formMovimiento.tipo} onChange={(e) => setFormMovimiento({ ...formMovimiento, tipo: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Cantidad *</label>
                  <input type="number" min="0" step="0.01" value={formMovimiento.cantidad} onChange={(e) => setFormMovimiento({ ...formMovimiento, cantidad: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Costo unitario</label>
                  <input type="number" min="0" step="0.01" value={formMovimiento.costoUnitario} onChange={(e) => setFormMovimiento({ ...formMovimiento, costoUnitario: e.target.value })}
                    placeholder="Opcional"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-gray-400">Fecha</label>
                  <input type="date" value={formMovimiento.fecha} onChange={(e) => setFormMovimiento({ ...formMovimiento, fecha: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="block text-sm text-gray-400">Descripción *</label>
                  <input type="text" value={formMovimiento.descripcion} onChange={(e) => setFormMovimiento({ ...formMovimiento, descripcion: e.target.value })}
                    placeholder="Ej: Compra a proveedor, venta a cliente..."
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
              <p className="text-center text-gray-600 text-sm py-10">No hay movimientos registrados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Fecha</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3">Producto</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase px-5 py-3 hidden sm:table-cell">Descripción</th>
                    <th className="text-center text-xs text-gray-500 font-semibold uppercase px-5 py-3">Tipo</th>
                    <th className="text-right text-xs text-gray-500 font-semibold uppercase px-5 py-3">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {movimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-800/50 transition">
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(m.fecha).toLocaleDateString("es-PA")}</td>
                      <td className="px-5 py-3 text-white">{m.productos?.nombre ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{m.descripcion}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs border rounded-full px-2.5 py-1 ${m.tipo === "entrada" ? "bg-green-950 text-green-400 border-green-800" : m.tipo === "salida" ? "bg-red-950 text-red-400 border-red-800" : "bg-yellow-950 text-yellow-400 border-yellow-800"}`}>
                          {m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-right font-mono font-semibold ${m.tipo === "entrada" ? "text-green-400" : "text-red-400"}`}>
                        {m.tipo === "entrada" ? "+" : "-"}{m.cantidad}
                      </td>
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
