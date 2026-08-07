import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !publicKey || !serviceKey) return NextResponse.json({ error: "Falta configuración de Supabase." }, { status: 500 });

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!token) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

    const viewer = createClient(url, publicKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await viewer.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

    const userId = userData.user.id;
    const { data: memberships, error: memberError } = await admin.from("sponsor_members").select("organization_id").eq("user_id", userId);
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });
    const organizationIds = (memberships ?? []).map((row) => String(row.organization_id));
    if (!organizationIds.length) return NextResponse.json({ ok: true, activated: 0 });

    const now = new Date().toISOString();
    const { error: orgError } = await admin.from("sponsor_organizations").update({ is_active: true, membership_status: "active", activated_at: now, updated_at: now }).in("id", organizationIds);
    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 400 });

    await admin.from("profiles").update({ role: "sponsor", updated_at: now }).eq("id", userId);
    return NextResponse.json({ ok: true, activated: organizationIds.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo activar el patrocinador." }, { status: 500 });
  }
}
