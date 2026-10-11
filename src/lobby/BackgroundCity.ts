import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class BackgroundCity {
  private scene: THREE.Scene;
  private streetLength: number;

  constructor(scene: THREE.Scene, streetLength: number = 150) {
    this.scene = scene;
    this.streetLength = streetLength;
  }

  public init() {
    this.spawnBackgroundBuildings();
    this.spawnClutter();
    this.spawnNPCs();
  }

  private loadInstancedGLB(url: string, count: number, targetHeight: number, setupTransforms: (dummy: THREE.Object3D, index: number, baseScale: number, yOffset: number) => void) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      // Calculate original size to determine base scale
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const baseScale = targetHeight / (size.y || 1);
      const yOffset = -box.min.y * baseScale; // To align to floor

      const meshes: THREE.Mesh[] = [];
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshes.push(child as THREE.Mesh);
        }
      });

      const dummy = new THREE.Object3D();

      for (const mesh of meshes) {
        const instancedMesh = new THREE.InstancedMesh(
          mesh.geometry,
          mesh.material,
          count
        );
        // Disable shadows on background instances to save massive performance
        instancedMesh.castShadow = false;
        instancedMesh.receiveShadow = false;

        for (let i = 0; i < count; i++) {
          dummy.position.set(0, 0, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          
          setupTransforms(dummy, i, baseScale, yOffset);
          
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(instancedMesh);
      }
    });
  }

  private loadClonedGLB(url: string, count: number, targetHeight: number, setupTransforms: (clone: THREE.Object3D, index: number) => void) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      // Auto-scale the root
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const scale = targetHeight / (size.y || 1);
      gltf.scene.scale.setScalar(scale);

      // Floor alignment
      const newBox = new THREE.Box3().setFromObject(gltf.scene);
      const yOffset = -newBox.min.y;

      for (let i = 0; i < count; i++) {
        const clone = gltf.scene.clone();
        clone.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });
        
        clone.position.set(0, yOffset, 0);
        clone.rotation.set(0, 0, 0);
        
        setupTransforms(clone, i);
        this.scene.add(clone);
      }
    });
  }

  private spawnBackgroundBuildings() {
    // 1. Two-story commercial buildings
    const count2Story = 30; // We can bump this up slightly now since shadows are off
    this.loadInstancedGLB('/my-assets/backgrounds/A-3D-game-asset-of-a-low-poly-2-story-commercial.glb', count2Story, 20, (dummy, i, baseScale, yOffset) => {
      const isLeft = i % 2 === 0;
      const side = isLeft ? -1 : 1;
      const zIndex = Math.floor(i / 2);
      const zPos = -20 + (zIndex * 10); 
      
      // Randomize scale slightly around the target height
      const scale = baseScale * (0.9 + Math.random() * 0.4);
      dummy.scale.setScalar(scale);
      
      const xPos = side * (20 + Math.random() * 4);
      dummy.position.set(xPos, yOffset * (scale/baseScale), zPos);
      
      dummy.rotation.y = (isLeft ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.3;
    });

    // 2. Three-story residential buildings
    const count3Story = 20;
    this.loadInstancedGLB('/my-assets/backgrounds/A-3D-game-asset-of-a-low-poly-3-story-residentia.glb', count3Story, 30, (dummy, i, baseScale, yOffset) => {
      const isLeft = i % 2 === 0;
      const side = isLeft ? -1 : 1;
      const zIndex = Math.floor(i / 2);
      const zPos = -10 + (zIndex * 12); 
      
      const scale = baseScale * (0.9 + Math.random() * 0.4);
      dummy.scale.setScalar(scale);
      
      const xPos = side * (26 + Math.random() * 5);
      dummy.position.set(xPos, yOffset * (scale/baseScale), zPos);
      dummy.rotation.y = (isLeft ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.5;
    });

    // 3. Telecom Masts
    const countMasts = 6;
    this.loadInstancedGLB('/my-assets/backgrounds/A-3D-game-asset-of-a-low-poly-telecom-mast-with.glb', countMasts, 50, (dummy, i, baseScale, yOffset) => {
      const isLeft = i % 2 === 0;
      const side = isLeft ? -1 : 1;
      const zPos = i * 25;
      
      const scale = baseScale * (0.8 + Math.random() * 0.4);
      dummy.scale.setScalar(scale);
      dummy.position.set(side * (35 + Math.random() * 10), yOffset * (scale/baseScale), zPos);
      dummy.rotation.y = Math.random() * Math.PI * 2;
    });

    // 4. Tall Multi-Story Buildings (Using cloned GLB to preserve AI generator transforms)
    const countTall = 6; // Reduced count for heavy AI assets
    this.loadClonedGLB('/my-assets/backgrounds/A-3D-game-asset-of-an-african-tall-multi-story-b.glb', countTall, 40, (clone, i) => {
      const isLeft = i % 2 === 0;
      const side = isLeft ? -1 : 1;
      const zPos = (i * 20);
      
      clone.position.set(side * (28 + Math.random() * 6), clone.position.y, zPos);
      clone.rotation.y = (isLeft ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.2;
    });
  }

  private spawnClutter() {
    // Wheelbarrows scattered everywhere
    const barrowCount = 15;
    this.loadInstancedGLB('/my-assets/wheelbarrow.glb', barrowCount, 2.5, (dummy, i, baseScale, yOffset) => {
      const isLeft = i % 2 === 0;
      const side = isLeft ? -1 : 1;
      const zPos = (i * 6) + (Math.random() * 5);
      
      const scale = baseScale * (0.8 + Math.random() * 0.4);
      dummy.scale.setScalar(scale);
      
      const xPos = side * (6 + Math.random() * 3);
      dummy.position.set(xPos, yOffset * (scale/baseScale), zPos);
      
      // Chaotic rotations
      dummy.rotation.y = Math.random() * Math.PI * 2;
    });

    // Densely Cluttered Market Stalls
    const clutterCount = 8; // Reduced for performance
    this.loadClonedGLB('/my-assets/backgrounds/A-3D-game-asset-of-a-densely-cluttered-market-st.glb', clutterCount, 5, (clone, i) => {
      const isLeft = i % 2 === 0;
      const side = isLeft ? -1 : 1;
      const zPos = (i * 15) + (Math.random() * 5);
      
      const xPos = side * (14 + Math.random() * 2);
      clone.position.set(xPos, clone.position.y, zPos);
      clone.rotation.y = (isLeft ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.4;
    });

    // Market Umbrellas
    const umbrellaCount = 10; // Reduced for performance
    this.loadClonedGLB('/my-assets/backgrounds/A-3D-game-asset-of-a-large-colorful-market-umbre.glb', umbrellaCount, 5.5, (clone, i) => {
      const isLeft = i % 2 === 0;
      const side = isLeft ? -1 : 1;
      const zPos = (i * 12) + (Math.random() * 8);
      
      const xPos = side * (8 + Math.random() * 4);
      clone.position.set(xPos, clone.position.y, zPos);
      
      const tiltX = (Math.random() - 0.5) * 0.4;
      const tiltZ = (Math.random() - 0.5) * 0.4;
      clone.rotation.set(tiltX, Math.random() * Math.PI, tiltZ);
    });
  }

  private spawnNPCs() {
    // Render cheap primitive "crowd" figures
    const count = 30; // Drastically reduced
    
    // Simple shape: Cylinder for body, Sphere for head
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
    const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
    
    const skinColors = ['#8D6E63', '#5D4037', '#4E342E', '#3E2723'];
    const clothesColors = ['#E67E22', '#2980B9', '#8E44AD', '#16A085', '#C0392B', '#7F8C8D'];
    
    clothesColors.forEach((clothesColor) => {
      const bodyMat = new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.9 });
      const headMat = new THREE.MeshStandardMaterial({ color: skinColors[Math.floor(Math.random() * skinColors.length)], roughness: 0.7 });
      
      const subCount = Math.floor(count / clothesColors.length);
      const bodyInst = new THREE.InstancedMesh(bodyGeo, bodyMat, subCount);
      const headInst = new THREE.InstancedMesh(headGeo, headMat, subCount);
      
      bodyInst.castShadow = false;
      headInst.castShadow = false;
      
      const dummy = new THREE.Object3D();
      
      for (let i = 0; i < subCount; i++) {
        // Place them further down the street or along the edges to not block the player
        const side = Math.random() > 0.5 ? 1 : -1;
        // X between 3 and 10 (edges), Z spread across the street
        const xPos = side * (3 + Math.random() * 7); 
        const zPos = 10 + Math.random() * this.streetLength;
        
        // Body
        dummy.position.set(xPos, 0.6, zPos);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.updateMatrix();
        bodyInst.setMatrixAt(i, dummy.matrix);
        
        // Head
        dummy.position.set(xPos, 1.45, zPos);
        dummy.updateMatrix();
        headInst.setMatrixAt(i, dummy.matrix);
      }
      
      bodyInst.instanceMatrix.needsUpdate = true;
      headInst.instanceMatrix.needsUpdate = true;
      this.scene.add(bodyInst);
      this.scene.add(headInst);
    });
  }
}
