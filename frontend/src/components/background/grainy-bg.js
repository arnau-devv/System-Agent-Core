// ============================================================
//  GRAINY GRADIENT BACKGROUND
//  Adapted from a React Native / Skia implementation using GLSL simplex noise shaders.
//  Original source: [https://www.reacticx.com/docs/components/grainy-gradient]
//
//  Usage:
//    Main window (fullscreen, fixed paleta "Original Dark"):
//      window.initGrainyBg({
//        fullscreen: true,
//        colors: ["#1a0336", "#2a0f6b", "#7a3a0a", "#5a0a2e"],
//        speed: 2.3, intensity: 0.112, grainSize: 1.9, amplitude: 0.1,
//      });
//
//    Chat window (fullscreen, otra paleta/velocidad):
//      window.initGrainyBg({
//        fullscreen: true,
//        colors: ["#0d0a1a", "#1a0f2e", "#0a1628", "#150a20"],
//        speed: 1.2, intensity: 0.08, grainSize: 2.2, amplitude: 0.06,
//      });
//
//    Settings previsualizador (contenedor chico, colores dinámicos via setColors):
//      const bg = window.initGrainyBg({
//        target: document.getElementById('background_previsualizer'),
//      });
//      bg.setColors(["#0a0a2e", "#1a1a5e", "#0d3b6e", "#1a6b8a"]);
//
//  API devuelta por initGrainyBg (y también colgada en window para compatibilidad):
//    setColors(colorsArray) — actualiza los colores del gradiente
//    resize()               — fuerza un resize del canvas (ej: al mostrar un contenedor oculto)
// ============================================================

