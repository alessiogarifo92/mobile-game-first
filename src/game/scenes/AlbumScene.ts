import Phaser from 'phaser';
import { stageProgress, stageSkin, type Skin } from '../../core/album';
import { VIEW } from '../../core/layout';
import { LEVELS_PER_STAGE, stageInfo } from '../../core/stages';
import { publishDebug } from '../debug';
import { LEVELS, STAGES, getProgress, setSkin, skinsUnlocked, stageTitle, t } from '../store';
import { drawSkin } from '../skins';
import { PAINT, THEME } from '../theme';
import { button, label, screenBackground } from '../ui';

/** One album page per stage: its paintings (silhouettes until painted) and the bucket skin it unlocks, if any. */
export class AlbumScene extends Phaser.Scene {
  constructor() {
    super('album');
  }

  private stageNow = 1;

  relayoutData(): { stage: number } {
    return { stage: this.stageNow };
  }

  create(data: { stage?: number } = {}): void {
    const stage = Math.min(Math.max(data.stage ?? 1, 1), STAGES.length);
    this.stageNow = stage;
    const info = stageInfo(STAGES, stage)!;
    const progress = getProgress();
    const p = stageProgress(LEVELS, progress.completed).find((s) => s.stage === stage) ?? { done: 0, total: 0, complete: false };
    screenBackground(this, THEME.bg);

    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu'), { fill: THEME.belt, color: THEME.inkCss, name: 'home' });
    label(this, VIEW.width / 2, 64, t('album.title'), THEME.type.lg);
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

    // Reward: the bucket skin of this stage. Stages beyond the skin list have no reward panel.
    const skin = stageSkin(stage);
    const unlocked = skin !== null && skinsUnlocked().includes(skin);
    // Taller screens: the reward panel moves down a little, the pager goes to the bottom edge.
    const off = this.scale.height - VIEW.height; // extra height on tall screens
    const ry = 660 + off / 2;
    const action = skin ? this.drawReward(skin, unlocked, progress.skin, stage, ry) : null;

    // Page through the stages.
    if (stage > 1) button(this, 140, 1100 + off, 160, 80, '‹', () => this.scene.restart({ stage: stage - 1 }), { fill: THEME.belt, color: THEME.inkCss, name: 'prev' });
    if (stage < STAGES.length) button(this, VIEW.width - 140, 1100 + off, 160, 80, '›', () => this.scene.restart({ stage: stage + 1 }), { fill: THEME.belt, color: THEME.inkCss, name: 'next-stage' });
    label(this, VIEW.width / 2, 1100 + off, `${stage} / ${STAGES.length}`, THEME.type.sm, THEME.subCss);

    publishDebug({
      scene: 'album', stage, done: p.done, complete: p.complete, skin, unlocked, activeSkin: progress.skin,
      useButton: action, scrollY: this.cameras.main.scrollY, offsetY: 0,
    });
  }

  /** The panel with the bucket skin a stage unlocks; returns where its "use" button is, if it shows one. */
  private drawReward(skin: Skin, unlocked: boolean, activeSkin: Skin, stage: number, ry: number): { x: number; y: number } | null {
    const panel = this.add.graphics();
    panel.fillStyle(THEME.paper, 1);
    panel.fillRoundedRect(60, ry, VIEW.width - 120, 330, THEME.radius.panel);
    label(this, VIEW.width / 2, ry + 50, t('album.reward'), THEME.type.md);
    const jar = this.add.graphics();
    [PAINT[1]!, PAINT[2]!, PAINT[4]!].forEach((color, k) => {
      const x = VIEW.width / 2 - 110 + k * 110;
      jar.fillStyle(color, unlocked ? 1 : 0.35);
      jar.fillRoundedRect(x - 42, ry + 100, 84, 84, THEME.radius.jar);
      drawSkin(jar, skin, x, ry + 142, 84, unlocked ? 1 : 0.35);
      jar.lineStyle(3, THEME.ink, unlocked ? 1 : 0.35);
      jar.strokeRoundedRect(x - 42, ry + 100, 84, 84, THEME.radius.jar);
    });
    let action: { x: number; y: number } | null = null;
    if (!unlocked) {
      label(this, VIEW.width / 2, ry + 250, t('album.locked', { n: LEVELS_PER_STAGE }), THEME.type.sm, THEME.subCss, false).setWordWrapWidth(VIEW.width - 180);
    } else if (activeSkin === skin) {
      button(this, VIEW.width / 2, ry + 260, 300, 76, t('album.inUse'), () => this.scene.restart({ stage }), {
        fill: THEME.belt, color: THEME.inkCss, size: THEME.type.sm, name: 'skin-in-use',
      });
    } else {
      action = { x: VIEW.width / 2, y: ry + 260 };
      button(this, action.x, action.y, 300, 76, t('album.use'), () => {
        setSkin(skin);
        this.scene.restart({ stage });
      }, { size: THEME.type.sm, name: 'skin-use' });
    }
    return action;
  }
}
