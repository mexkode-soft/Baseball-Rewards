import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) return NextResponse.json({ error: "Falta configuración segura de Supabase en Vercel." }, { status: 500 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const viewer = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: userData } = await viewer.auth.getUser(token);
  if (!userData.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
  const { data: profile } = await viewer.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const organizationName = String(body.organizationName ?? "").trim();
  const planCode = ["basic", "intermediate", "premium"].includes(body.planCode) ? body.planCode : "basic";
  if (!email || !organizationName) return NextResponse.json({ error: "Correo y marca son obligatorios." }, { status: 400 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const slugBase = organizationName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "patrocinador";
  const slug = `${slugBase}-${Date.now().toString(36)}`;
  const { data: org, error: orgError } = await admin.from("sponsor_organizations").insert({ name: organizationName, slug, plan_code: planCode }).select("id").single();
  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 400 });
  const redirectTo = `${request.nextUrl.origin}/actualizar-contrasena`;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: name, role: "sponsor" } });
  if (inviteError || !invited.user) { await admin.from("sponsor_organizations").delete().eq("id", org.id); return NextResponse.json({ error: inviteError?.message ?? "No se pudo invitar." }, { status: 400 }); }
  await admin.from("profiles").upsert({ id: invited.user.id, email, full_name: name || organizationName, role: "sponsor" });
  await admin.from("sponsor_members").insert({ organization_id: org.id, user_id: invited.user.id, member_role: "owner" });
  return NextResponse.json({ ok: true, message: "Patrocinador creado. Supabase envió una invitación para definir su contraseña." });
}
