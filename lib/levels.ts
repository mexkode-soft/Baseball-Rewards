export interface Level {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  active: boolean;
  order: number;
}

export const LEVELS_STORAGE_KEY =
  "hrr-levels";

export const LEVELS_UPDATED_EVENT =
  "hrr-levels-updated";

export const DEFAULT_LEVELS: Level[] = [
  {
    id: "level-novato",
    name: "Novato",
    minPoints: 0,
    maxPoints: 200,
    active: true,
    order: 1,
  },
  {
    id: "level-all-star",
    name: "All Star",
    minPoints: 201,
    maxPoints: 500,
    active: true,
    order: 2,
  },
  {
    id: "level-leyenda",
    name: "Leyenda",
    minPoints: 501,
    maxPoints: null,
    active: true,
    order: 3,
  },
];

function normalizeLevels(
  levels: Level[]
): Level[] {
  return [...levels]
    .sort(
      (first, second) =>
        first.minPoints -
        second.minPoints
    )
    .map(
      (
        level,
        index
      ) => ({
        ...level,
        order: index + 1,
      })
    );
}

export function readLevels(): Level[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return DEFAULT_LEVELS;
  }

  const stored =
    window.localStorage.getItem(
      LEVELS_STORAGE_KEY
    );

  if (!stored) {
    return DEFAULT_LEVELS;
  }

  try {
    const parsed =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return DEFAULT_LEVELS;
    }

    return normalizeLevels(
      parsed as Level[]
    );
  } catch {
    return DEFAULT_LEVELS;
  }
}

export function saveLevels(
  levels: Level[]
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const normalized =
    normalizeLevels(levels);

  window.localStorage.setItem(
    LEVELS_STORAGE_KEY,
    JSON.stringify(normalized)
  );

  window.dispatchEvent(
    new CustomEvent(
      LEVELS_UPDATED_EVENT
    )
  );
}

export function getLevelByPoints(
  points: number,
  levels: Level[] =
    DEFAULT_LEVELS
): Level | null {
  const normalizedPoints =
    Math.max(
      0,
      Number(points) || 0
    );

  const activeLevels =
    normalizeLevels(
      levels.filter(
        (level) =>
          level.active
      )
    );

  return (
    activeLevels.find(
      (level) =>
        normalizedPoints >=
          level.minPoints &&
        (
          level.maxPoints ===
            null ||
          normalizedPoints <=
            level.maxPoints
        )
    ) ?? null
  );
}

export function getNextLevel(
  points: number,
  levels: Level[]
): Level | null {
  const normalizedPoints =
    Math.max(
      0,
      Number(points) || 0
    );

  return (
    normalizeLevels(
      levels.filter(
        (level) =>
          level.active
      )
    ).find(
      (level) =>
        level.minPoints >
        normalizedPoints
    ) ?? null
  );
}

export function getLevelProgress(
  points: number,
  level: Level
): number {
  if (
    level.maxPoints ===
    null
  ) {
    return 100;
  }

  const range =
    level.maxPoints -
    level.minPoints +
    1;

  if (range <= 0) {
    return 0;
  }

  const completed =
    points -
    level.minPoints +
    1;

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (completed / range) *
          100
      )
    )
  );
}
