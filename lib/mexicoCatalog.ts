export interface MexicoStateOption {
  code: string;
  name: string;
}

export const MEXICO_STATES: MexicoStateOption[] = [
  { code: "01", name: "Aguascalientes" },
  { code: "02", name: "Baja California" },
  { code: "03", name: "Baja California Sur" },
  { code: "04", name: "Campeche" },
  { code: "05", name: "Coahuila de Zaragoza" },
  { code: "06", name: "Colima" },
  { code: "07", name: "Chiapas" },
  { code: "08", name: "Chihuahua" },
  { code: "09", name: "Ciudad de México" },
  { code: "10", name: "Durango" },
  { code: "11", name: "Guanajuato" },
  { code: "12", name: "Guerrero" },
  { code: "13", name: "Hidalgo" },
  { code: "14", name: "Jalisco" },
  { code: "15", name: "México" },
  { code: "16", name: "Michoacán de Ocampo" },
  { code: "17", name: "Morelos" },
  { code: "18", name: "Nayarit" },
  { code: "19", name: "Nuevo León" },
  { code: "20", name: "Oaxaca" },
  { code: "21", name: "Puebla" },
  { code: "22", name: "Querétaro" },
  { code: "23", name: "Quintana Roo" },
  { code: "24", name: "San Luis Potosí" },
  { code: "25", name: "Sinaloa" },
  { code: "26", name: "Sonora" },
  { code: "27", name: "Tabasco" },
  { code: "28", name: "Tamaulipas" },
  { code: "29", name: "Tlaxcala" },
  { code: "30", name: "Veracruz de Ignacio de la Llave" },
  { code: "31", name: "Yucatán" },
  { code: "32", name: "Zacatecas" },
];

export const LMB_TEAMS = [
  "Acereros de Monclova",
  "Algodoneros del Unión Laguna",
  "Bravos de León",
  "Caliente de Durango",
  "Charros de Jalisco",
  "Conspiradores de Querétaro",
  "Diablos Rojos del México",
  "Dorados de Chihuahua",
  "El Águila de Veracruz",
  "Guerreros de Oaxaca",
  "Leones de Yucatán",
  "Olmecas de Tabasco",
  "Pericos de Puebla",
  "Piratas de Campeche",
  "Rieleros de Aguascalientes",
  "Saraperos de Saltillo",
  "Sultanes de Monterrey",
  "Tecos de los Dos Laredos",
  "Tigres de Quintana Roo",
  "Toros de Tijuana",
] as const;

const STATE_ALIASES: Record<string, string> = {
  "coahuila": "Coahuila de Zaragoza",
  "estado de mexico": "México",
  "estado de méxico": "México",
  "mexico": "México",
  "michoacan": "Michoacán de Ocampo",
  "michoacán": "Michoacán de Ocampo",
  "veracruz": "Veracruz de Ignacio de la Llave",
  "cdmx": "Ciudad de México",
  "distrito federal": "Ciudad de México",
};

export function normalizeStateName(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  const exact = MEXICO_STATES.find((state) => state.name.toLocaleLowerCase("es-MX") === raw.toLocaleLowerCase("es-MX"));
  if (exact) return exact.name;
  return STATE_ALIASES[raw.toLocaleLowerCase("es-MX")] ?? raw;
}

export function getStateCode(stateName: string): string | null {
  const normalized = normalizeStateName(stateName);
  return MEXICO_STATES.find((state) => state.name === normalized)?.code ?? null;
}
