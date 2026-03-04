# Scanbass Visualizer VST3

This folder contains a JUCE-based VST3 effect plugin that:

- receives live audio directly from the DAW host
- passes audio through unchanged
- renders real-time visuals from the host input (waveform + spectrum + RMS/peak meters)

## Prerequisites

- macOS with Xcode command line tools installed
- CMake 3.22+
- A local JUCE checkout

## Build (macOS)

```bash
cd "/Users/tomashalir/Documents/Scanbass paywall"
npm run build

cd "/Users/tomashalir/Documents/Scanbass paywall/vst-plugin"
cmake -B build -DJUCE_DIR="/Users/tomashalir/Documents/JUCE"
cmake --build build --config Release
```

The built plugin will be under the CMake build output for target `ScanbassVisualizer_VST3`.
The build copies web assets from `../dist` into `Contents/Resources/WebAssets` so the plugin stays fully offline.

## DAW Usage

1. Scan/reload plugins in your DAW.
2. Insert `Scanbass Visualizer` on an audio track or bus.
3. Press play in the DAW.
4. Open the plugin editor to see live visuals reacting to incoming signal.
5. Use the scene dropdown (`Scene 1` to `Scene 9`) to switch Three.js renderers.

## Notes

- The plugin uses `juce::WebBrowserComponent` (WKWebView on macOS) for rendering.
- Audio analysis is computed in C++ and streamed to JavaScript at 30 Hz (`rms`, `peak`, 64-bin FFT).
- The renderer is loaded from local plugin resources only; no network is used.
