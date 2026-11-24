import { VIEW } from '../core/layout';
import { THEME, css } from './theme';

export interface CodePanelOptions {
  title: string;
  /** Read-only mode: the code to show, selected for the system's Copy. Without it the field is empty and editable. */
  code?: string;
  /** Label of the button that closes the panel without doing anything. */
  closeLabel: string;
  /** Second button (paste mode): gets the text in the field. */
  action?: { label: string; run: (text: string) => void };
  /** Called once when the panel goes away, by either button (before the action runs). */
  onClose: () => void;
}

export interface CodePanel {
  readonly kind: 'paste' | 'copy';
  close(): void;
}

/**
 * Save code panel (#259): an HTML overlay above the canvas, in place of `window.prompt`, whose native dialog on the
 * Android WebView grew with a long code until its buttons left the screen. The panel follows the visual viewport (the
 * part the keyboard leaves free) and only the text field shrinks and scrolls, so its buttons are always on screen.
 * It lives outside Phaser, so a relayout of the scene (the keyboard resizes the game) does not close it.
 */
export function openCodePanel(opts: CodePanelOptions): CodePanel {
  // Sizes follow the game's scale, so the panel looks like the game's own panels; text never below 16 px (iOS zooms).
  const canvas = document.querySelector('canvas');
  const k = (canvas?.getBoundingClientRect().width || 360) / VIEW.width;
  const px = (n: number, min = 0) => `${Math.max(min, Math.round(n * k))}px`;

  const overlay = document.createElement('div');
  overlay.id = 'code-panel';
  // Above the "rotate your phone" screen (z-index 10 in index.html): a keyboard that shrinks the WebView makes the
  // window wider than tall, and that screen would otherwise cover the field being typed in.
  Object.assign(overlay.style, {
    position: 'fixed', zIndex: '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box', padding: px(THEME.space.md, 12), background: `${css(THEME.ink)}73`,
  });
  const panel = document.createElement('div');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'code-panel-title');
  Object.assign(panel.style, {
    display: 'flex', flexDirection: 'column', gap: px(THEME.space.md, 12), boxSizing: 'border-box',
    width: `min(100%, ${px(600)})`, maxHeight: '100%', padding: px(THEME.space.lg, 16),
    background: THEME.bgCss, color: THEME.inkCss, borderRadius: px(THEME.radius.panel, 12), fontFamily: THEME.font,
  });
  const title = document.createElement('h2');
  title.id = 'code-panel-title';
  title.textContent = opts.title;
  Object.assign(title.style, { margin: '0', flex: 'none', textAlign: 'center', fontSize: px(THEME.type.md, 18), lineHeight: '1.2' });

  const field = document.createElement('textarea');
  field.setAttribute('aria-labelledby', 'code-panel-title');
  field.spellcheck = false;
  field.autocapitalize = 'off';
  field.setAttribute('autocomplete', 'off');
  field.setAttribute('autocorrect', 'off');
  if (opts.code !== undefined) {
    field.value = opts.code;
    field.readOnly = true;
  }
  // The only part that shrinks: a long code scrolls inside it, the buttons below keep their place.
  Object.assign(field.style, {
    flex: '0 1 9em', minHeight: '2.6em', boxSizing: 'border-box', width: '100%', margin: '0', resize: 'none',
    overflowY: 'auto', wordBreak: 'break-all', overflowWrap: 'anywhere', padding: px(THEME.space.sm, 8),
    fontFamily: 'ui-monospace, monospace', fontSize: px(THEME.type.sm, 16), lineHeight: '1.3', color: THEME.inkCss,
    background: css(THEME.paper), border: `2px solid ${css(THEME.belt)}`, borderRadius: px(THEME.radius.jar, 8),
    userSelect: 'text', webkitUserSelect: 'text', touchAction: 'pan-y',
  });

  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', gap: px(THEME.space.md, 12), flex: 'none' });
  const makeButton = (text: string, fill: number, color: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    Object.assign(b.style, {
      flex: '1 1 0', minHeight: px(80, 44), padding: `0 ${px(THEME.space.sm, 8)}`, border: 'none', borderRadius: '999px',
      background: css(fill), color, fontFamily: THEME.font, fontWeight: 'bold', fontSize: px(THEME.type.sm, 16), cursor: 'pointer',
    });
    b.addEventListener('click', onClick);
    row.append(b);
    return b;
  };

  const vv = window.visualViewport;
  // Fixed to what is actually visible: with the keyboard up that is the visual viewport, smaller than the window.
  const fit = () => {
    Object.assign(overlay.style, {
      left: `${vv?.offsetLeft ?? 0}px`, top: `${vv?.offsetTop ?? 0}px`,
      width: `${vv?.width ?? window.innerWidth}px`, height: `${vv?.height ?? window.innerHeight}px`,
    });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  let open = true;
  const close = () => {
    if (!open) return;
    open = false;
    vv?.removeEventListener('resize', fit);
    vv?.removeEventListener('scroll', fit);
    window.removeEventListener('resize', fit);
    overlay.removeEventListener('keydown', onKey);
    overlay.remove();
    opts.onClose();
  };

  makeButton(opts.closeLabel, THEME.belt, THEME.inkCss, close);
  const action = opts.action;
  if (action) makeButton(action.label, THEME.ink, css(THEME.white), () => {
    const text = field.value;
    close();
    action.run(text);
  });
  panel.append(title, field, row);
  overlay.append(panel);
  overlay.addEventListener('keydown', onKey);
  vv?.addEventListener('resize', fit);
  vv?.addEventListener('scroll', fit);
  window.addEventListener('resize', fit);
  fit();
  document.body.append(overlay);
  field.focus({ preventScroll: true });
  if (field.readOnly) field.select();
  return { kind: field.readOnly ? 'copy' : 'paste', close };
}
