import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * API Route — Confirmar pago de cliente
 * Solo el administrador de la plataforma puede confirmar pagos.
 */
export async function POST(request: NextRequest) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { pagoId, empresaId, accion } = await request.json();
  if (!pagoId || !empresaId || !accion) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Actualizar estado del pago
  const { error: errPago } = await supabaseAdmin
    .from("pagos")
    .update({ estado: accion === "confirmar" ? "confirmado" : "rechazado", confirmado_por: user.email })
    .eq("id", pagoId);

  if (errPago) return NextResponse.json({ error: errPago.message }, { status: 500 });

  // Si confirmado, actualizar suscripción
  if (accion === "confirmar") {
    const proximoPago = new Date();
    proximoPago.setMonth(proximoPago.getMonth() + 1);

    await supabaseAdmin
      .from("suscripciones")
      .update({ estado: "activa", fecha_proximo_pago: proximoPago.toISOString() })
      .eq("empresa_id", empresaId);
  }

  return NextResponse.json({ ok: true });
}
