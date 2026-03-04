export class SceneAdapter {
  constructor(scene, audioState) {
    this.scene = scene;
    this.audioState = audioState;
  }

  init(containerContext) {
    this.scene.init(containerContext);
  }

  resize(width, height) {
    this.scene.resize(width, height);
  }

  onAudioFrame(frame) {
    if (typeof this.scene.onAudioFrame === 'function') {
      this.scene.onAudioFrame(frame);
    }
  }

  render(dt, elapsed, renderContext = {}) {
    this.scene.update(this.audioState, dt, elapsed, renderContext);
  }

  getSceneObject() {
    return this.scene.getScene();
  }

  getSceneName() {
    return this.scene.getSceneName();
  }

  dispose() {
    this.scene.dispose();
  }
}
