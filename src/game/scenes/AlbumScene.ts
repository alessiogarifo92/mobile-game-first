import Phaser from 'phaser';
import { COLOR_CODES } from '../../core/colors';
import { stageProgress, stageSkin, universeSkin, type Skin } from '../../core/album';
import { VIEW } from '../../core/layout';
import { paintedTileNumbers, paintedTiles } from '../../core/mural';
import { LEVELS_PER_STAGE, stageInfo } from '../../core/stages';
import { mapUniverse } from '../../core/universeMenu';
import {
  STAGES_PER_UNIVERSE, isUniverseFinished, isUniverseUnlocked, lastLevelOf, universeLevels, universeOfStage,
} from '../../core/universes';
import { publishDebug } from '../debug';
import { LEVELS, STAGES, UNIVERSES, getProgress, setSkin, skinsUnlocked, stageTitle, t, universeTitle } from '../store';
import { drawSkin } from '../skins';
import { PAINT, THEME } from '../theme';
import { button, drawMural, label, lockIcon, progressBar, screenBackground } from '../ui';

type Point = { x: number; y: number };

/** Universes that have levels, in order: the album pages through them. */
const albumUniverses = () => UNIVERSES.filter((u) => universeLevels(LEVELS, u.id).length > 0).map((u) => u.id);

/**
 * The album (#40, #92), one universe at a time: its page shows the mural, a chip per stage and the universe's own bucket
 * style; a stage page shows its paintings (silhouettes until painted) and the bucket style the stage unlocks.
 */
export class AlbumScene extends Phaser.Scene {
  constructor() {
    super('album');
  }

  private page: { universe: number; stage?: number } = { universe: 1 };

  relayoutData(): { universe: number; stage?: number } {
    return this.page;
  }

  create(data: { universe?: number; stage?: number } = {}): void {
    screenBackground(this, THEME.bg);
    label(this, VIEW.width / 2, 64, t('album.title'), THEME.type.lg);
    if (data.stage !== undefined) this.stagePage(Math.min(Math.max(data.stage, 1), STAGES.length));
    else this.universePage(data.universe);
  }

  /** "★ Party" at the top right, once every level of the universe is painted: replays its end-of-universe party. */
  private partyButton(universe: number): Point | null {
    if (!isUniverseFinished(LEVELS, getProgress().completed, universe)) return null;
    const at = { x: VIEW.width - 100, y: 64 };
    button(this, at.x, at.y, 160, 64, `★ ${t('universes.party')}`, () => this.scene.start('universeEnd', { universe }), {
      fill: THEME.belt, color: THEME.inkCss, size: THEME.type.xs, name: 'party',
    });
    return at;
  }

