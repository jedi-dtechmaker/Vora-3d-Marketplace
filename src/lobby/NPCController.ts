import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class NPCController {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  private velocity: THREE.Vector3;
  
  private animTime: number;
  private speed: number;
  private zBounds: [number, number];

  // Dynamic animation parts
  private leftLeg: THREE.Object3D | null = null;
  private rightLeg: THREE.Object3D | null = null;
  private leftArm: THREE.Object3D | null = null;
  private rightArm: THREE.Object3D | null = null;
  private modelRoot: THREE.Object3D | null = null;
  private speed: number;
  private zBounds: [number, number];
  private baseY: number = 0;

  constructor(color: string, startZ: number, bounds: [number, number], speed: number = 3.0) {
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3((Math.random() - 0.5) * 8, 0, startZ);
    this.velocity = new THREE.Vector3(0, 0, speed);
    this.speed = speed;
    this.zBounds = bounds;
    this.animTime = Math.random() * 10;

    const urls = [
      '/my-assets/people/A-3D-game-asset-of-a-Nigerian-market-woman-carry.glb',
      '/my-assets/people/A-3D-game-asset-of-a-Nigerian-market-woman-carry (1).glb',
      '/my-assets/people/young-girl hawking.glb'
    ];
    const url = urls[Math.floor(Math.random() * urls.length)];

    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      this.modelRoot = gltf.scene;

      // Auto-scale to roughly 4.0 units tall (same as main character)
      const box = new THREE.Box3().setFromObject(this.modelRoot);
      const size = box.getSize(new THREE.Vector3());
      const scale = 4.0 / (size.y || 1);
      this.modelRoot.scale.setScalar(scale);

      // Floor alignment - Hide generated pedestal by burying the bottom 6% in the ground
      const newBox = new THREE.Box3().setFromObject(this.modelRoot);
      const modelHeight = newBox.max.y - newBox.min.y;
      const pedestalOffset = modelHeight * 0.06; // Bury the bottom 6%
      
      this.baseY = -newBox.min.y - pedestalOffset;
      this.modelRoot.position.y = this.baseY;
      
      // Dynamic Limb Detection for procedural animation
      this.modelRoot.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          const name = child.name.toLowerCase();
          if (name.includes('leg') || name.includes('foot') || name.includes('shoe') || name.includes('pant')) {
            if (name.includes('left') || name.includes('l_')) this.leftLeg = child;
            else if (name.includes('right') || name.includes('r_')) this.rightLeg = child;
          } else if (name.includes('arm') || name.includes('hand') || name.includes('sleeve')) {
            if (name.includes('left') || name.includes('l_')) this.leftArm = child;
            else if (name.includes('right') || name.includes('r_')) this.rightArm = child;
          }
        }
      });
      
      this.mesh.add(this.modelRoot);
    });

    // Shadow
    const shadowGeo = new THREE.CircleGeometry(0.4, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.mesh.add(shadow);

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.velocity.z > 0 ? 0 : Math.PI;
  }

  update(dt: number): void {
    this.position.z += this.velocity.z * dt;
    this.position.x += this.velocity.x * dt;

    // Wander slightly horizontally
    this.velocity.x += (Math.random() - 0.5) * 5 * dt;
    this.velocity.x = Math.max(-1, Math.min(1, this.velocity.x));
    this.position.x = Math.max(-6, Math.min(6, this.position.x));

    // Turn around at bounds
    if (this.position.z > this.zBounds[1]) {
      this.velocity.z = -this.speed;
      this.mesh.rotation.y = Math.PI;
    } else if (this.position.z < this.zBounds[0]) {
      this.velocity.z = this.speed;
      this.mesh.rotation.y = 0;
    }

    this.mesh.position.copy(this.position);

    // Walk animation
    this.animTime += dt * 8;
    const legSwing = Math.sin(this.animTime) * 0.4;
    const armSwing = Math.sin(this.animTime) * 0.3;
    
    if (this.leftLeg) this.leftLeg.rotation.x = legSwing;
    if (this.rightLeg) this.rightLeg.rotation.x = -legSwing;
    if (this.leftArm) this.leftArm.rotation.x = -armSwing;
    if (this.rightArm) this.rightArm.rotation.x = armSwing;
    
    // Natural bobbing for the entire model
    if (this.modelRoot) {
      this.modelRoot.position.y = this.baseY + Math.abs(Math.sin(this.animTime * 2)) * 0.05;
    }
  }
}
