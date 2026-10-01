import Phaser from 'phaser';
import { VIEW } from '../../core/layout';
import type { MessageKey } from '../../core/i18n';
import { exportSaveCode, importSaveCode, progressScore } from '../../core/saveCode';
import { sfx } from '../audio';
import { publishDebug } from '../debug';
import { LEVELS, getProgress, replaceProgress, resetProgress, t } from '../store';
import { PAINT, THEME } from '../theme';
import { button, label, screenBackground } from '../ui';

/** Backup & reset: copy the save code, load one, or erase the progress (the only way it is ever erased). */
export class DataScene extends Phaser.Scene {
  private overlay: Phaser.GameObjects.Container | null = null;
  private buttons: Record<string, { x: number; y: number }> = {};
  private message: MessageKey | null = null;

  constructor() {
    super('data');
  }

  relayoutData(): { message?: MessageKey } {
    return { message: this.message ?? undefined };
  }

  create(data: { message?: MessageKey } = {}): void {
    screenBackground(this, THEME.bg);
    this.overlay = null;
    this.buttons = {};
    this.message = data.message ?? null;
    // Content is designed for 1280; taller screens get it centred.
    const o = (this.scale.height - VIEW.height) / 2;
    const cx = VIEW.width / 2;

    this.add_(button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu', { settings: true }), {
      fill: THEME.belt, color: THEME.inkCss, name: 'home',
    }), 'home', 60, 64);
    label(this, cx, 110 + o, t('data.title'), THEME.type.lg);
    label(this, cx, 230 + o, t('data.body'), THEME.type.sm, THEME.subCss, false).setWordWrapWidth(VIEW.width - 120).setOrigin(0.5, 0);

    this.add_(button(this, cx, 480 + o, 440, 88, t('data.copy'), () => this.copy(), { name: 'copy' }), 'copy', cx, 480 + o);
    this.add_(button(this, cx, 600 + o, 440, 88, t('data.paste'), () => this.paste(), { name: 'paste' }), 'paste', cx, 600 + o);
    if (this.message) label(this, cx, 720 + o, t(this.message), THEME.type.sm, THEME.inkCss).setWordWrapWidth(VIEW.width - 120);
    this.add_(button(this, cx, 1040 + o, 440, 88, t('data.reset'), () => this.confirm('data.resetTitle', 'data.resetBody', 'data.erase', () => {
      resetProgress();
      sfx.enabled = getProgress().sound;
      this.scene.restart({ message: 'data.erased' });
    }, PAINT[1]!), { fill: PAINT[1]!, name: 'reset' }), 'reset', cx, 1040 + o);
    this.publish();
  }

  /** Registers a button's position for the debug snapshot (tests tap by these coordinates). */
  private add_(b: Phaser.GameObjects.Container, name: string, x: number, y: number): Phaser.GameObjects.Container {
    this.buttons[name] = { x, y };
    return b;
  }

  private copy(): void {
    const code = exportSaveCode(getProgress());
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    const manual = () => {
      // No clipboard access (older WebView, insecure page): show the code so it can be copied by hand.
      window.prompt(t('data.copyPrompt'), code);
    };
    if (!clipboard?.writeText) return manual();
    clipboard.writeText(code).then(() => this.scene.restart({ message: 'data.copied' }), manual);
  }

  private paste(): void {
    const text = window.prompt(t('data.pastePrompt'), '');
    if (text === null) return; // cancelled
    const imported = importSaveCode(text, LEVELS);
    if (!imported) {
      this.scene.restart({ message: 'data.invalid' });
      return;
    }
    const load = () => {
      replaceProgress(imported);
      sfx.enabled = imported.sound;
      this.scene.restart({ message: 'data.loaded' });
    };
    // A code that is behind the current progress needs a confirmation: it would take the player back.
    if (progressScore(imported) < progressScore(getProgress())) this.confirm('data.olderTitle', 'data.olderBody', 'data.replace', load);
    else load();
  }

  /** Two-button panel: cancel, or the (destructive) confirm action. */
  private confirm(title: MessageKey, body: MessageKey, action: MessageKey, onConfirm: () => void, color: number = THEME.ink): void {
    if (this.overlay) return;
    const w = 600;
    const h = 460;
    const H = this.scale.height;
    const x0 = (VIEW.width - w) / 2;
    const y0 = (H - h) / 2;
    const shade = screenBackground(this, THEME.ink, 0.45).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(THEME.bg, 1);
    g.fillRoundedRect(x0, y0, w, h, THEME.radius.panel);
    const c = this.add.container(0, 0, [shade, g]).setDepth(10);
    c.add(label(this, VIEW.width / 2, y0 + 70, t(title), THEME.type.lg).setWordWrapWidth(w - 60));
    c.add(label(this, VIEW.width / 2, y0 + 150, t(body), THEME.type.sm, THEME.subCss, false).setWordWrapWidth(w - 80).setOrigin(0.5, 0));
    const by = y0 + h - 70;
    c.add(button(this, VIEW.width / 2 - 140, by, 240, 80, t('data.cancel'), () => {
      c.destroy();
      this.overlay = null;
      this.publish();
    }, { fill: THEME.belt, color: THEME.inkCss, size: THEME.type.sm, name: 'cancel' }));
    c.add(button(this, VIEW.width / 2 + 140, by, 240, 80, t(action), onConfirm, { fill: color, size: THEME.type.sm, name: 'confirm' }));
    this.buttons.cancel = { x: VIEW.width / 2 - 140, y: by };
    this.buttons.confirm = { x: VIEW.width / 2 + 140, y: by };
    this.overlay = c;
    this.publish();
  }

  private publish(): void {
    publishDebug({
      scene: 'data',
      scrollY: this.cameras.main.scrollY,
      screenHeight: this.scale.height,
      buttons: this.buttons,
      message: this.message ? t(this.message) : null,
      overlay: !!this.overlay,
    });
  }
}
