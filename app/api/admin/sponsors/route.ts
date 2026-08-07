import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClients(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) throw new Error("Falta configuración segura de Supabase en Vercel.");
  if (serviceKey === publicKey || serviceKey.startsWith("sb_publishable_")) throw new Error("SUPABASE_SECRET_KEY contiene una clave pública.");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const viewer = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return { token, viewer, admin };
}

async function assertAdmin(request: NextRequest) {
  const { token, viewer, admin } = getClients(request);
  if (!token) throw new Error("Sesión requerida.");
  const { data: userData } = await viewer.auth.getUser(token);
  if (!userData.user) throw new Error("Sesión inválida.");
  const { data: profile } = await viewer.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin") throw new Error("Solo administradores.");
  return { admin };
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await assertAdmin(request);
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const organizationName = String(body.organizationName ?? "").trim();
    const state = String(body.state ?? "").trim();
    const planCode = ["basic", "intermediate", "premium"].includes(body.planCode) ? body.planCode : "basic";
    if (!email || !organizationName || !state) return NextResponse.json({ error: "Correo, marca y estado son obligatorios." }, { status: 400 });

    const slugBase = organizationName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "patrocinador";
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const { data: org, error: orgError } = await admin.from("sponsor_organizations").insert({ name: organizationName, slug, plan_code: planCode, state, is_active: false, membership_status: "trial", contact_name: name || organizationName, contact_email: email, invited_at: new Date().toISOString(), activated_at: null }).select("id").single();
    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 400 });

    const redirectTo = `${request.nextUrl.origin}/actualizar-contrasena`;
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: name || organizationName, role: "sponsor" } });
    if (inviteError || !invited.user) {
      await admin.from("sponsor_organizations").delete().eq("id", org.id);
      return NextResponse.json({ error: inviteError?.message ?? "No se pudo invitar al patrocinador." }, { status: 400 });
    }

    const userId = invited.user.id;
    const { error: metadataError } = await admin.auth.admin.updateUserById(userId, { user_metadata: { ...invited.user.user_metadata, full_name: name || organizationName, role: "sponsor" } });
    if (metadataError) {
      await admin.auth.admin.deleteUser(userId); await admin.from("sponsor_organizations").delete().eq("id", org.id);
      return NextResponse.json({ error: metadataError.message }, { status: 400 });
    }

    const { error: profileError } = await admin.from("profiles").upsert({ id: userId, email, full_name: name || organizationName, role: "sponsor", state }, { onConflict: "id" });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId); await admin.from("sponsor_organizations").delete().eq("id", org.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const { error: memberError } = await admin.from("sponsor_members").upsert({ organization_id: org.id, user_id: userId, member_role: "owner" }, { onConflict: "organization_id,user_id" });
    if (memberError) {
      await admin.auth.admin.deleteUser(userId); await admin.from("sponsor_organizations").delete().eq("id", org.id);
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Patrocinador creado e invitación enviada." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el patrocinador." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { admin } = await assertAdmin(request);
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Falta el patrocinador." }, { status: 400 });
    const { data: currentOrg, error: currentOrgError } = await admin.from("sponsor_organizations").select("activated_at").eq("id", id).maybeSingle();
    if (currentOrgError) return NextResponse.json({ error: currentOrgError.message }, { status: 400 });
    const canActivate = Boolean(currentOrg?.activated_at);
    const requestedActive = Boolean(body.isActive) && canActivate;
    const patch = {
      name: String(body.name ?? "").trim(),
      plan_code: ["basic", "intermediate", "premium"].includes(body.planCode) ? body.planCode : "basic",
      state: String(body.state ?? "").trim() || null,
      is_active: requestedActive,
      membership_status: requestedActive ? "active" : (canActivate ? "suspended" : "trial"),
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("sponsor_organizations").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Patrocinador actualizado correctamente." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { admin } = await assertAdmin(request);
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Falta el patrocinador." }, { status: 400 });
    const { data: members, error: membersError } = await admin.from("sponsor_members").select("user_id").eq("organization_id", id);
    if (membersError) return NextResponse.json({ error: membersError.message }, { status: 400 });
    for (const member of members ?? []) await admin.auth.admin.deleteUser(String(member.user_id));
    const { error } = await admin.from("sponsor_organizations").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Patrocinador eliminado correctamente." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar." }, { status: 500 });
  }
}
