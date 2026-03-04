export const sceneRegistry = {
  scene1: () => import('../scenes/SphereOrbitScene.js').then((module) => new module.SphereOrbitScene()),
  scene2: () => import('../scenes/GranularBleedWaveformScene.js').then((module) => new module.GranularBleedWaveformScene()),
  scene3: () => import('../scenes/LiquidMercuryScene.js').then((module) => new module.LiquidMercuryScene()),
  scene4: () => import('../scenes/HorizonScene.js').then((module) => new module.HorizonScene()),
  scene5: () => import('../scenes/RadialBurstScene.js').then((module) => new module.RadialBurstScene()),
  scene6: () => import('../scenes/LatticeScene.js').then((module) => new module.LatticeScene()),
  scene7: () => import('../scenes/RibbonTunnelScene.js').then((module) => new module.RibbonTunnelScene()),
  scene8: () => import('../scenes/SeismicRingsScene.js').then((module) => new module.SeismicRingsScene()),
  scene9: () => import('../scenes/PrismSwarmScene.js').then((module) => new module.PrismSwarmScene())
};

export function normalizeSceneId(sceneId) {
  if (typeof sceneId !== 'string') {
    return 'scene1';
  }

  const match = sceneId.trim().toLowerCase().match(/^scene([1-9])$/);
  if (!match) {
    return 'scene1';
  }

  return `scene${match[1]}`;
}
