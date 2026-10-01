import Phaser from 'phaser';
import { VIEW } from '../../core/layout';
import { sfx } from '../audio';
import { LEVELS, getProgress, setSound } from '../store';
import { PAINT, THEME } from '../theme';
import { button, fullBackground, label, viewOffset } from '../ui';
import { publishDebug } from '../debug';

/** Most frequent target colour of a level, used to paint its node on the map once completed. */
function dominantColor(targets: number[]): number {
  const counts = new Map<number, number>();
  for (const t of targets) if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const progress = getProgress();
    sfx.enabled = progress.sound;
    fullBackground(this, THEME.bg);
    label(this, VIEW.width / 2, 130, 'Mix & Splash', THEME.type.xl);
    label(this, VIEW.width / 2, 190, 'Dipingi mescolando i colori', THEME.type.sm, THEME.subCss, false);

    const top = 280;
    const bottom = VIEW.height - 90;
    const step = (bottom - top) / (LEVELS.length - 1);
    const points = LEVELS.map((_, i) => ({ x: VIEW.width / 2 + Math.sin(i * 1.1) * 190, y: bottom - i * step }));

    const path = this.add.graphics();
    path.lineStyle(18, THEME.belt, 1);
    path.beginPath();
    points.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
    path.strokePath();

    const nodes: { id: number; x: number; y: number; unlocked: boolean }[] = [];
    LEVELS.forEach((level, i) => {
      const p = points[i]!;
      const done = progress.completed.includes(level.id);
      const unlocked = level.id <= progress.unlocked;
      const current = unlocked && !done;
      const r = current ? 36 : 30;
      const g = this.add.graphics();
      g.fillStyle(done ? PAINT[dominantColor(level.targets)]! : current ? THEME.paper : THEME.emptyPixel, 1);
      g.fillCircle(p.x, p.y, r);
      g.lineStyle(current ? 6 : 3, THEME.ink, unlocked ? 1 : 0.3);
      g.strokeCircle(p.x, p.y, r);
      label(this, p.x, p.y, String(level.id), current ? THEME.type.md : THEME.type.sm, done ? '#ffffff' : THEME.inkCss)
        .setAlpha(unlocked ? 1 : 0.35);
      if (current) {
        label(this, p.x + (p.x < VIEW.width / 2 ? 120 : -120), p.y, level.name, THEME.type.sm, THEME.inkCss);
        this.tweens.add({ targets: g, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });
      }
      if (unlocked) {
        this.add
          .zone(p.x, p.y, r * 2.4, r * 2.4)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            sfx.unlock();
            this.scene.start('play', { levelId: level.id });
          });
      }
      nodes.push({ id: level.id, x: p.x, y: p.y, unlocked });
    });

    button(this, VIEW.width - 70, 60, 84, 64, progress.sound ? '♪' : '✕', () => {
      const on = !getProgress().sound;
      setSound(on);
      sfx.enabled = on;
      this.scene.restart();
    }, { fill: THEME.belt, color: THEME.inkCss, name: 'sound' });

    publishDebug({ scene: 'menu', nodes, offsetY: viewOffset(this) });
  }
}
