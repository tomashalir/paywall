export const grainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    noiseIntensity: { value: 0.07 },
    scanlineIntensity: { value: 0.11 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float noiseIntensity;
    uniform float scanlineIntensity;

    varying vec2 vUv;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      float grain = (random(vUv + time * 0.15) - 0.5) * noiseIntensity;
      float scanline = sin(vUv.y * 1100.0 + time * 25.0) * scanlineIntensity;

      color.rgb += grain;
      color.rgb += scanline;

      float vignette = smoothstep(1.2, 0.2, distance(vUv, vec2(0.5)));
      color.rgb *= vignette;

      gl_FragColor = color;
    }
  `
};
