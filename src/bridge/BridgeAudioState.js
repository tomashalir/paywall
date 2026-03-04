const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_OUTPUT_BINS = 256;
const DEFAULT_TIME_SAMPLES = 512;

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export class BridgeAudioState {
  constructor({ outputBins = DEFAULT_OUTPUT_BINS, timeSamples = DEFAULT_TIME_SAMPLES } = {}) {
    this.sampleRate = DEFAULT_SAMPLE_RATE;
    this.outputBins = Math.max(32, outputBins);
    this.timeSamples = Math.max(128, timeSamples);

    this.frequencyData = new Uint8Array(this.outputBins);
    this.timeData = new Uint8Array(this.timeSamples);

    this.inputSpectrum = new Float32Array(64);
    this.smoothedInputSpectrum = new Float32Array(64);
    this.outputSpectrum = new Float32Array(this.outputBins);

    this.rms = 0;
    this.peak = 0;
    this.phase = 0;
  }

  ingest(frame) {
    const incoming = Array.isArray(frame?.fft) ? frame.fft : [];
    if (incoming.length !== this.inputSpectrum.length) {
      this.inputSpectrum = new Float32Array(Math.max(16, incoming.length || 64));
      this.smoothedInputSpectrum = new Float32Array(this.inputSpectrum.length);
    }

    for (let index = 0; index < this.inputSpectrum.length; index += 1) {
      const incomingValue = clamp01(incoming[index] ?? 0);
      this.inputSpectrum[index] = incomingValue;
      this.smoothedInputSpectrum[index] += (incomingValue - this.smoothedInputSpectrum[index]) * 0.32;
    }

    const inputLength = this.smoothedInputSpectrum.length;
    const outputLength = this.outputSpectrum.length;

    for (let index = 0; index < outputLength; index += 1) {
      const position = (index / (outputLength - 1)) * (inputLength - 1);
      const leftIndex = Math.floor(position);
      const rightIndex = Math.min(inputLength - 1, leftIndex + 1);
      const mix = position - leftIndex;
      const leftValue = this.smoothedInputSpectrum[leftIndex];
      const rightValue = this.smoothedInputSpectrum[rightIndex];
      const interpolated = leftValue + (rightValue - leftValue) * mix;

      this.outputSpectrum[index] += (interpolated - this.outputSpectrum[index]) * 0.42;
      this.frequencyData[index] = Math.round(clamp01(this.outputSpectrum[index]) * 255);
    }

    const incomingRms = clamp01(frame?.rms ?? 0);
    const incomingPeak = clamp01(frame?.peak ?? 0);
    this.rms += (incomingRms - this.rms) * 0.22;
    this.peak += (incomingPeak - this.peak) * 0.3;
  }

  tick(dt) {
    const safeDt = Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0.016;
    const bass = this.getBass();
    const treble = this.getTreble();
    const volume = this.getVolume();

    this.phase += safeDt * (3.2 + bass * 9.5 + treble * 6.0);
    const phase = this.phase;
    const signalStrength = 0.15 + volume * 0.95;

    for (let index = 0; index < this.timeData.length; index += 1) {
      const p = index / (this.timeData.length - 1);
      const freqA = 10 + bass * 30;
      const freqB = 24 + treble * 80;
      const freqC = 6 + volume * 18;
      const a = Math.sin(phase + p * freqA);
      const b = Math.sin(phase * 1.37 + p * freqB) * (0.2 + treble * 0.5);
      const c = Math.cos(phase * 0.5 + p * freqC) * (0.1 + bass * 0.3);
      const noise = ((this.frequencyData[(index * 5) % this.frequencyData.length] / 255) - 0.5) * (0.1 + treble * 0.25);
      const signal = (a * 0.68 + b + c + noise) * signalStrength;
      const sample = Math.round(128 + signal * 110);
      this.timeData[index] = Math.min(255, Math.max(0, sample));
    }
  }

  getFrequencyData() {
    return this.frequencyData;
  }

  getTimeData() {
    return this.timeData;
  }

  getVolume() {
    return this.rms;
  }

  getBass() {
    return this.getAverageInRange(20, 180) / 255;
  }

  getTreble() {
    return this.getAverageInRange(2400, 12000) / 255;
  }

  getAverageInRange(minHz, maxHz) {
    if (maxHz <= minHz || this.frequencyData.length === 0) {
      return 0;
    }

    const nyquist = this.sampleRate * 0.5;
    const minIndex = Math.max(0, Math.floor((minHz / nyquist) * this.frequencyData.length));
    const maxIndex = Math.min(this.frequencyData.length - 1, Math.ceil((maxHz / nyquist) * this.frequencyData.length));

    if (maxIndex < minIndex) {
      return 0;
    }

    let sum = 0;
    let count = 0;
    for (let index = minIndex; index <= maxIndex; index += 1) {
      sum += this.frequencyData[index];
      count += 1;
    }

    return count > 0 ? sum / count : 0;
  }
}
