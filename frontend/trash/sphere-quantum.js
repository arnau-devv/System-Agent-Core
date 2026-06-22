// ─── SPHERE: QUANTUM (Enjambre de Partículas Cuánticas, volumen relleno) ─────
// Convertido a fábrica: createQuantumSphere(container) -> { setState, destroy }
// ───────────────────────────────────────────────────────────────────────────

function createQuantumSphere(container) {
    const STATES = {
        IDLE: {
        scale: 1.25,
        particleSpeed: 0.3,
        expansion: 0.0
        },
        WAKE_DETECTED: {
        scale: 1.5,
        particleSpeed: 1.6,
        expansion: 0.35
        }
    }

    let currentScale = STATES.IDLE.scale
    let targetScale = STATES.IDLE.scale
    let currentSpeed = STATES.IDLE.particleSpeed
    let targetSpeed = STATES.IDLE.particleSpeed
    let currentExpansion = STATES.IDLE.expansion
    let targetExpansion = STATES.IDLE.expansion

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.z = 5.0

    const particlesCount = 8500
    const posArray = new Float32Array(particlesCount * 3)
    const randomArray = new Float32Array(particlesCount)

    for (let i = 0; i < particlesCount * 3; i += 3) {
        const u = Math.random()
        const v = Math.random()
        const theta = u * 2.0 * Math.PI
        const phi = Math.acos(2.0 * v - 1.0)
        const r = Math.cbrt(Math.random())

        const x = r * Math.sin(phi) * Math.cos(theta)
        const y = r * Math.sin(phi) * Math.sin(theta)
        const z = r * Math.cos(phi)

        posArray[i]   = x
        posArray[i+1] = y
        posArray[i+2] = z

        randomArray[i/3] = Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randomArray, 1))

    const particlesMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,

        uniforms: {
        uTime:      { value: 0 },
        uExpansion: { value: currentExpansion }
        },

        vertexShader: `
        uniform float uTime;
        uniform float uExpansion;

        attribute float aRandom;
        varying float vDistance;

        void main() {
            vec3 pos = position;

            float pulse = sin(uTime * 2.5 + aRandom * 12.0) * 0.08;
            pos += normalize(pos) * (uExpansion * aRandom + pulse);

            vDistance = length(pos);

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

            gl_PointSize = (15.0 * aRandom) * (1.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
        `,

        fragmentShader: `
        varying float vDistance;

        void main() {
            float distToCenter = distance(gl_PointCoord, vec2(0.5));
            if (distToCenter > 0.5) discard;

            vec3 coreColor = vec3(0.15, 0.35, 1.0);
            vec3 outerColor = vec3(0.95, 0.15, 0.45);

            vec3 finalColor = mix(coreColor, outerColor, clamp(vDistance * 0.75, 0.0, 1.0));

            float alpha = 1.0 - (distToCenter * 2.0);

            gl_FragColor = vec4(finalColor, alpha * 0.9);
        }
        `
    })

    const particlesMesh = new THREE.Points(geometry, particlesMaterial)
    scene.add(particlesMesh)

    function smoothTransitions() {
        currentScale     += (targetScale - currentScale) * 0.07
        currentSpeed     += (targetSpeed - currentSpeed) * 0.06
        currentExpansion += (targetExpansion - currentExpansion) * 0.07

        particlesMesh.scale.setScalar(currentScale)
        particlesMaterial.uniforms.uExpansion.value = currentExpansion
    }

    let rafId = null
    function animate() {
        rafId = requestAnimationFrame(animate)
        particlesMaterial.uniforms.uTime.value += 0.01 * currentSpeed

        particlesMesh.rotation.y += 0.0012 * currentSpeed
        particlesMesh.rotation.x += 0.0006 * currentSpeed

        smoothTransitions()
        renderer.render(scene, camera)
    }

    function handleResize() {
        if (!container) return
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    animate()

    return {
        setState(state) {
        const config = STATES[state]
        if (config) {
            targetScale = config.scale
            targetSpeed = config.particleSpeed
            targetExpansion = config.expansion
        }
        },
        destroy() {
        cancelAnimationFrame(rafId)
        window.removeEventListener('resize', handleResize)
        geometry.dispose()
        particlesMaterial.dispose()
        renderer.dispose()
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
        }
    }
}