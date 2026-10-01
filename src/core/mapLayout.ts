/** Geometry of the scrolling level map (world coordinates, y grows downward). Pure, so it is unit-tested. */

export interface MapLevel {
  id: number;
  stage: number;
  boss?: boolean;
}

export interface MapNode extends MapLevel {
  x: number;
  y: number;
  r: number;
}

export interface MapHeader {
  stage: number;
  y: number;
  /** Number of levels the stage holds so far. */
  count: number;
}

export interface MapLayout {
  width: number;
  height: number;
  nodes: MapNode[];
  headers: MapHeader[];
}

export const MAP = {
  /** Fixed title bar at the top of the screen; nodes scroll underneath it. */
  barHeight: 240,
  step: 112,
  /** Distance from the last node of a stage to the first node of the next one. */
  headerGap: 230,
  /** Header band centre, above the last node of the previous stage: clears its boss star and the next node. */
  headerOffset: 125,
  bottomPad: 80,
  /** Room above the top node: its boss star must clear the fixed title bar at scroll 0. */
  topPad: 150,
  swing: 190,
  radius: 32,
  bossRadius: 44,
} as const;

/** Level 1 sits at the bottom; the path climbs, with a header band where each stage starts. */
export function computeMapLayout(levels: readonly MapLevel[], width: number, viewHeight: number): MapLayout {
  const fromBottom: { level: MapLevel; d: number }[] = [];
  const headerAt: { stage: number; d: number; count: number }[] = [];
  let d = MAP.bottomPad;
  let previousStage: number | null = null;
  for (const level of levels) {
    if (level.stage !== previousStage) {
      headerAt.push({ stage: level.stage, d: previousStage === null ? d + MAP.headerOffset - 60 : d + MAP.headerOffset, count: 0 });
      d += MAP.headerGap;
      previousStage = level.stage;
    } else {
      d += MAP.step;
    }
    headerAt[headerAt.length - 1]!.count += 1;
    fromBottom.push({ level, d });
  }
  // Short maps still fill the screen below the bar, so the path starts at the bottom edge.
  const height = Math.max(d + MAP.topPad + MAP.barHeight, viewHeight);
  return {
    width,
    height,
    nodes: fromBottom.map(({ level, d: dist }, i) => ({
      ...level,
      x: width / 2 + Math.sin(i * 1.1) * MAP.swing,
      y: height - dist,
      r: level.boss ? MAP.bossRadius : MAP.radius,
    })),
    headers: headerAt.map((h) => ({ stage: h.stage, y: height - h.d, count: h.count })),
  };
}

export function maxScroll(layout: MapLayout, viewHeight: number): number {
  return Math.max(0, layout.height - viewHeight);
}

export function clampScroll(scroll: number, layout: MapLayout, viewHeight: number): number {
  return Math.min(Math.max(scroll, 0), maxScroll(layout, viewHeight));
}

/** Scroll that puts the given level a little below the middle of the visible area. */
export function scrollToLevel(layout: MapLayout, levelId: number, viewHeight: number): number {
  const node = layout.nodes.find((n) => n.id === levelId) ?? layout.nodes[0];
  if (!node) return 0;
  const visibleMiddle = MAP.barHeight + (viewHeight - MAP.barHeight) * 0.6;
  return clampScroll(node.y - visibleMiddle, layout, viewHeight);
}

/** The level the map opens on: the first unlocked level not yet completed, else the last unlocked. */
export function currentLevel(unlocked: number, completed: readonly number[], levelCount: number): number {
  for (let id = 1; id <= Math.min(unlocked, levelCount); id++) if (!completed.includes(id)) return id;
  return Math.max(1, Math.min(unlocked, levelCount));
}

/** Momentum after a flick: velocity decays each frame; returns the new scroll and velocity. */
export function inertia(scroll: number, velocity: number, dtMs: number, layout: MapLayout, viewHeight: number): { scroll: number; velocity: number } {
  const next = clampScroll(scroll + velocity * dtMs, layout, viewHeight);
  const decayed = velocity * Math.pow(0.92, dtMs / 16);
  const stopped = Math.abs(decayed) < 0.02 || next === 0 || next === maxScroll(layout, viewHeight);
  return { scroll: next, velocity: stopped ? 0 : decayed };
}
