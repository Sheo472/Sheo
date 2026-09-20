// 3d-script.js
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // Scene Setup
    const scene = new THREE.Scene();
    
    // Fog for depth
    scene.fog = new THREE.FogExp2(0x000000, 0.05);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // optimize performance
    renderer.outputEncoding = THREE.sRGBEncoding;
    // Tone mapping for realistic lighting
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);
    
    const spotLight = new THREE.SpotLight(0xffffff, 2);
    spotLight.position.set(0, 5, 5);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    scene.add(spotLight);

    // Models configuration
    const models = [
        { path: 'assets/models/nike.glb', scale: 0.12, yOffset: -0.5 }, // Adjust scales to match screen sizes
        { path: '3dshoe/scene.gltf', scale: 1.5, yOffset: -1 } 
    ];
    let currentIndex = 0;
    let currentModel = null;
    const loader = new THREE.GLTFLoader();

    // Floating animation timeline reference
    let floatTween = null;

    function loadModel(index) {
        if (currentModel) {
            if (floatTween) floatTween.kill();
            // Animate out (shrink and fly away)
            gsap.to(currentModel.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.in(1.7)" });
            gsap.to(currentModel.position, { y: 5, duration: 0.5, onComplete: () => {
                scene.remove(currentModel);
                currentModel = null;
                spawnModel(index);
            }});
        } else {
            spawnModel(index);
        }
    }

    function spawnModel(index) {
        const data = models[index];
        loader.load(data.path, (gltf) => {
            const model = gltf.scene;
            
            // Center the model's geometry
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            
            // Re-center children around 0,0,0
            model.children.forEach(child => {
                child.position.x -= center.x;
                child.position.y -= center.y;
                child.position.z -= center.z;
            });
            
            // Apply offset
            model.position.y = data.yOffset;
            
            model.scale.set(0, 0, 0); // Start scale at 0
            scene.add(model);
            currentModel = model;

            // Animate in using GSAP elastic ease
            gsap.to(model.scale, { 
                x: data.scale, 
                y: data.scale, 
                z: data.scale, 
                duration: 1.5, 
                ease: "elastic.out(1, 0.5)" 
            });
            
            // Spin effect on entry
            gsap.fromTo(model.rotation, 
                { y: -Math.PI }, 
                { y: 0, duration: 1.5, ease: "power3.out" }
            );

            // Add continuous floating effect
            floatTween = gsap.to(model.position, {
                y: data.yOffset + 0.3,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });

        }, undefined, (error) => {
            console.error("Error loading model:", error);
        });
    }

    // Initial load
    loadModel(currentIndex);

    // Controls
    document.getElementById('nextModel').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % models.length;
        loadModel(currentIndex);
    });

    document.getElementById('prevModel').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + models.length) % models.length;
        loadModel(currentIndex);
    });

    // Mouse Interaction for parallax
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        
        let targetX = mouseX * 0.001;
        let targetY = mouseY * 0.001;

        if (currentModel) {
            // Smooth mouse rotation interaction combined with slow auto rotation
            currentModel.rotation.y += 0.05 * (targetX - currentModel.rotation.y) + 0.003;
            currentModel.rotation.x += 0.05 * (targetY - currentModel.rotation.x);
        }

        renderer.render(scene, camera);
    }
    animate();

    // Resize Handling
    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    
    // ScrollTrigger to animate camera depth when scrolling into view
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        
        gsap.to(camera.position, {
            scrollTrigger: {
                trigger: "#shop-by-3d",
                start: "top bottom",
                end: "center center",
                scrub: 1
            },
            z: 5, // zoom in slightly
            ease: "power1.out"
        });
    }
});

