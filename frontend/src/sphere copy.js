// ─── SPHERE.JS ───────────────────────────────────────────────────────────────
// Paso 1+2: Esfera 3D base con iluminación
// Estado: IDLE (pequeña) / LISTENING (grande)
// ─────────────────────────────────────────────────────────────────────────────


// ── Tamaños según estado ──────────────────────────────────────────────────────
const SPHERE_SIZES = {
  IDLE:      0.6,
  WAKE_DETECTED: 1.0,
}
let currentScale  = SPHERE_SIZES.IDLE
let targetScale   = SPHERE_SIZES.IDLE

// ── Setup básico de Three.js ──────────────────────────────────────────────────
const container = document.getElementById('sphere_container')

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(container.clientWidth, container.clientHeight)
renderer.setPixelRatio(window.devicePixelRatio)
container.appendChild(renderer.domElement)

const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  45,                                              // fov
  container.clientWidth / container.clientHeight,  // aspect
  0.1,                                             // near
  100                                              // far
)
camera.position.z = 3

// ── Esfera con shader de nebulosa ─────────────────────────────────────────────
const geometry = new THREE.SphereGeometry(1, 64, 64)

const nebulaMaterial = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.FrontSide,

  uniforms: {
    uTime:   { value: 0 },
    uColor1: { value: new THREE.Color(0x4400ff) },
    uColor2: { value: new THREE.Color(0x00ccff) },
    uNoise:  { value: 0.18 },   // intensidad de la deformación
    uSpeed:  { value: 0.4  },   // velocidad del movimiento
  },

  vertexShader: `
    uniform float uTime;
    uniform float uNoise;
    uniform float uSpeed;

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying float vDisplace;   // pasamos la deformación al fragment

    // ── Perlin noise 3D ───────────────────────────────────────────────────────
    // Implementación clásica de noise en GLSL (no necesita librería externa)
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
    // ─────────────────────────────────────────────────────────────────────────

    void main() {
      // Samplear el ruido en la posición del vértice + tiempo
      float n = snoise(position * 1.5 + uTime * uSpeed);

      // Desplazar el vértice a lo largo de su normal
      vec3 displaced = position + normal * n * uNoise;

      vDisplace = n;   // lo usamos en el fragment para variar el color
      vNormal   = normalize(normalMatrix * normal);
      vec4 worldPos = modelViewMatrix * vec4(displaced, 1.0);
      vViewDir  = normalize(-worldPos.xyz);

      gl_Position = projectionMatrix * worldPos;
    }
  `,

  fragmentShader: `
    uniform vec3  uColor1;
    uniform vec3  uColor2;

    varying vec3  vNormal;
    varying vec3  vViewDir;
    varying float vDisplace;

    void main() {
      float fresnel = pow(1.0 - dot(vNormal, vViewDir), 2.5);

      // El noise también afecta al color — zonas elevadas más cyan
      float colorMix = fresnel + vDisplace * 0.3;
      vec3 color = mix(uColor1, uColor2, clamp(colorMix, 0.0, 1.0));

      float alpha = fresnel * 0.9 + 0.08;

      gl_FragColor = vec4(color, alpha);
    }
  `
})

const sphere = new THREE.Mesh(geometry, nebulaMaterial)
scene.add(sphere)

// Wireframe sutil encima
const wireMaterial = new THREE.MeshBasicMaterial({
  color:       0x4488ff,
  wireframe:   true,
  transparent: true,
  opacity:     0.04,
})
const wireframe = new THREE.Mesh(geometry, wireMaterial)
scene.add(wireframe)
// ── Iluminación ───────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)   // luz base suave
scene.add(ambientLight)

const pointLight = new THREE.PointLight(0x6699ff, 2, 10)     // luz azulada principal
pointLight.position.set(2, 3, 3)
scene.add(pointLight)

const rimLight = new THREE.PointLight(0xaa44ff, 1, 10)       // contraluz morada
rimLight.position.set(-3, -1, -2)
scene.add(rimLight)

// ── Animación de escala (suave) ───────────────────────────────────────────────
// En cada frame interpolamos currentScale hacia targetScale (lerp)
// Cuanto más cerca de 1 el factor, más rápido — 0.05 es suave
function lerpScale() {
  currentScale += (targetScale - currentScale) * 0.05
  sphere.scale.setScalar(currentScale)
}

function animate() {
  requestAnimationFrame(animate)

  nebulaMaterial.uniforms.uTime.value += 0.01   // reloj para animaciones futuras

  sphere.rotation.y += 0.003
  sphere.rotation.x += 0.001
  wireframe.rotation.copy(sphere.rotation)

  lerpScale()
  wireframe.scale.copy(sphere.scale)

  renderer.render(scene, camera)
}

animate()

// ── API pública: cambiar estado desde renderer.js ─────────────────────────────
// Uso: sphereSetState('LISTENING') / sphereSetState('IDLE')
window.sphereSetState = function(state) {
  if (SPHERE_SIZES[state] !== undefined) {
    targetScale = SPHERE_SIZES[state]
  }
}