  private universePage(requested?: number): void {
    const progress = getProgress();
    const list = albumUniverses();
    const universe = requested !== undefined && list.includes(requested) ? requested : mapUniverse(LEVELS, progress);
    this.page = { universe };
    const open = isUniverseUnlocked(LEVELS, progress.completed, universe);
    const info = UNIVERSES.find((u) => u.id === universe);
    const color = PAINT[COLOR_CODES[info?.color ?? 'R']!]!;
    const off = this.scale.height - VIEW.height; // extra height on tall screens

    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu', { universe }), { fill: THEME.belt, color: THEME.inkCss, name: 'home' });
    const party = this.partyButton(universe);

    // Universe pager: ‹ name ›, through every universe with levels (closed ones too, shown empty).
    const index = list.indexOf(universe);
    const pager = { prev: null as Point | null, next: null as Point | null };
    const py = 150 + off / 6;
    if (index > 0) {
      pager.prev = { x: 70, y: py };
      button(this, 70, py, 84, 64, '‹', () => this.scene.restart({ universe: list[index - 1] }), { fill: THEME.belt, color: THEME.inkCss, name: 'prev-universe' });
    }
    if (index < list.length - 1) {
      pager.next = { x: VIEW.width - 70, y: py };
      button(this, VIEW.width - 70, py, 84, 64, '›', () => this.scene.restart({ universe: list[index + 1] }), { fill: THEME.belt, color: THEME.inkCss, name: 'next-universe' });
    }
    label(this, VIEW.width / 2, py, universeTitle(universe), THEME.type.sm).setWordWrapWidth(VIEW.width - 260);

    // The mural, and how much of it is painted.
    const tiles = paintedTiles(LEVELS, progress.completed, universe);
    const size = 420;
    const mx = (VIEW.width - size) / 2;
    const my = 210 + off / 4;
    const g = this.add.graphics();
    g.fillStyle(THEME.paper, 1);
    g.fillRoundedRect(mx - 14, my - 14, size + 28, size + 28, THEME.radius.panel);
    drawMural(g, universe, tiles, mx, my, size);
    if (!open) lockIcon(g, VIEW.width / 2, my + size / 2, 120);
    const ids = universeLevels(LEVELS, universe);
    const done = ids.filter((id) => progress.completed.includes(id)).length;
    const total = STAGES_PER_UNIVERSE * LEVELS_PER_STAGE;
    const barY = my + size + 44;
    label(this, mx, barY, t('album.mural', { done, total }), THEME.type.xs, THEME.subCss).setOrigin(0, 0.5);
    progressBar(g, mx + 230, barY - 8, size - 230, 16, done / total, color);

    // A chip per stage of the universe: tap to open its page. Stages not built yet are dimmed.
    const first = (universe - 1) * STAGES_PER_UNIVERSE + 1;
    const stages = stageProgress(LEVELS, progress.completed);
    const chips: { stage: number; x: number; y: number }[] = [];
    const cw = 112, ch = 68, gap = 14;
    const cx0 = (VIEW.width - (5 * cw + 4 * gap)) / 2;
    const cy0 = barY + 40 + off / 6;
    for (let i = 0; i < STAGES_PER_UNIVERSE; i++) {
      const stage = first + i;
      const x = cx0 + (i % 5) * (cw + gap), y = cy0 + Math.floor(i / 5) * (ch + gap);
      const s = stageInfo(STAGES, stage);
      const p = stages.find((q) => q.stage === stage);
      const chip = this.add.graphics();
      chip.fillStyle(s ? PAINT[s.color]! : THEME.belt, s && open ? 1 : 0.35);
      chip.fillRoundedRect(x, y, cw, ch, THEME.radius.cell * 2);
      label(this, x + cw / 2, y + ch / 2, `${i + 1}${p?.complete ? ' ✓' : ''}`, THEME.type.sm, '#ffffff');
      if (!s || !open) continue;
      chips.push({ stage, x: x + cw / 2, y: y + ch / 2 });
      this.add.zone(x + cw / 2, y + ch / 2, cw, Math.max(ch, 88)).setInteractive({ useHandCursor: true })
        .on('pointerup', () => this.scene.start('album', { stage }));
    }

    // The universe's own bucket style (universes 2–5), earned by finishing it.
    const skin = universeSkin(universe);
    const unlocked = skin !== null && skinsUnlocked().includes(skin);
    const ry = cy0 + 2 * ch + gap + 30 + off / 6;
    const action = skin ? this.drawReward(skin, unlocked, progress.skin, ry, 'album.universeReward', t('album.universeLocked'), { universe }) : null;

    publishDebug({
      scene: 'album', universe, stage: null, open, tiles: paintedTileNumbers(tiles), chips, pager, party, skin, unlocked,
      activeSkin: progress.skin, useButton: action, scrollY: 0, offsetY: 0,
    });
  }

  private stagePage(stage: number): void {
    const universe = universeOfStage(stage);
    this.page = { universe, stage };
    const info = stageInfo(STAGES, stage)!;
    const progress = getProgress();
    const p = stageProgress(LEVELS, progress.completed).find((s) => s.stage === stage) ?? { done: 0, total: 0, complete: false };

    // Back to the universe page; the page of the universe's last stage also replays its party.
    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('album', { universe }), { fill: THEME.belt, color: THEME.inkCss, name: 'home' });
    const last = LEVELS.find((l) => l.id === lastLevelOf(LEVELS, universe))?.stage;
    const party = last === stage ? this.partyButton(universe) : null;
    const band = this.add.graphics();
    band.fillStyle(PAINT[info.color]!, 1);
    band.fillRoundedRect(80, 130, VIEW.width - 160, 70, 35);
    label(this, VIEW.width / 2, 165, `${t('map.stage', { n: stage })} · ${stageTitle(info.key)}  ${t('map.progress', { done: p.done, total: p.total })}`, THEME.type.sm, '#ffffff');

