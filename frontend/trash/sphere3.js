// ─── SPHERE.JS ───────────────────────────────────────────────────────────────
// Paso 1: Núcleo Volumétrico y Profundidad (Estilo Plasma Realista)
// Estado: IDLE (pequeña) / LISTENING (grande)
// ─────────────────────────────────────────────────────────────────────────────

const SPHERE_SIZES = {
  IDLE:      0.6,
  WAKE_DETECTED: 1.0,
}
let currentScale  = SPHERE_SIZES.IDLE
let targetScale   = SPHERE_SIZES.IDLE

const container = document.getElementById('sphere_container')

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(container.clientWidth, container.clientHeight)
renderer.setPixelRatio(window.devicePixelRatio)
container.appendChild(renderer.domElement)

const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
camera.position.z = 3

// ── Geometría base (con más polígonos para deformación suave) ─────────────────
const geometry = new THREE.SphereGeometry(1, 128, 128)

// ── Shader Material Volumétrico ───────────────────────────────────────────────
const nebulaMaterial = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.FrontSide,
  depthWrite: false, // Importante para que los brillos se mezclen bien

  uniforms: {
    uTime:   { value: 0 },
    uSpeed:  { value: 0.2 }, // Movimiento más lento y pesado (masa real)
  },

  vertexShader: `
    uniform float uTime;
    uniform float uSpeed;

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    // ── Función de Ruido 3D Optimizada ──
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g  = step(x0.yzx, x0.xyz);
      vec3 l  = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x  = x_ * ns.x + ns.yyyy;
      vec4 y  = y_ * ns.x + ns.yyyy;
      vec4 h  = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      // Deformación física lenta y pesada de la superficie
      float n = snoise(position * 1.2 + uTime * uSpeed);
      vec3 displaced = position + normal * (n * 0.15); // Relieve más sutil, el volumen lo da el fragment

      vNormal   = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz; // Pasamos la posición sin deformar al fragment para el ruido interno
      
      vec4 viewPos = modelViewMatrix * vec4(displaced, 1.0);
      vViewDir  = normalize(-viewPos.xyz);

      gl_Position = projectionMatrix * viewPos;
    }
  `,

  fragmentShader: `
    uniform float uTime;
    
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    // ── Re-usamos la función de ruido en el fragment para la textura interna ──
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g  = step(x0.yzx, x0.xyz); vec3 l  = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j  = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
      vec4 x  = x_ * ns.x + ns.yyyy; vec4 y  = y_ * ns.x + ns.yyyy; vec4 h  = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      // 1. FRESNEL INVERTIDO: Para saber qué partes están en el centro y qué partes en los bordes
      // dot(vNormal, vViewDir) da 1.0 en el centro y 0.0 en los bordes
      float viewAngle = max(dot(vNormal, vViewDir), 0.0);
      float centerMask = pow(viewAngle, 1.5); // Más brillante/denso en el centro
      float edgeMask = pow(1.0 - viewAngle, 3.0); // Borde exterior

      // 2. CAPAS DE DENSIDAD (fBm): Dos capas de ruido para generar profundidad interna
      float noise1 = snoise(vWorldPos * 1.5 + uTime * 0.3);
      float noise2 = snoise(vWorldPos * 3.0 - uTime * 0.2);
      
      // Combinamos el ruido y lo mapeamos de [-1, 1] a [0, 1]
      float internalDensity = (noise1 * 0.7 + noise2 * 0.3) * 0.5 + 0.5;

      // 3. COLOR VOLUMÉTRICO: Basado en Siri, pero controlado por la densidad
      vec3 colorDeep   = vec3(0.02, 0.0, 0.2);   // Fondo del orbe (casi negro espacial)
      vec3 colorMid    = vec3(0.5, 0.0, 0.8);    // Morado intenso para zonas medias
      vec3 colorCore   = vec3(0.0, 0.8, 1.0);    // Cyan brillante para el plasma denso
      vec3 colorAccent = vec3(1.0, 0.0, 0.5);    // Destellos magentas

      // Mezclamos colores según la densidad de la nube interna
      vec3 finalColor = mix(colorDeep, colorMid, smoothstep(0.0, 0.5, internalDensity));
      finalColor = mix(finalColor, colorCore, smoothstep(0.4, 0.8, internalDensity));
      
      // Añadimos acentos magentas donde el ruido es extremo
      float accentMask = smoothstep(0.7, 1.0, internalDensity + noise2 * 0.2);
      finalColor = mix(finalColor, colorAccent, accentMask);

      // 4. ILUMINACIÓN Y TRANSPARENCIA FÍSICA
      // El centro es denso (alpha alto) si hay nube, los bordes se desvanecen
      float alpha = centerMask * internalDensity * 1.2;
      
      // Añadimos un sutil resplandor en los bordes
      finalColor += vec3(edgeMask * 0.5) * colorCore;
      alpha += edgeMask * 0.3; // Los bordes mantienen una mínima visibilidad gaseosa

      gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
    }
  `
})

const sphere = new THREE.Mesh(geometry, nebulaMaterial)
scene.add(sphere)

// ── Animación de escala ───────────────────────────────────────────────
function lerpScale() {
  currentScale += (targetScale - currentScale) * 0.05
  sphere.scale.setScalar(currentScale)
}

function animate() {
  requestAnimationFrame(animate)

  nebulaMaterial.uniforms.uTime.value += 0.01

  // Rotación global más lenta para darle sensación de peso físico
  sphere.rotation.y += 0.001
  sphere.rotation.x += 0.0005

  lerpScale()

  renderer.render(scene, camera)
}

animate()

window.sphereSetState = function(state) {
  if (SPHERE_SIZES[state] !== undefined) {
    targetScale = SPHERE_SIZES[state]
  }
}