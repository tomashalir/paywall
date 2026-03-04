# Scanbass Audio-Reactive Generative Art

A browser-based Single Page Application built with **Vite + Three.js + Web Audio API**.

> VST3 version: a JUCE plugin scaffold with live DAW audio visualization is now included in [`vst-plugin`](./vst-plugin/README.md).

It contains 9 monochrome, audio-reactive scenes (5 presets per scene):

1. **Sphere (Orbit)**: point-sphere + rings reacting to bass/treble
2. **Vertical Flow (Waterfall)**: falling particles reacting to volume/treble
3. **Liquid Mercury (Lava Lamp)**: metaball cloud with noisy threshold breakup and feedback ghost trails
4. **Horizon (Scanlines)**: frequency-driven vertical bursts on a horizon line
5. **Corona (Radial Burst)**: rotating spokes + halo bloom reacting to bass/treble
6. **Lattice (Grid Field)**: deforming node lattice reacting to mid/high bands
7. **Ribbon Tunnel**: high-speed tunnel ribbons and gates reacting to transients
8. **Seismic Rings**: layered tectonic rings and pillars reacting to low-end pressure
9. **Prism Swarm**: instanced crystal swarm reacting to spectral density

## Features

- Upload custom audio files (`MP3`, `WAV`, and common browser-supported audio formats)
- Drag & drop audio directly onto the page
- Play / Pause controls
- Scene switching with UI buttons (`1-9`) or keyboard arrow keys (`Left`, `Right`)
- Preset switching with UI buttons or keyboard (`[`, `]`, `Up`, `Down`)
- Built-in tuner for scene settings + active preset parameters
- Lattice scene now includes tailored controls for stability, phase scatter, drift, reactivity, and rotation
- Scene 1 (Sphere/Embryo) now includes layer toggles so you can enable/disable membrane, nucleus, filaments, rings, and shell
- Copy-to-clipboard export for exact preset objects, live tuning snapshots, or full active scene tuning bundles
- Real-time FFT analysis:
  - Sub/Bass drive large-scale movement and impact objects
  - Mids drive shape deformation, swirls, and density
  - Presence/Treble drive jitter, noise, and fine detail flicker
  - Different object layers in each scene are split across separate bands (core, mid-structure, highs)
- Post-processing stack:
  - Bloom
  - Grain/noise shader
  - Scanline distortion

## Tech Stack

- JavaScript (ES Modules)
- [Vite](https://vitejs.dev/)
- [Three.js](https://threejs.org/)
- Web Audio API

## Quick Start (macOS, non-developer friendly)

Open Terminal and run:

```bash
cd "/Users/tomashalir/Documents/Scanbass paywall"
npm install
npm run dev
```

Then open the local URL shown in terminal (usually `http://localhost:5173`).

## Usage

1. Click **Upload MP3/WAV** and pick an audio file.
2. Click **Play**.
3. Switch scenes using:
   - Buttons `1 Sphere`, `2 Flow`, `3 Mercury`, `4 Horizon`, `5 Corona`, `6 Lattice`, `7 Ribbon`, `8 Seismic`, `9 Prism`
   - Arrow keys left/right
4. Switch presets with:
   - Buttons `Preset -` / `Preset +`
   - Keys `[` and `]` (or `ArrowUp`/`ArrowDown`)
5. Fine-tune one preset at a time in the **Tuner** section:
   - Use slider controls under **Scene Settings** and **Preset Parameters**
   - In Scene 1, `Show ... (0/1)` settings let you hard-toggle object groups on/off
   - Use **Reset Scene** or **Reset Preset** to revert current tweaks
   - Use **Save Preset** to store the current preset + scene settings for the current scene (persists between reloads on this browser)
   - Use **Copy Exact Preset** to copy a preset object (with current `sceneSettings`) that can be pasted directly into a scene's `presets` array
   - Use **Copy Live Tuning JSON** or **Copy Scene Tuning JSON** to export broader tuning snapshots
6. Use **Pause** to stop playback.

## Frequency-to-Object Mapping

- `Sphere`
  - Sub/Bass: shell inflation, inner-core pulse, outer ring expansion
  - Low-mid/Mid: membrane shear and ring precession
  - Presence/Treble/Air: filament twitch and micro-jitter
- `Flow`
  - Sub/Bass: column pressure and downflow acceleration
  - Low-mid/Mid: vortex steering + membrane displacement
  - Presence/Treble/Air: side jets, droplets, and scintillation
- `Liquid Mercury`
  - Sub/Bass: internal pressure expansion and whole-blob vibration
  - Mid/Presence: surface-tension ripple waves across the blob skin
  - Treble/Air: edge noise intensity, granular breakup, and mist evaporation particles
- `Horizon`
  - Sub/Bass: horizon bend and tip bloom
  - Mid/Presence: branch growth profile and root spread
  - Treble/Air: rain velocity, flicker, and canopy shimmer
- `Corona`
  - Sub/Bass: core pulse and radial burst radius
  - Low-mid/Mid: spoke twist + halo breathing
  - Presence/Treble/Air: arc rings and spark turbulence
- `Lattice`
  - Sub/Bass: beam drive and beacon pulse
  - Low-mid/Mid: node warp and lattice drift
  - Presence/Treble/Air: vertical columns, link flicker, and edge shimmer
- `Ribbon Tunnel`
  - Sub/Bass: forward velocity and tunnel width pulse
  - Mid/Presence: ribbon warp and gate deformation
  - Treble/Air: spark streaks and dust scintillation
- `Seismic Rings`
  - Sub/Bass: ring radius pressure and pillar height bursts
  - Low-mid/Mid: crack spread and surface shifting
  - Treble/Air: ash plumes and fracture shimmer
- `Prism Swarm`
  - Sub/Bass: swarm orbit and crystal scaling
  - Low-mid/Mid: flock steering and trail connectivity
  - Presence/Treble/Air: turbulence jitter and core sparkle

## Build for Production

```bash
npm run build
npm run preview
```

The production files are generated in the `dist` folder.

## Project Structure

```text
src/
  core/
    AudioEngine.js
    VisualizerApp.js
  scenes/
    BaseScene.js
    SphereOrbitScene.js
    VerticalFlowScene.js
    LiquidMercuryScene.js
    HorizonScene.js
    RadialBurstScene.js
    LatticeScene.js
    RibbonTunnelScene.js
    SeismicRingsScene.js
    PrismSwarmScene.js
  shaders/
    grainShader.js
  main.js
  styles.css
index.html
```

## Integration Notes (for future website integration)

- Scene logic is modular (one class per visual).
- Audio analysis is centralized in `AudioEngine`.
- Rendering and post-processing are isolated in `VisualizerApp`.
- You can embed this app in a larger site by mounting the canvas + UI into your existing frontend framework.