    // Up to LEVELS_PER_STAGE paintings, 5 per row.
    const levels = LEVELS.filter((l) => l.stage === stage);
    const box = 116;
    levels.forEach((level, i) => {
      const done = progress.completed.includes(level.id);
      const bx = 52 + (i % 5) * (box + 10);
      const by = 240 + Math.floor(i / 5) * (box + 50);
      const g = this.add.graphics();
      g.fillStyle(THEME.paper, 1);
      g.fillRoundedRect(bx, by, box, box, THEME.radius.cell * 2);
      const cell = Math.floor((box - 16) / Math.max(level.width, level.height));
      const ox = bx + (box - cell * level.width) / 2;
      const oy = by + (box - cell * level.height) / 2;
      level.targets.forEach((target, c) => {
        if (!target) return;
        g.fillStyle(done ? PAINT[target]! : THEME.emptyPixel, 1);
        g.fillRect(ox + (c % level.width) * cell, oy + Math.floor(c / level.width) * cell, cell, cell);
      });
      label(this, bx + box / 2, by + box + 20, done ? `#${level.id}${level.boss ? ' ★' : ''}` : '?', THEME.type.xs, THEME.subCss);
    });

    // Reward: the bucket style of this stage (a colour of its universe's style past universe 1). Stages beyond the
    // skins have no reward panel.
    const skin = stageSkin(stage);
    const unlocked = skin !== null && skinsUnlocked().includes(skin);
    // Taller screens: the reward panel moves down a little, the pager goes to the bottom edge.
    const off = this.scale.height - VIEW.height; // extra height on tall screens
    const ry = 660 + off / 2;
    const action = skin ? this.drawReward(skin, unlocked, progress.skin, ry, 'album.reward', t('album.locked', { n: LEVELS_PER_STAGE }), { stage }) : null;

    // Page through the stages of this universe.
    const first = (universe - 1) * STAGES_PER_UNIVERSE + 1;
    const count = STAGES.filter((s) => universeOfStage(s.id) === universe).length;
    if (stage > first) button(this, 140, 1100 + off, 160, 80, '‹', () => this.scene.restart({ stage: stage - 1 }), { fill: THEME.belt, color: THEME.inkCss, name: 'prev' });
    if (stage < first + count - 1) {
      button(this, VIEW.width - 140, 1100 + off, 160, 80, '›', () => this.scene.restart({ stage: stage + 1 }), { fill: THEME.belt, color: THEME.inkCss, name: 'next-stage' });
    }
    label(this, VIEW.width / 2, 1100 + off, `${stage - first + 1} / ${count}`, THEME.type.sm, THEME.subCss);

    publishDebug({
      scene: 'album', universe, stage, party, done: p.done, complete: p.complete, skin, unlocked, activeSkin: progress.skin,
      useButton: action, scrollY: this.cameras.main.scrollY, offsetY: 0,
    });
  }

  /** The panel with a bucket style to win; returns where its "use" button is, if it shows one. */
  private drawReward(
    skin: Skin, unlocked: boolean, activeSkin: Skin, ry: number, title: 'album.reward' | 'album.universeReward', locked: string,
    page: { universe?: number; stage?: number },
  ): Point | null {
    const panel = this.add.graphics();
    panel.fillStyle(THEME.paper, 1);
    panel.fillRoundedRect(60, ry, VIEW.width - 120, 330, THEME.radius.panel);
    label(this, VIEW.width / 2, ry + 50, t(title), THEME.type.md).setWordWrapWidth(VIEW.width - 160);
    const jar = this.add.graphics();
    [PAINT[1]!, PAINT[2]!, PAINT[4]!].forEach((color, k) => {
      const x = VIEW.width / 2 - 110 + k * 110;
      jar.fillStyle(color, unlocked ? 1 : 0.35);
      jar.fillRoundedRect(x - 42, ry + 100, 84, 84, THEME.radius.jar);
      drawSkin(jar, skin, x, ry + 142, 84, unlocked ? 1 : 0.35);
      jar.lineStyle(3, THEME.ink, unlocked ? 1 : 0.35);
      jar.strokeRoundedRect(x - 42, ry + 100, 84, 84, THEME.radius.jar);
    });
    let action: Point | null = null;
    if (!unlocked) {
      label(this, VIEW.width / 2, ry + 250, locked, THEME.type.sm, THEME.subCss, false).setWordWrapWidth(VIEW.width - 180);
    } else if (activeSkin === skin) {
      button(this, VIEW.width / 2, ry + 260, 300, 76, t('album.inUse'), () => this.scene.restart(page), {
        fill: THEME.belt, color: THEME.inkCss, size: THEME.type.sm, name: 'skin-in-use',
      });
    } else {
      action = { x: VIEW.width / 2, y: ry + 260 };
      button(this, action.x, action.y, 300, 76, t('album.use'), () => {
        setSkin(skin);
        this.scene.restart(page);
      }, { size: THEME.type.sm, name: 'skin-use' });
    }
    return action;
  }
}
