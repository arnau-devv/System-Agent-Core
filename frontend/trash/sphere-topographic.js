// ─── SPHERE: TOPOGRAPHIC (Efecto Topográfico de Metal Líquido) ───────────────
// Convertido a fábrica: createTopographicSphere(container) -> { setState, destroy }
// No declara nada en window — vive encapsulado en su propio closure.
// ───────────────────────────────────────────────────────────────────────────

function createTopographicSphere(container) {
    const SPHERE_SIZES = {
        IDLE: 0.6,
        WAKE_DETECTED: 1.0,
    }
    let currentScale = SPHERE_SIZES.IDLE
    let targetScale = SPHERE_SIZES.IDLE

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.z = 3.5

    const geometry = new THREE.SphereGeometry(1, 200, 200)

    const topographyMaterial = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,

        uniforms: {
        uTime: { value: 0 },
        uStateScale: { value: 0.6 },
        uNoiseFrequency: { value: 1.4 },
        uNoiseAmplitude: { value: 0.35 }
        },

        vertexShader: `
        uniform float uTime;
        uniform float uStateScale;
        uniform float uNoiseFrequency;
        uniform float uNoiseAmplitude;

        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vPosition;
        varying float vNoiseVal;

        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

        float snoise(vec3 v){
            const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 =   v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod(i, 289.0 );
            vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.zzww*sh.zzww;
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
            vPosition = position;

            vec3 noisePos = position * uNoiseFrequency + vec3(0.0, 0.0, uTime * 0.4);
            float noise = snoise(noisePos);
            vNoiseVal = noise;

            float displacement = noise * uNoiseAmplitude * (uStateScale * 1.2);
            vec3 displacedPosition = position + normal * displacement;

            vNormal = normalize(normalMatrix * normal);
            vec4 viewPos = modelViewMatrix * vec4(displacedPosition, 1.0);
            vViewDir = normalize(-viewPos.xyz);

            gl_Position = projectionMatrix * viewPos;
        }
        `,

        fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vPosition;
        varying float vNoiseVal;

        void main() {
            float viewAngle = max(dot(vNormal, vViewDir), 0.0);

            float radius = length(vPosition) + vNoiseVal * 0.05;

            float linePattern = sin(radius * 130.0 - uTime * 2.5);
            float lineGlow = smoothstep(0.7, 0.98, linePattern);

            vec3 colorDarkBase = vec3(0.01, 0.01, 0.03);
            vec3 colorBlue     = vec3(0.15, 0.35, 1.0);
            vec3 colorMagenta  = vec3(0.9, 0.15, 0.45);
            vec3 colorCyan     = vec3(0.3, 0.85, 1.0);

            float colorMixFactor = smoothstep(-0.6, 0.6, vPosition.y + vNoiseVal * 0.3);
            vec3 lineColor = mix(colorMagenta, colorBlue, colorMixFactor);

            lineColor = mix(lineColor, colorCyan, smoothstep(0.3, 0.9, vNoiseVal) * 0.4);

            vec3 finalColor = mix(colorDarkBase, lineColor, lineGlow * 1.4);

            float rim = pow(1.0 - viewAngle, 4.0);
            finalColor += lineColor * rim * 0.6;

            float alpha = clamp(0.25 + lineGlow * 0.75 + rim * 0.5, 0.0, 1.0);

            gl_FragColor = vec4(finalColor, alpha);
        }
        `
    })

    const sphere = new THREE.Mesh(geometry, topographyMaterial)
    scene.add(sphere)

    function lerpScale() {
        currentScale += (targetScale - currentScale) * 0.08
        sphere.scale.setScalar(currentScale)
        topographyMaterial.uniforms.uStateScale.value = currentScale
    }

    let rafId = null
    function animate() {
        rafId = requestAnimationFrame(animate)

        topographyMaterial.uniforms.uTime.value += 0.015

        sphere.rotation.y += 0.002
        sphere.rotation.z += 0.001

        lerpScale()

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
        if (SPHERE_SIZES[state] !== undefined) {
            targetScale = SPHERE_SIZES[state]
        }
        },
        destroy() {
        cancelAnimationFrame(rafId)
        window.removeEventListener('resize', handleResize)
        geometry.dispose()
        topographyMaterial.dispose()
        renderer.dispose()
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
        }
    }
}