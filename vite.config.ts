import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

type LevelRow = { id: number; stage: number; boss?: boolean };
type StageRow = { id: number; complete: boolean };
type UniverseRow = { id: number; key: string };

/**
 * e2e only (`--mode more-levels`, used by e2e/more-levels.spec.ts): the shipped game, then as many full stages again
 * (a second universe, #90) and a half-built stage after them (a third universe being built), so the map, the album,
 * old saves and the universe unlock are tested with more levels than the game has today.
 * The extra levels are copies of the stage 1 levels (small and quick to play) with new ids, and the extra universes reuse
 * universe 1's theme, so they need no new translations. Self-contained (no imports from src) to keep the config
 * loadable as is.
 */
function moreLevels(): Plugin {
  const read = (file: string) => JSON.parse(readFileSync(new URL(`./src/levels/${file}`, import.meta.url), 'utf8'));
  const levels: LevelRow[] = read('levels.json');
  const stages: StageRow[] = read('stages.json');
  const universes: UniverseRow[] = read('universes.json');
  const stagesPerUniverse = stages.length; // the shipped game is one full universe
  const full = levels.filter((l) => l.stage === 1).length; // stage 1 is complete: its size is a full stage
  let copied = 0;
  const extra = [...stages.map(() => full), Math.ceil(full / 2)];
  for (const size of extra) {
    const stage = stages.length + 1;
    stages.push({ ...stages[copied % stages.length]!, id: stage, complete: size === full });
    for (let i = 0; i < size; i++) {
      const copy: LevelRow = { ...levels[copied++ % full]!, id: levels.length + 1, stage };
      delete copy.boss;
      if (i === full - 1) copy.boss = true;
      levels.push(copy);
    }
  }
  while (universes.length < Math.ceil(stages.length / stagesPerUniverse)) universes.push({ ...universes[0]!, id: universes.length + 1 });
  return {
    name: 'more-levels',
    enforce: 'pre',
    load(id) {
      if (id.endsWith('/src/levels/levels.json')) return JSON.stringify(levels);
      if (id.endsWith('/src/levels/stages.json')) return JSON.stringify(stages);
      if (id.endsWith('/src/levels/universes.json')) return JSON.stringify(universes);
      return null;
    },
  };
}

/**
 * e2e only (`--mode covered-debut`, used by e2e/covered.spec.ts): the shipped game, then a second universe holding only
 * the covered-bucket debut level (e2e/fixtures/covered-debut.json, #97), renumbered to follow the shipped levels. It
 * stands in for level 241 until universe 3 ships. Self-contained like `moreLevels`.
 */
function coveredDebut(): Plugin {
  const read = (file: string) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
  const levels: LevelRow[] = read('./src/levels/levels.json');
  const stages: StageRow[] = read('./src/levels/stages.json');
  const universes: UniverseRow[] = read('./src/levels/universes.json');
  const stage = stages.length + 1;
  stages.push({ ...stages[0]!, id: stage, complete: false });
  levels.push({ ...read('./e2e/fixtures/covered-debut.json'), id: levels.length + 1, stage });
  universes.push({ ...universes[0]!, id: universes.length + 1 });
  return {
    name: 'covered-debut',
    enforce: 'pre',
    load(id) {
      if (id.endsWith('/src/levels/levels.json')) return JSON.stringify(levels);
      if (id.endsWith('/src/levels/stages.json')) return JSON.stringify(stages);
      if (id.endsWith('/src/levels/universes.json')) return JSON.stringify(universes);
      return null;
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Relative base so the same build works on any static host and inside Capacitor's WebView.
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    // Phaser (~1.4 MB) changes rarely: its own chunk is cached across game updates and parsed apart from the game code.
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) } },
  },
  plugins: [
    mode === 'more-levels' && moreLevels(),
    mode === 'covered-debut' && coveredDebut(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/*.png'],
      manifest: {
        name: 'Mix & Splash',
        short_name: 'Mix & Splash',
        description: 'Dipingi immagini a pixel mescolando rosso, giallo e blu.',
        lang: 'it',
        start_url: '.',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#FFF6E9',
        theme_color: '#FFF6E9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
    }),
  ],
}));
