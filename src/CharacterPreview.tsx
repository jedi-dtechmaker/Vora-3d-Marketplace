import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface CharacterPreviewProps {
  onClose: () => void;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({ onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#2A2D34');

    // Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 4, 10);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 2, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -5;
    dirLight.shadow.camera.left = -5;
    dirLight.shadow.camera.right = 5;
    scene.add(dirLight);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Load custom GLB character
    let mixer: THREE.AnimationMixer | null = null;
    const loader = new GLTFLoader();
    const url = '/my-assets/main-character.glb';
    
    loader.load(url, (gltf) => {
      const model = gltf.scene;
      
      // Enable shadows
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Auto-scale the model to roughly 4 units tall to be clearly visible
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const desiredHeight = 4.0;
      const scale = desiredHeight / size.y;
      model.scale.setScalar(scale);

      // Adjust to rest exactly on the floor (y=0)
      const newBox = new THREE.Box3().setFromObject(model);
      model.position.y -= newBox.min.y;

      scene.add(model);

      // Setup and play animations if present (play the first one as a preview)
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
      }
    });

    const clock = new THREE.Clock();

    // Animation loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (mixer) mixer.update(dt);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000, background: '#2A2D34' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <button 
        onClick={onClose} 
        style={{ 
          position: 'absolute', 
          top: 20, 
          left: 20, 
          padding: '12px 24px', 
          background: 'white', 
          color: 'black',
          border: 'none', 
          borderRadius: 8, 
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}
      >
        Close Preview
      </button>
      <div 
        style={{ 
          position: 'absolute', 
          bottom: 20, 
          left: '50%', 
          transform: 'translateX(-50%)',
          color: 'white',
          background: 'rgba(0,0,0,0.5)',
          padding: '10px 20px',
          borderRadius: 20,
          pointerEvents: 'none'
        }}
      >
        Drag to rotate • Scroll to zoom (Custom GLB)
      </div>
    </div>
  );
};
