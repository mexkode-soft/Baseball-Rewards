export type QrCampaignStatus = "draft" | "scheduled" | "active";

export interface QrCodeRecord {
  id: string;
  token: string;
  payload: string;
  label: string;
  isWinner: boolean;
  reward: string;
  points: number;
  scannedBy: string[];
  totalScans: number;
}

export interface QrCampaign {
  id: string;
  type: "qr";
  name: string;
  sponsor: string;
  description: string;
  startDate: string;
  endDate: string;
  status: QrCampaignStatus;
  attemptsPerUser: number;
  participationPoints: number;
  winnerPoints: number;
  reward: string;
  createdAt: string;
  codes: QrCodeRecord[];
}

export interface QrScanResult {
  ok: boolean;
  status:
    | "winner"
    | "not_winner"
    | "invalid"
    | "duplicate"
    | "limit_reached"
    | "inactive"
    | "wrong_campaign";
  message: string;
  campaign?: QrCampaign;
  code?: QrCodeRecord;
  pointsAwarded?: number;
}

export interface QrCapture {
  id: string;
  campaignId: string;
  campaignName: string;
  sponsor: string;
  codeId: string;
  codeLabel: string;
  isWinner: boolean;
  reward: string;
  points: number;
  capturedAt: string;
}

const CAMPAIGNS_KEY = "hrr-qr-campaigns-v1";
const USER_ID_KEY = "hrr-demo-user-id";
const SCANS_KEY = "hrr-qr-user-scans-v1";
const POINTS_KEY = "hrr-demo-points-v1";
const POINT_EVENTS_KEY = "hrr-point-events-v1";
const CAPTURES_KEY = "hrr-qr-captures-v1";

