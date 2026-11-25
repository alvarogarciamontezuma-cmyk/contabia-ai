import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * API Route — Crear cliente nuevo
 * Solo accesible desde el servidor. Usa la clave secreta de Supabase.
 * El administrador de la plataforma puede crear empresas y usuarios
 * pero NO puede ver los datos contables de los clientes.
 */
export async function POST(request: NextRequest) {
  // Verificar que hay sesión activa
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const { nombreEmpresa, ruc, pais, moneda, emailUsuario, passwordUsuario } = body;

  if (!nombreEmpresa || !emailUsuario || !passwordUsuario) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  if (passwordUsuario.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  // Cliente admin con clave secreta
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Crear la empresa
  const { data: empresa, error: errEmpresa } = await supabaseAdmin
    .from("empresas")
    .insert({ nombre: nombreEmpresa, ruc: ruc || null, pais: pais || "Panamá", moneda: moneda || "USD", activa: true })
    .select().single();

  if (errEmpresa) {
    return NextResponse.json({ error: "Error creando empresa: " + errEmpresa.message }, { status: 500 });
  }

  // 2. Crear el usuario
  const { data: nuevoUsuario, error: errUsuario } = await supabaseAdmin.auth.admin.createUser({
    email: emailUsuario,
    password: passwordUsuario,
    email_confirm: true,
  });

  if (errUsuario) {
    // Si falla el usuario, eliminar la empresa creada
    await supabaseAdmin.from("empresas").delete().eq("id", empresa.id);
    return NextResponse.json({ error: "Error creando usuario: " + errUsuario.message }, { status: 500 });
  }

  // 3. Vincular usuario con empresa
  const { error: errVinculo } = await supabaseAdmin
    .from("usuarios_empresas")
    .insert({ user_id: nuevoUsuario.user.id, empresa_id: empresa.id, rol: "administrador" });

  if (errVinculo) {
    return NextResponse.json({ error: "Error vinculando usuario: " + errVinculo.message }, { status: 500 });
  }

  // 4. Crear el plan de cuentas básico para la nueva empresa
  const cuentasBase = [
    { codigo: "1.0.00", nombre: "ACTIVO",            tipo: "activo",     empresa_id: empresa.id, activa: true },
    { codigo: "1.1.01", nombre: "Caja General",      tipo: "activo",     empresa_id: empresa.id, activa: true },
    { codigo: "1.1.02", nombre: "Banco",             tipo: "activo",     empresa_id: empresa.id, activa: true },
    { codigo: "2.0.00", nombre: "PASIVO",            tipo: "pasivo",     empresa_id: empresa.id, activa: true },
    { codigo: "2.1.01", nombre: "Cuentas por pagar", tipo: "pasivo",     empresa_id: empresa.id, activa: true },
    { codigo: "3.0.00", nombre: "PATRIMONIO",        tipo: "patrimonio", empresa_id: empresa.id, activa: true },
    { codigo: "3.1.01", nombre: "Capital social",    tipo: "patrimonio", empresa_id: empresa.id, activa: true },
    { codigo: "4.0.00", nombre: "INGRESOS",          tipo: "ingreso",    empresa_id: empresa.id, activa: true },
    { codigo: "4.1.01", nombre: "Ventas",            tipo: "ingreso",    empresa_id: empresa.id, activa: true },
    { codigo: "5.0.00", nombre: "GASTOS",            tipo: "gasto",      empresa_id: empresa.id, activa: true },
    { codigo: "5.1.01", nombre: "Gastos generales",  tipo: "gasto",      empresa_id: empresa.id, activa: true },
  ];

  await supabaseAdmin.from("cuentas").insert(cuentasBase);

  return NextResponse.json({
    ok: true,
    mensaje: `Cliente creado correctamente. Empresa: ${empresa.nombre}. Usuario: ${emailUsuario}`,
    empresaId: empresa.id,
  });
}
