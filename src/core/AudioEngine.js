const DEFAULT_FFT_SIZE = 2048;

export class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.loop = false;

    this.audioContext = null;
    this.source = null;
    this.analyser = null;

    this.frequencyData = new Uint8Array(DEFAULT_FFT_SIZE / 2);
    this.timeData = new Uint8Array(DEFAULT_FFT_SIZE / 2);

    this.objectUrl = null;
    this.isReady = false;
  }

  async setup() {
    if (this.isReady) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();

    this.source = this.audioContext.createMediaElementSource(this.audio);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = DEFAULT_FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.85;

    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
    this.isReady = true;
  }

  async loadFile(file) {
    if (!file) {
      return;
    }

    await this.setup();

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    this.audio.load();

    await new Promise((resolve, reject) => {
      const onLoaded = () => {
        this.audio.removeEventListener('loadedmetadata', onLoaded);
        this.audio.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        this.audio.removeEventListener('loadedmetadata', onLoaded);
        this.audio.removeEventListener('error', onError);
        reject(new Error('Unable to load audio file.'));
      };

      this.audio.addEventListener('loadedmetadata', onLoaded);
      this.audio.addEventListener('error', onError);
    });
  }

  async play() {
    await this.setup();

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  isPlaying() {
    return !this.audio.paused;
  }

  hasTrack() {
    return Boolean(this.audio.src);
  }

  update() {
    if (!this.isReady || !this.analyser) {
      return;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeData);
  }

  getFrequencyData() {
    return this.frequencyData;
  }

  getTimeData() {
    return this.timeData;
  }

  getVolume() {
    return this.getAverageInRange(20, 20000) / 255;
  }

  getBass() {
    return this.getAverageInRange(20, 180) / 255;
  }

  getTreble() {
    return this.getAverageInRange(2400, 12000) / 255;
  }

  getAverageInRange(minHz, maxHz) {
    if (!this.audioContext || !this.analyser) {
      return 0;
    }

    const nyquist = this.audioContext.sampleRate / 2;
    const minIndex = Math.max(0, Math.floor((minHz / nyquist) * this.frequencyData.length));
    const maxIndex = Math.min(this.frequencyData.length - 1, Math.ceil((maxHz / nyquist) * this.frequencyData.length));

    if (maxIndex < minIndex) {
      return 0;
    }

    let sum = 0;
    let count = 0;
    for (let i = minIndex; i <= maxIndex; i += 1) {
      sum += this.frequencyData[i];
      count += 1;
    }

    return count > 0 ? sum / count : 0;
  }

  getTrackName() {
    if (!this.audio.src) {
      return 'No track loaded';
    }

    try {
      const src = decodeURIComponent(this.audio.src);
      const parts = src.split('/');
      return parts[parts.length - 1] || 'Audio loaded';
    } catch {
      return 'Audio loaded';
    }
  }

  dispose() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
