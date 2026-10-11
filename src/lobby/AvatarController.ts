import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AvatarController {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;

  private speed: number = 8.0;
  private isMoving: boolean = false;
  private mixer: THREE.AnimationMixer | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  
  // To handle manual bobbing fallback if no animations exist
  private animTime: number = 0;
  private modelMesh: THREE.Group | null = null;
  private hasAnimations: boolean = false;
  private baseY: number = 0;
  
  // Dynamically found limbs for procedural animation
  private leftLeg: THREE.Object3D | null = null;
  private rightLeg: THREE.Object3D | null = null;
  private leftArm: THREE.Object3D | null = null;
  private rightArm: THREE.Object3D | null = null;

  constructor(color: string = '#E05A47') {
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, -3);
    this.velocity = new THREE.Vector3();

    // Shadow
    const shadowGeo = new THREE.CircleGeometry(0.4, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.mesh.add(shadow);

    this.mesh.position.copy(this.position);

    // Load the custom GLB model
    const loader = new GLTFLoader();
    const url = '/my-assets/main-character.glb';
    
    loader.load(url, (gltf) => {
      this.modelMesh = gltf.scene;
      
      // Ensure the model casts/receives shadows and look for limbs
      this.modelMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        
        const name = child.name.toLowerCase();
        
        // Find legs
        if (name.includes('leg') || name.includes('foot') || name.includes('shoe') || name.includes('calf') || name.includes('thigh')) {
           if (name.includes('left') || name.includes('_l') || name.endsWith('l') || name.startsWith('l_')) this.leftLeg = child;
           else if (name.includes('right') || name.includes('_r') || name.endsWith('r') || name.startsWith('r_')) this.rightLeg = child;
           else if (!this.leftLeg) this.leftLeg = child;
           else if (!this.rightLeg) this.rightLeg = child;
        }
        
        // Find arms
        if (name.includes('arm') || name.includes('hand') || name.includes('sleeve') || name.includes('shoulder')) {
           if (name.includes('left') || name.includes('_l') || name.endsWith('l') || name.startsWith('l_')) this.leftArm = child;
           else if (name.includes('right') || name.includes('_r') || name.endsWith('r') || name.startsWith('r_')) this.rightArm = child;
           else if (!this.leftArm) this.leftArm = child;
           else if (!this.rightArm) this.rightArm = child;
        }
      });
      
      // Auto-scale the model to fit the game (around 4 units tall)
      const box = new THREE.Box3().setFromObject(this.modelMesh);
      const size = box.getSize(new THREE.Vector3());
      const desiredHeight = 4.0; 
      const scale = desiredHeight / size.y;
      this.modelMesh.scale.setScalar(scale);

      // Also ensure it rests on the floor if its origin isn't at its feet
      const newBox = new THREE.Box3().setFromObject(this.modelMesh);
      this.baseY = -newBox.min.y;
      this.modelMesh.position.y = this.baseY;
      
      // Face the correct direction (often models are rotated 180 degrees by default)
      // We can adjust this if it faces backwards, but usually they face +Z.
      // If it's facing backward, uncomment this:
      // this.modelMesh.rotation.y = Math.PI;

      this.mesh.add(this.modelMesh);

      // Setup animations if present
      if (gltf.animations && gltf.animations.length > 0) {
        this.hasAnimations = true;
        this.mixer = new THREE.AnimationMixer(this.modelMesh);
        
        // Find idle and walk/run animations based on name, or just use indices
        const idleAnim = gltf.animations.find(a => a.name.toLowerCase().includes('idle')) || gltf.animations[0];
        const walkAnim = gltf.animations.find(a => a.name.toLowerCase().includes('walk') || a.name.toLowerCase().includes('run')) || (gltf.animations.length > 1 ? gltf.animations[1] : gltf.animations[0]);
        
        if (idleAnim) {
          this.idleAction = this.mixer.clipAction(idleAnim);
          this.idleAction.play();
        }
        if (walkAnim) {
          this.walkAction = this.mixer.clipAction(walkAnim);
        }
      }
    }, undefined, (error) => {
      console.error('Error loading main character GLB:', error);
    });
  }

  update(dt: number, keys: { up: boolean; down: boolean; left: boolean; right: boolean }): void {
    this.velocity.set(0, 0, 0);
    this.isMoving = false;

    if (keys.up) { this.velocity.z = this.speed; this.isMoving = true; }
    if (keys.down) { this.velocity.z = -this.speed; this.isMoving = true; }
    if (keys.left) { this.velocity.x = this.speed; this.isMoving = true; }
    if (keys.right) { this.velocity.x = -this.speed; this.isMoving = true; }

    // Normalize diagonal
    if (this.velocity.length() > this.speed) {
      this.velocity.normalize().multiplyScalar(this.speed);
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Clamp to market bounds
    this.position.x = Math.max(-8, Math.min(8, this.position.x));
    this.position.z = Math.max(-5, Math.min(130, this.position.z));

    this.mesh.position.copy(this.position);

    // Smooth shortest-path rotation
    if (this.isMoving) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetAngle - this.mesh.rotation.y;
      
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      this.mesh.rotation.y += diff * Math.min(1, dt * 10);
    }

    // Animation updates
    if (this.hasAnimations && this.mixer) {
      this.mixer.update(dt);
      
      if (this.isMoving) {
        if (this.walkAction && !this.walkAction.isRunning()) {
          this.walkAction.reset().fadeIn(0.2).play();
          if (this.idleAction) this.idleAction.fadeOut(0.2);
        }
      } else {
        if (this.idleAction && !this.idleAction.isRunning()) {
          this.idleAction.reset().fadeIn(0.2).play();
          if (this.walkAction) this.walkAction.fadeOut(0.2);
        }
      }
    } else if (this.modelMesh && !this.hasAnimations) {
      // Fallback bobbing if no animations found in the GLB
      if (this.isMoving) {
        this.animTime += dt * 10;
        this.modelMesh.position.y = this.baseY + Math.abs(Math.sin(this.animTime * 2)) * 0.1;
        
        // Procedurally swing detected limbs
        const legSwing = Math.sin(this.animTime) * 0.6;
        const armSwing = Math.sin(this.animTime) * 0.4;
        
        if (this.leftLeg) this.leftLeg.rotation.x = legSwing;
        if (this.rightLeg) this.rightLeg.rotation.x = -legSwing;
        if (this.leftArm) this.leftArm.rotation.x = -armSwing;
        if (this.rightArm) this.rightArm.rotation.x = armSwing;
        
      } else {
        this.modelMesh.position.y += (this.baseY - this.modelMesh.position.y) * 0.1;
        
        // Reset limb rotations
        if (this.leftLeg) this.leftLeg.rotation.x *= 0.8;
        if (this.rightLeg) this.rightLeg.rotation.x *= 0.8;
        if (this.leftArm) this.leftArm.rotation.x *= 0.8;
        if (this.rightArm) this.rightArm.rotation.x *= 0.8;
      }
    }
  }
}
