# Scanbass `/paywall` Integration Playbook

## 1) Objective
- Deploy this app at `https://your-domain.com/paywall` with **identical visualizer behavior and rendering**.
- Allow developer changes only to **UI/UX styling and page chrome** so it matches the existing website design.

## 2) Non-Negotiable Rules (Logic Lock)
- Do not change visualizer/audio logic in:
`src/core/AudioEngine.js`
`src/core/VisualizerApp.js`
`src/scenes/*`
`src/shaders/*`
- Do not remove/rename DOM ids/classes used by `src/main.js`.
- Keep post-processing stack unchanged (bloom + grain/scanline shader).
- Keep keyboard/drag-drop/upload behavior unchanged.

## 3) What Must Be Preserved 1:1
- Audio upload validation:
  - Max file size: `180 MB`
  - Types: audio MIME or extension `mp3/wav/ogg/m4a/aac/flac/aiff/aif`
- Playback controls: upload, play, pause, timer.
- Scene flow in this paywall app: `3 scenes` with scene switch + preset switch.
- Advanced controls: tuner toggle, reset actions, save preset, copy JSON/export buttons.
- Persistence: scene presets in `localStorage` key `scanbass.scene-presets.v1`.

## 4) Required DOM Contract (Do Not Rename)
- `#webgl-canvas`
- `#upload-btn`, `#audio-input`
- `#play-btn`, `#pause-btn`
- `#track-label`, `#play-state`, `#time-label`
- `.scene-btn` with `data-scene-index`
- `#scene-label`
- `#preset-prev-btn`, `#preset-next-btn`, `#preset-label`
- `#toggle-tuner-btn`
- `#reset-scene-settings-btn`, `#reset-overlay-settings-btn`, `#reset-preset-btn`
- `#save-preset-btn`, `#copy-exact-preset-btn`, `#copy-preset-btn`, `#copy-scene-presets-btn`
- `#tuner-panel`, `#overlay-settings-grid`, `#scene-settings-grid`, `#preset-params-grid`
- `#status-banner`, `#drop-overlay`, `#live-adjust-hud`
- `.advanced-control`

## 5) Admin Steps (Deploy at `/paywall`)
1. Build production bundle:
   - `npm ci`
   - `npm run build`
2. Upload `dist/` contents to server folder mapped to `/paywall/`.
3. Ensure these paths are live:
   - `/paywall/index.html`
   - `/paywall/assets/*`
4. Configure route behavior:
   - `/paywall` should resolve to `/paywall/index.html` (or redirect to `/paywall/`).
   - Static assets under `/paywall/assets/` must be served as JS/CSS.
5. Cache policy:
   - `index.html`: no-store or short cache.
   - `/assets/*`: long cache (hashed filenames are safe).

### Nginx example
```nginx
location = /paywall {
  return 301 /paywall/;
}

location /paywall/ {
  alias /var/www/your-site/paywall/;
  index index.html;
  try_files $uri $uri/ /paywall/index.html;
}
```

## 6) Developer Scope (Allowed vs Forbidden)
- Allowed:
  - Edit `src/styles.css` to match brand/UI system.
  - Reposition panel/layout.
  - Adjust typography/colors/spacing/buttons.
  - Add outer site header/footer wrappers (without changing required ids).
- Forbidden:
  - Editing scene math/audio response logic.
  - Removing control actions or shortcuts.
  - Renaming required IDs/classes listed above.

## 7) QA Checklist Before Go-Live
1. `/paywall` loads without console errors.
2. Upload valid audio and playback starts.
3. Invalid/oversized files show error message.
4. Scene buttons + keyboard (`1-3`, arrows) work.
5. Preset switch (`[ ]`, up/down) works.
6. Drag & drop overlay appears/disappears correctly.
7. Advanced controls show/hide and sliders/toggles respond live.
8. Save preset survives page reload (same browser).
9. Copy buttons place JSON on clipboard.
10. Mobile layout remains usable.

## 8) Release Gate (Sign-off)
- Admin sign-off: route + hosting + cache headers configured.
- Developer sign-off: visual style aligned with website.
- Product sign-off: behavior matches original paywall app exactly.