window.initGrainyBg = function (options = {}) {
  const fullscreen = options.fullscreen || false;
  const target      = options.target || document.body;

  const speed      = options.speed      ?? 2.3;
  const intensity  = options.intensity  ?? 0.112;
  const grainSize  = options.grainSize  ?? 1.9;
  const amplitude  = options.amplitude  ?? 0.1;
  const brightness = options.brightness ?? 0.0;
  const colors     = options.colors     ?? ["#1a0336", "#2a0f6b", "#7a3a0a", "#5a0a2e"];

  // ---------- canvas setup ----------
  const canvas = document.createElement('canvas');
  canvas.id = options.canvasId || 'grainy_bg_canvas';

  if (fullscreen) {
    canvas.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: -1;
      pointer-events: none;
    `;
    document.body.prepend(canvas);
  } else {
    canvas.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 0;
      pointer-events: none;
    `;
    target.appendChild(canvas);
  }

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) { console.warn('WebGL not supported'); return null; }

  // ---------- helpers ----------
  function hexToVec4(hex) {
    const c    = hex.replace('#', '').trim();
    const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
    return [
      parseInt(full.slice(0, 2), 16) / 255,
      parseInt(full.slice(2, 4), 16) / 255,
      parseInt(full.slice(4, 6), 16) / 255,
      1.0,
    ];
  }

  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(s));
    return s;
  }

  // ---------- shaders ----------
  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  iResolution;
    uniform float iTime;
    uniform vec4  uColor0;
    uniform vec4  uColor1;
    uniform vec4  uColor2;
    uniform vec4  uColor3;
    uniform vec4  uColor4;
    uniform int   uColorCount;
    uniform float uAmplitude;
    uniform float uGrainIntensity;
    uniform float uGrainSize;
    uniform float uGrainEnabled;
    uniform float uBrightness;

    /* ---- Simplex 3D noise ---- */
    vec3 mod289v3(vec3 x){ return x - floor(x*(1./289.))*289.; }
    vec4 mod289v4(vec4 x){ return x - floor(x*(1./289.))*289.; }
    vec4 permute(vec4 x){ return mod289v4(((x*34.)+1.)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }

    float snoise(vec3 v){
      const vec2 C = vec2(1./6., 1./3.);
      const vec4 D = vec4(0., .5, 1., 2.);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g  = step(x0.yzx, x0.xyz);
      vec3 l  = 1. - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289v3(i);
      vec4 p = permute(permute(permute(
               i.z + vec4(0., i1.z, i2.z, 1.))
             + i.y + vec4(0., i1.y, i2.y, 1.))
             + i.x + vec4(0., i1.x, i2.x, 1.));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4  j  = p - 49. * floor(p * ns.z * ns.z);
      vec4  x_ = floor(j * ns.z);
      vec4  y_ = floor(j - 7. * x_);
      vec4  x  = x_ * ns.x + ns.yyyy;
      vec4  y  = y_ * ns.x + ns.yyyy;
      vec4  h  = 1. - abs(x) - abs(y);
      vec4  b0 = vec4(x.xy, y.xy);
      vec4  b1 = vec4(x.zw, y.zw);
      vec4  s0 = floor(b0)*2.+1.;
      vec4  s1 = floor(b1)*2.+1.;
      vec4  sh = -step(h, vec4(0.));
      vec4  a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4  a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3  p0 = vec3(a0.xy, h.x);
      vec3  p1 = vec3(a0.zw, h.y);
      vec3  p2 = vec3(a1.xy, h.z);
      vec3  p3 = vec3(a1.zw, h.w);
      vec4  norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.);
      m = m*m;
      return 42. * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    vec4 getColor(int idx){
      if(idx==0) return uColor0;
      if(idx==1) return uColor1;
      if(idx==2) return uColor2;
      if(idx==3) return uColor3;
      return uColor4;
    }

    void addContrib(vec2 uv, float t, int idx, float count,
                    inout vec4 color, inout float total){
      float fi    = float(idx);
      float angle = fi * 6.28318530718 / count;
      vec2 offset = vec2(
        sin(t + angle)*uAmplitude + snoise(vec3(t*0.3, fi, 0.))*uAmplitude*0.5,
        cos(t*0.8 + angle)*uAmplitude + snoise(vec3(0., t*0.3, fi))*uAmplitude*0.5
      );
      float radius = 0.35 + snoise(vec3(fi, t*0.2, 0.))*0.1;
      vec2  pos    = vec2(0.5) + vec2(cos(angle), sin(angle))*radius + offset;
      float dist   = length(uv - pos);
      float w      = exp(-dist*dist*6.);
      w *= 1. + snoise(vec3(uv*3., t*0.5+fi))*0.2;
      color += getColor(idx)*w;
      total += w;
    }

    void main(){
      vec2  uv    = gl_FragCoord.xy / iResolution;
      uv.y        = 1.0 - uv.y;
      float t     = iTime;
      vec4  color = vec4(0.);
      float total = 0.;
      float count = float(uColorCount);

      if(uColorCount >= 1) addContrib(uv, t, 0, count, color, total);
      if(uColorCount >= 2) addContrib(uv, t, 1, count, color, total);
      if(uColorCount >= 3) addContrib(uv, t, 2, count, color, total);
      if(uColorCount >= 4) addContrib(uv, t, 3, count, color, total);
      if(uColorCount >= 5) addContrib(uv, t, 4, count, color, total);

      color /= max(total, 0.001);
      color.rgb += uBrightness;

      if(uGrainEnabled > 0.5){
        float gs    = iResolution.x / uGrainSize;
        float grain = snoise(vec3(uv*gs, t*0.5))*uGrainIntensity;
        color.rgb  += grain * (1. - abs(2.*color.rgb - 1.));
      }

      color.rgb    = clamp(color.rgb, 0., 1.);
      color.a      = 1.;
      gl_FragColor = color;
    }
  `;

  // ---------- program ----------
  const prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER,   VERT));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // full-screen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // uniforms
  const uLoc = name => gl.getUniformLocation(prog, name);
  const U = {
    res:        uLoc('iResolution'),
    time:       uLoc('iTime'),
    colors:     [0,1,2,3,4].map(i => uLoc(`uColor${i}`)),
    count:      uLoc('uColorCount'),
    amp:        uLoc('uAmplitude'),
    grain:      uLoc('uGrainIntensity'),
    grainSize:  uLoc('uGrainSize'),
    grainOn:    uLoc('uGrainEnabled'),
    brightness: uLoc('uBrightness'),
  };

  // static uniforms — ahora SÍ vienen de options, con fallback a los defaults originales
  gl.uniform1f(U.amp,        amplitude);
  gl.uniform1f(U.grain,      intensity);
  gl.uniform1f(U.grainSize,  grainSize);
  gl.uniform1f(U.grainOn,    1.0);
  gl.uniform1f(U.brightness, brightness);

  // colores iniciales — vienen de options.colors, no de una constante fija
  function applyColors(colorsArray) {
    const padded = [...colorsArray];
    while (padded.length < 5) padded.push('#000000');
    padded.map(hexToVec4).forEach((v, i) => gl.uniform4fv(U.colors[i], v));
    gl.uniform1i(U.count, Math.min(colorsArray.length, 5));
  }
  applyColors(colors);

  // ---------- resize ----------
  function resize() {
    canvas.width  = fullscreen ? window.innerWidth  : target.clientWidth;
    canvas.height = fullscreen ? window.innerHeight : target.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- loop ----------
  let start = null;
  let rafId = null;
  function frame(ts) {
    if (!start) start = ts;
    gl.uniform1f(U.time, ((ts - start) / 1000) * speed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  // ---------- instancia pública ----------
  const instance = {
    canvas,
    setColors: applyColors,
    resize,
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      canvas.remove();
    },
  };

  // Compatibilidad: settings_renderer.js (y código viejo) llama window.setBgColors /
  // window.resizeBgCanvas directamente. Los dejamos apuntando a la última instancia creada.
  window.setBgColors   = instance.setColors;
  window.resizeBgCanvas = instance.resize;

  return instance;
};