function randomPart(length = 16) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (value) =>
      value
        .toString(36)
        .padStart(2, "0")
  )
    .join("")
    .slice(0, length)
    .toUpperCase();
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${randomPart(8)}`;
}

export function createQrPayload(
  campaignId: string,
  token: string
) {
  return `HRR|QR|${campaignId}|${token}`;
}

export function generateQrCodes(options: {
  campaignId: string;
  total: number;
  winners: number;
  reward: string;
  participationPoints: number;
  winnerPoints: number;
}): QrCodeRecord[] {
  const total = Math.max(
    1,
    Math.floor(options.total)
  );

  const winners = Math.max(
    0,
    Math.min(
      total,
      Math.floor(options.winners)
    )
  );

  const winnerIndexes =
    new Set<number>();

  while (
    winnerIndexes.size < winners
  ) {
    winnerIndexes.add(
      Math.floor(
        Math.random() * total
      )
    );
  }

  return Array.from(
    { length: total },
    (_, index) => {
      const token =
        randomPart(24);

      const isWinner =
        winnerIndexes.has(index);

      return {
        id: createId("code"),
        token,
        payload:
          createQrPayload(
            options.campaignId,
            token
          ),
        label: `QR-${String(
          index + 1
        ).padStart(3, "0")}`,
        isWinner,
        reward: isWinner
          ? options.reward
          : "",
        points: isWinner
          ? options.winnerPoints
          : options.participationPoints,
        scannedBy: [],
        totalScans: 0,
      };
    }
  );
}

export function readQrCampaigns(): QrCampaign[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        CAMPAIGNS_KEY
      );

    return raw
      ? (JSON.parse(raw) as QrCampaign[])
      : [];
  } catch {
    return [];
  }
}

export function readActiveQrCampaigns() {
  const now = new Date();

  return readQrCampaigns().filter(
    (campaign) => {
      if (
        campaign.status !== "active"
      ) {
        return false;
      }

      if (
        campaign.startDate &&
        now <
          new Date(
            `${campaign.startDate}T00:00:00`
          )
      ) {
        return false;
      }

      if (
        campaign.endDate &&
        now >
          new Date(
            `${campaign.endDate}T23:59:59`
          )
      ) {
        return false;
      }

      return true;
    }
  );
}

export function saveQrCampaign(
  campaign: QrCampaign
) {
  const campaigns =
    readQrCampaigns();

  const index =
    campaigns.findIndex(
      (item) =>
        item.id === campaign.id
    );

  if (index >= 0) {
    campaigns[index] = campaign;
  } else {
    campaigns.unshift(campaign);
  }

  window.localStorage.setItem(
    CAMPAIGNS_KEY,
    JSON.stringify(campaigns)
  );

  window.dispatchEvent(
    new CustomEvent(
      "hrr-qr-campaigns-updated"
    )
  );
}

export function getDemoUserId() {
  if (
    typeof window === "undefined"
  ) {
    return "demo-user";
  }

  const current =
    window.localStorage.getItem(
      USER_ID_KEY
    );

  if (current) {
    return current;
  }

  const generated =
    createId("user");

  window.localStorage.setItem(
    USER_ID_KEY,
    generated
  );

  return generated;
}

function readUserScans(): Record<
  string,
  string[]
> {
  try {
    const raw =
      window.localStorage.getItem(
        SCANS_KEY
      );

    return raw
      ? (JSON.parse(raw) as Record<
          string,
          string[]
        >)
      : {};
  } catch {
    return {};
  }
}

function addPoints(
  points: number,
  campaign: QrCampaign,
  code: QrCodeRecord
) {
  const current = Number(
    window.localStorage.getItem(
      POINTS_KEY
    ) ?? "0"
  );

  const next =
    current + points;

  window.localStorage.setItem(
    POINTS_KEY,
    String(next)
  );

  let events: unknown[] = [];

  try {
    events = JSON.parse(
      window.localStorage.getItem(
        POINT_EVENTS_KEY
      ) ?? "[]"
    ) as unknown[];
  } catch {
    events = [];
  }

  events.unshift({
    id: createId("points"),
    campaignId: campaign.id,
    campaignName:
      campaign.name,
    codeId: code.id,
    points,
    createdAt:
      new Date().toISOString(),
  });

  window.localStorage.setItem(
    POINT_EVENTS_KEY,
    JSON.stringify(events)
  );

  window.dispatchEvent(
    new CustomEvent(
      "hrr-points-updated",
      {
        detail: {
          total: next,
        },
      }
    )
  );
}

function saveCapture(
  campaign: QrCampaign,
  code: QrCodeRecord
) {
  let captures: QrCapture[] = [];

  try {
    captures = JSON.parse(
      window.localStorage.getItem(
        CAPTURES_KEY
      ) ?? "[]"
    ) as QrCapture[];
  } catch {
    captures = [];
  }

  const capture: QrCapture = {
    id: createId("capture"),
    campaignId: campaign.id,
    campaignName:
      campaign.name,
    sponsor:
      campaign.sponsor,
    codeId: code.id,
    codeLabel:
      code.label,
    isWinner:
      code.isWinner,
    reward:
      code.reward,
    points:
      code.points,
    capturedAt:
      new Date().toISOString(),
  };

  captures.unshift(capture);

  window.localStorage.setItem(
    CAPTURES_KEY,
    JSON.stringify(captures)
  );

  window.dispatchEvent(
    new CustomEvent(
      "hrr-qr-captures-updated"
    )
  );
}

export function readQrCaptures(): QrCapture[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(
        CAPTURES_KEY
      ) ?? "[]"
    ) as QrCapture[];
  } catch {
    return [];
  }
}

export function validateQrPayload(
  payload: string,
  expectedCampaignId?: string
): QrScanResult {
  const [
    brand,
    type,
    campaignId,
    token,
  ] = payload
    .trim()
    .split("|");

  if (
    brand !== "HRR" ||
    type !== "QR" ||
    !campaignId ||
    !token
  ) {
    return {
      ok: false,
      status: "invalid",
      message:
        "Este código no pertenece a Home Run Rewards.",
    };
  }

  if (
    expectedCampaignId &&
    campaignId !==
      expectedCampaignId
  ) {
    return {
      ok: false,
      status: "wrong_campaign",
      message:
        "Este QR pertenece a otra campaña. Busca uno de la campaña seleccionada.",
    };
  }

  const campaigns =
    readQrCampaigns();

  const campaignIndex =
    campaigns.findIndex(
      (item) =>
        item.id === campaignId
    );

  const campaign =
    campaigns[campaignIndex];

  if (!campaign) {
    return {
      ok: false,
      status: "invalid",
      message:
        "No encontramos una campaña asociada a este código.",
    };
  }

  if (
    campaign.status !== "active"
  ) {
    return {
      ok: false,
      status: "inactive",
      message:
        "Esta campaña todavía no está activa o ya finalizó.",
    };
  }

  const now = new Date();

  if (
    campaign.startDate &&
    now <
      new Date(
        `${campaign.startDate}T00:00:00`
      )
  ) {
    return {
      ok: false,
      status: "inactive",
      message:
        "La campaña aún no comienza.",
    };
  }

  if (
    campaign.endDate &&
    now >
      new Date(
        `${campaign.endDate}T23:59:59`
      )
  ) {
    return {
      ok: false,
      status: "inactive",
      message:
        "La campaña ya finalizó.",
    };
  }

  const codeIndex =
    campaign.codes.findIndex(
      (item) =>
        item.token === token
    );

  const code =
    campaign.codes[codeIndex];

  if (!code) {
    return {
      ok: false,
      status: "invalid",
      message:
        "El QR no es válido para esta campaña.",
    };
  }

  const userId =
    getDemoUserId();

  const scans =
    readUserScans();

  const userCampaignScans =
    scans[campaign.id] ?? [];

  if (
    userCampaignScans.includes(
      code.id
    )
  ) {
    return {
      ok: false,
      status: "duplicate",
      message:
        "Ya escaneaste este código. Busca otro para seguir participando.",
      campaign,
      code,
    };
  }

  if (
    userCampaignScans.length >=
    campaign.attemptsPerUser
  ) {
    return {
      ok: false,
      status: "limit_reached",
      message:
        "Ya alcanzaste el límite de intentos de esta campaña.",
      campaign,
      code,
    };
  }

  scans[campaign.id] = [
    ...userCampaignScans,
    code.id,
  ];

  window.localStorage.setItem(
    SCANS_KEY,
    JSON.stringify(scans)
  );

  const updatedCode:
    QrCodeRecord = {
    ...code,
    scannedBy:
      code.scannedBy.includes(
        userId
      )
        ? code.scannedBy
        : [
            ...code.scannedBy,
            userId,
          ],
    totalScans:
      code.totalScans + 1,
  };

  const updatedCampaign:
    QrCampaign = {
    ...campaign,
    codes:
      campaign.codes.map(
        (item, index) =>
          index === codeIndex
            ? updatedCode
            : item
      ),
  };

  campaigns[campaignIndex] =
    updatedCampaign;

  window.localStorage.setItem(
    CAMPAIGNS_KEY,
    JSON.stringify(campaigns)
  );

  addPoints(
    updatedCode.points,
    updatedCampaign,
    updatedCode
  );

  saveCapture(
    updatedCampaign,
    updatedCode
  );

  if (
    updatedCode.isWinner
  ) {
    return {
      ok: true,
      status: "winner",
      message: `¡Felicidades! Ganaste ${updatedCode.reward}.`,
      campaign:
        updatedCampaign,
      code:
        updatedCode,
      pointsAwarded:
        updatedCode.points,
    };
  }

  return {
    ok: true,
    status: "not_winner",
    message:
      "Este código no contiene premio. Sigue participando.",
    campaign:
      updatedCampaign,
    code:
      updatedCode,
    pointsAwarded:
      updatedCode.points,
  };
}

export function readDemoPoints() {
  if (
    typeof window === "undefined"
  ) {
    return 0;
  }

  return Number(
    window.localStorage.getItem(
      POINTS_KEY
    ) ?? "0"
  );
}
