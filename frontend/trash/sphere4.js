// ─── SPHERE.JS (Opción 1: Enjambre de Partículas) ───────────────────────────
const SPHERE_SIZES = {
  IDLE: 0.6,
  WAKE_DETECTED: 1.0,
}
let currentScale = SPHERE_SIZES.IDLE
let targetScale = SPHERE_SIZES.IDLE

const container = document.getElementById('sphere_container')

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(container.clientWidth, container.clientHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
container.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
camera.position.z = 3.5

// Una esfera de partículas masiva (25,000 puntos)
const geometry = new THREE.SphereGeometry(1, 160, 160)

const particleMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending, // Mezcla brillante tipo neón

  uniforms: {
    uTime: { value: 0 },
    uStateScale: { value: 0.6 }
  },

  vertexShader: `
    uniform float uTime;
    uniform float uStateScale;
    varying vec3 vColor;

    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.zzww*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      // Movimiento ondulatorio tridimensional
      float noise = snoise(position * 2.0 + vec3(0.0, uTime * 0.6, 0.0));
      
      // Desplazamiento reactivo según el estado
      float dispFactor = uStateScale * 0.4;
      vec3 displaced = position + normal * (noise * dispFactor);

      vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Atenuación del tamaño de partículas por la distancia a la cámara
      gl_PointSize = (4.5 + noise * 2.0) * (2.0 / -mvPosition.z);

      // Color dinámico según altura y ruido
      vec3 colorBlue = vec3(0.1, 0.4, 1.0);
      vec3 colorMagenta = vec3(0.9, 0.1, 0.5);
      vec3 colorCyan = vec3(0.2, 0.9, 1.0);

      vec3 mixColor = mix(colorMagenta, colorBlue, position.y * 0.5 + 0.5);
      vColor = mix(mixColor, colorCyan, smoothstep(0.2, 0.8, noise) * 0.3);
    }
  `,

  fragmentShader: `
    varying vec3 vColor;

    void main() {
      // Hacer que los puntos de WebGL sean circulares y difuminados, no cuadrados
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      float intensity = smoothstep(0.5, 0.0, dist);
      gl_FragColor = vec4(vColor, intensity * 0.8);
    }
  `
})

// Usamos THREE.Points en vez de un Mesh clásico
const particleSystem = new THREE.Points(geometry, particleMaterial)
scene.add(particleSystem)

function lerpScale() {
  currentScale += (targetScale - currentScale) * 0.08
  particleSystem.scale.setScalar(currentScale)
  particleMaterial.uniforms.uStateScale.value = currentScale
}

function animate() {
  requestAnimationFrame(animate)
  particleMaterial.uniforms.uTime.value += 0.015
  
  // Rotación suave continua
  particleSystem.rotation.y += 0.003
  particleSystem.rotation.x += 0.001

  lerpScale()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  if (!container) return
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
})

animate()

window.sphereSetState = function(state) {
  if (SPHERE_SIZES[state] !== undefined) {
    targetScale = SPHERE_SIZES[state]
  }
}