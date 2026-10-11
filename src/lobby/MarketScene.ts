import * as THREE from 'three';
import type { Shop } from '../types/market';
import { AvatarController } from './AvatarController';
import { ShopBuilder } from './ShopBuilder';
import { NPCController } from './NPCController';
import { BackgroundCity } from './BackgroundCity';

export class MarketScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private avatar: AvatarController;
  private npcs: NPCController[] = [];
  private isRunning: boolean = false;
  private shops: Shop[];
  private nearbyShopId: string | null = null;

  // Track keyboard and mobile on-screen keys
  private kbKeys = { up: false, down: false, left: false, right: false };
  private mobileKeys = { up: false, down: false, left: false, right: false };
  
  // Camera controls
  private zoomLevel: number = 1.0;

  public onNearShop?: (shopId: string | null) => void;
  public onEnterShop?: (shopId: string) => void;

  constructor(container: HTMLElement, shops: Shop[]) {
    this.container = container;
    this.shops = shops;

    // Scene setup - dense, dusty afternoon market
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#D2B48C'); // Dusty haze
    this.scene.fog = new THREE.Fog('#D2B48C', 15, 80);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows for dusty vibe
    container.appendChild(this.renderer.domElement);

    // Lighting
    const hemiLight = new THREE.HemisphereLight('#D2B48C', '#8B4513', 0.8);
    this.scene.add(hemiLight);

    // Late afternoon sun - lower angle for long shadows
    const sunLight = new THREE.DirectionalLight('#FFDAB9', 2.5); // Peach/warm afternoon light
    sunLight.position.set(40, 30, -20); // Low angle
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.001; // Reduce shadow acne
    this.scene.add(sunLight);

    // Build ground (dusty earth)
    const ground = ShopBuilder.buildGround(140);
    this.scene.add(ground);

    // Build all shop stalls
    for (const shop of shops) {
      const stall = ShopBuilder.buildShopStall(shop);
      this.scene.add(stall);
    }

    // Decorations between shops
    const decZs = [15, 40, 65, 90, 115];
    for (const z of decZs) {
      ShopBuilder.buildDecorations(z).children.forEach(c => this.scene.add(c));
    }

    // NPCs (Hawkers & Shoppers)
    const npcColors = ['#E67E22', '#2980B9', '#8E44AD', '#16A085', '#F39C12'];
    for (let i = 0; i < 8; i++) {
      const npc = new NPCController(
        npcColors[Math.floor(Math.random() * npcColors.length)], 
        5 + Math.random() * 60, 
        [-5, 75], 
        1.5 + Math.random() * 1.5
      );
      this.npcs.push(npc);
      this.scene.add(npc.mesh);
    }

    // Avatar
    this.avatar = new AvatarController('#E05A47');
    this.scene.add(this.avatar.mesh);

    // Chaos Background City
    const backgroundCity = new BackgroundCity(this.scene, 140);
    backgroundCity.init();

    // Welcome arch at entrance
    this.buildWelcomeArch();

    // Events
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    
    // Using passive: false so we can prevent page scrolling while zooming in the 3D view
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private buildWelcomeArch(): void {
    // Two pillars
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.4, 6, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#8B4513' });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-5, 3, -3);
    leftPillar.castShadow = true;
    this.scene.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(5, 3, -3);
    rightPillar.castShadow = true;
    this.scene.add(rightPillar);

    // Arch beam
    const beamGeo = new THREE.BoxGeometry(11, 1.2, 0.8);
    const beamMat = new THREE.MeshStandardMaterial({ color: '#E67E22' });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 6.3, -3);
    beam.castShadow = true;
    this.scene.add(beam);

    // Sign plate
    const signGeo = new THREE.BoxGeometry(8, 0.8, 0.3);
    const signMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 6.3, -2.55);
    this.scene.add(sign);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onWheel);
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  // Allow setting keys from React UI (Mobile Controls)
  setMobileKeys(keys: { up: boolean, down: boolean, left: boolean, right: boolean }): void {
    this.mobileKeys = keys;
  }

  triggerEnter(): void {
    if (this.nearbyShopId && this.onEnterShop) {
      this.onEnterShop(this.nearbyShopId);
    }
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.kbKeys.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.kbKeys.down = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.kbKeys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.kbKeys.right = true;
    if (e.code === 'Enter' || e.code === 'Space') {
      this.triggerEnter();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.kbKeys.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.kbKeys.down = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.kbKeys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.kbKeys.right = false;
  };

  private onWheel = (e: WheelEvent): void => {
    // Only intercept if event target is our canvas
    if (e.target === this.renderer.domElement) {
      e.preventDefault();
      // Adjust zoom based on scroll direction (deltaY)
      this.zoomLevel += e.deltaY * 0.002;
      // Clamp between close up (0.5) and far away (2.5)
      this.zoomLevel = Math.max(0.5, Math.min(2.5, this.zoomLevel));
    }
  };

  private clock = new THREE.Clock();

  private animate = (): void => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1); // Cap at 0.1s to prevent huge jumps


    // Combine Keyboard + Mobile Keys
    const activeKeys = {
      up: this.kbKeys.up || this.mobileKeys.up,
      down: this.kbKeys.down || this.mobileKeys.down,
      left: this.kbKeys.left || this.mobileKeys.left,
      right: this.kbKeys.right || this.mobileKeys.right,
    };

    // Update avatar movement
    this.avatar.update(dt, activeKeys);

    // Update NPCs
    for (const npc of this.npcs) {
      npc.update(dt);
    }

    // Check proximity to shops
    this.checkShopProximity();

    // Camera follows avatar (third-person behind)
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);
  };

  private checkShopProximity(): void {
    const px = this.avatar.position.x;
    const pz = this.avatar.position.z;
    let closest: string | null = null;
    let closestDist = Infinity;

    for (const shop of this.shops) {
      const [sx, sz] = shop.position;
      
      // Since stalls are rotated by 90 degrees (Math.PI/2), local Z maps to world X.
      // Left stall (sx < 0) ring is at local Z = 5.5 -> world X = sx + 5.5
      // Right stall (sx > 0) ring is at local Z = -5.5 -> world X = sx - 5.5
      const ringX = sx < 0 ? sx + 5.5 : sx - 5.5;
      const ringZ = sz;
      
      const dx = px - ringX;
      const dz = pz - ringZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Require the player to be within 3.5 units of the glowing ring to trigger the enter prompt
      if (dist < 3.5 && dist < closestDist) {
        closestDist = dist;
        closest = shop.id;
      }
    }

    if (closest !== this.nearbyShopId) {
      this.nearbyShopId = closest;
      if (this.onNearShop) this.onNearShop(closest);
    }
  }

  private updateCamera(dt: number): void {
    const target = this.avatar.position;
    const camX = target.x * 0.4;
    
    // Scale distance using zoomLevel
    const camY = target.y + (7.5 * this.zoomLevel);
    const camZ = target.z - (9 * this.zoomLevel);

    this.camera.position.x += (camX - this.camera.position.x) * Math.min(1, dt * 5);
    this.camera.position.y += (camY - this.camera.position.y) * Math.min(1, dt * 5);
    this.camera.position.z += (camZ - this.camera.position.z) * Math.min(1, dt * 5);

    this.camera.lookAt(target.x, target.y + 2, target.z + 6);
  }
}
