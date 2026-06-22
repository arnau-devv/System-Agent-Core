// ─── SPHERE.JS REESCRITO DESDE CERO (ESTILO ORBE PARAMÉTRICO DE LÍNEAS) ───────
// Sincronizado con los estados: IDLE y WAKE_DETECTED
// ─────────────────────────────────────────────────────────────────────────────

const SPHERE_SIZES = {
  IDLE: 0.7,
  WAKE_DETECTED: 1.1,
}

let currentScale = SPHERE_SIZES.IDLE
let targetScale = SPHERE_SIZES.IDLE
let currentMorph = 0.0 // 0 = Fluido libre (IDLE), 1 = Anillos Concéntricos Perfectos (WAKE)
let targetMorph = 0.0

const container = document.getElementById('sphere_container')

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(container.clientWidth, container.clientHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
container.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
camera.position.z = 4

// ── CREACIÓN DE LA GEOMETRÍA DE ANILLOS CONCÉNTRICOS ESPHERALES ───────────────
const count = 90       // Número de anillos horizontales
const pointsPerRing = 180 // Resolución de cada anillo
const geometry = new THREE.BufferGeometry()

const positions = []
const initialPositions = [] // Guardar posiciones originales para deformación limpia

for (let i = 0; i < count; i++) {
  // Distribución esférica en el eje Y (de -1 a 1)
  const phi = Math.acos(-1 + (2 * i) / count) 
  const y = Math.cos(phi)
  const radiusAtY = Math.sin(phi)

  for (let j = 0; j <= pointsPerRing; j++) {
    const theta = (j / pointsPerRing) * Math.PI * 2
    const x = Math.sin(theta) * radiusAtY
    const z = Math.cos(theta) * radiusAtY

    // Guardar segmento de línea (de punto actual al siguiente)
    if (j > 0) {
      const prevIdx = positions.length - 3
      positions.push(positions[prevIdx], positions[prevIdx+1], positions[prevIdx+2]) // Punto anterior
      positions.push(x, y, z) // Punto actual
    } else {
      positions.push(x, y, z)
    }
  }
}

// Convertir a TypedArray para ThreeJS
const posArray = new Float32Array(positions)
geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))

// Guardamos un clon de las posiciones originales para que el Vertex Shader calcule las distorsiones
geometry.setAttribute('aInitialPosition', new THREE.BufferAttribute(posArray.slice(), 3))

// ── SHADER MATERIAL PARA CONTROLAR EL EFECTO DEL VÍDEO ───────────────────────
const customMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending, // Logra el brillo eléctrico acumulativo del video

  uniforms: {
    uTime: { value: 0 },
    uScale: { value: 1.0 },
    uMorph: { value: 0.0 }, // Controla la transición de la forma
  },

  vertexShader: `
    uniform float uTime;
    uniform float uScale;
    uniform float uMorph; // 0.0 = Distorsionado, 1.0 = Plano Concéntrico Frontal

    attribute vec3 aInitialPosition;

    varying vec3 vPos;
    varying float vDistance;

    // Función de ruido 3D simple
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
      vec3 pos = aInitialPosition;

      // 1. Estado IDLE: Onda fluida orgánica asimétrica basada en ruido
      float noiseFreq = 1.3;
      float noiseTime = uTime * 0.6;
      float n = snoise(pos * noiseFreq + vec3(0.0, 0.0, noiseTime));
      vec3 fluidPos = pos + normalize(pos) * (n * 0.28);

      // 2. Estado WAKE: Ondas de pulso concéntricas perfectas hacia la cámara (Plano XY)
      float r = length(pos.xz);
      float wave = sin(r * 12.0 - uTime * 4.0) * 0.08 * (1.0 - r);
      vec3 wakePos = pos + vec3(0.0, 0.0, wave);

      // Interpolamos las dos posiciones usando el Uniform uMorph controlado por JS
      vec3 finalPos = mix(fluidPos, wakePos, uMorph);

      vPos = finalPos;
      vDistance = length(finalPos);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos * uScale, 1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vPos;
    varying float vDistance;

    void main() {
      // Degradado de color exacto del video: Azul neón/Violeta y sutil destello rosado abajo
      vec3 colorBlue = vec3(0.3, 0.4, 1.0);
      vec3 colorPurple = vec3(0.5, 0.1, 0.8);
      vec3 colorPink = vec3(0.9, 0.3, 0.5);

      // Mezcla vertical de colores
      vec3 finalColor = mix(colorPurple, colorBlue, vPos.y * 0.5 + 0.5);
      
      // Añadir sutil reflejo rosado en la base del orbe (como se ve en los bordes inferiores del video)
      if(vPos.y < -0.2) {
         finalColor = mix(finalColor, colorPink, abs(vPos.y + 0.2) * 0.6);
      }

      // Suavizar los bordes exteriores de las líneas para simular Glow/Brillo difuminado
      float edgeGlow = smoothstep(1.3, 0.4, vDistance);

      gl_FragColor = vec4(finalColor * 1.4, edgeGlow * 0.8);
    }
  `
})

const lines = new THREE.LineSegments(geometry, customMaterial)
scene.add(lines)

// ── BUCLE DE ANIMACIÓN Y TRANSICIONES (LERP) ─────────────────────────────────
function animate() {
  requestAnimationFrame(animate)

  customMaterial.uniforms.uTime.value += 0.015

  // Interpolación suave (Lerp) del tamaño/escala de la esfera
  currentScale += (targetScale - currentScale) * 0.1
  customMaterial.uniforms.uScale.value = currentScale

  // Interpolación de la transición geométrica (Morphing) entre IDLE y WAKE
  currentMorph += (targetMorph - currentMorph) * 0.08
  customMaterial.uniforms.uMorph.value = currentMorph

  // Rotación ligera automática (en IDLE rota un poco, en WAKE se clava al centro)
  lines.rotation.y = (1.0 - currentMorph) * (customMaterial.uniforms.uTime.value * 0.1)
  lines.rotation.x = (1.0 - currentMorph) * 0.15

  renderer.render(scene, camera)
}

animate()

// ── MANEJADOR DE ESTADOS GLOBAL (INVOCADO POR RENDERER.JS) ────────────────────
window.sphereSetState = function(state) {
  if (SPHERE_SIZES[state] !== undefined) {
    targetScale = SPHERE_SIZES[state]
    
    // Cambiar dinámicamente el comportamiento gráfico según el estado del backend
    if (state === 'WAKE_DETECTED') {
      targetMorph = 1.0 // Pasa a anillos simétricos interactivos
    } else if (state === 'IDLE') {
      targetMorph = 0.0 // Vuelve a la forma fluida abstracta y asimétrica
    }
  }
}

// Ajustar tamaño del canvas si la ventana cambia
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
})