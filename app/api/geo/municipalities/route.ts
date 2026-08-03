import { NextRequest, NextResponse } from "next/server";

interface InegiMunicipality {
  nomgeo?: string;
  nom_agem?: string;
  nombre?: string;
}

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";

  if (!/^([0-2][0-9]|3[0-2])$/.test(state) || state === "00") {
    return NextResponse.json({ error: "Clave de estado inválida." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://gaia.inegi.org.mx/wscatgeo/v2/mgem/${state}`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`INEGI respondió ${response.status}`);
    }

    const payload = await response.json() as { datos?: InegiMunicipality[] } | InegiMunicipality[];
    const records = Array.isArray(payload) ? payload : payload.datos ?? [];
    const municipalities = records
      .map((item) => item.nomgeo ?? item.nom_agem ?? item.nombre ?? "")
      .map((name) => name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es-MX"));

    return NextResponse.json(
      { municipalities },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (error) {
    console.error("No fue posible consultar municipios en INEGI:", error);
    return NextResponse.json({ error: "No fue posible cargar los municipios." }, { status: 502 });
  }
}
