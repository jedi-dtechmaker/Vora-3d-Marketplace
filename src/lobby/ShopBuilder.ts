import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Shop } from '../types/market';

// Dusty earth / sandy ground colors matching authentic Lagos street market
const GROUND_COLOR = 0xC19A6B; // Dusty sand
const WALKWAY_COLOR = 0xA67B5B; // Slightly darker trampled earth
const STALL_POST = 0x5D4037;

export class ShopBuilder {
  /**
   * Builds the full market ground floor: dusty earth walkway + sand borders
   */
  static buildGround(length: number): THREE.Group {
    const group = new THREE.Group();

    // Main walkway (dusty earth)
    const walkGeo = new THREE.PlaneGeometry(18, length);
    const walkMat = new THREE.MeshStandardMaterial({ color: GROUND_COLOR, roughness: 1.0 });
    const walkMesh = new THREE.Mesh(walkGeo, walkMat);
    walkMesh.rotation.x = -Math.PI / 2;
    walkMesh.position.set(0, 0, length / 2);
    walkMesh.receiveShadow = true;
    group.add(walkMesh);

    // Center path (darker trampled earth)
    const pathGeo = new THREE.PlaneGeometry(6, length);
    const pathMat = new THREE.MeshStandardMaterial({ color: WALKWAY_COLOR, roughness: 1.0 });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(0, 0.01, length / 2);
    pathMesh.receiveShadow = true;
    group.add(pathMesh);

    return group;
  }

  /**
   * Builds a wheelbarrow (omologo) filled with goods
   */
  static buildWheelbarrow(color: number, goodsColor: number): THREE.Group {
    const group = new THREE.Group();
    
    const loader = new GLTFLoader();
    const url = '/my-assets/wheelbarrow.glb';
    
    loader.load(url, (gltf) => {
      const barrow = gltf.scene;
      
      // Auto-scale to roughly 2.5 units long/wide
      const box = new THREE.Box3().setFromObject(barrow);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.z);
      const scale = 2.5 / (maxDim || 1);
      barrow.scale.setScalar(scale);

      // Floor alignment
      const newBox = new THREE.Box3().setFromObject(barrow);
      barrow.position.y -= newBox.min.y;

      // Center it
      const finalBox = new THREE.Box3().setFromObject(barrow);
      const center = finalBox.getCenter(new THREE.Vector3());
      barrow.position.x -= center.x;
      barrow.position.z -= center.z;

      barrow.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      group.add(barrow);
    });

    return group;
  }

  /**
   * Builds a large market umbrella
   */
  static buildUmbrella(color: number): THREE.Group {
    const group = new THREE.Group();

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, metalness: 0.5 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.0;
    pole.castShadow = true;
    group.add(pole);

    // Canopy
    const canopyGeo = new THREE.ConeGeometry(2.5, 1.0, 8);
    const canopyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 4.0;
    canopy.castShadow = true;
    group.add(canopy);

    return group;
  }

  /**
   * Builds a 3D shop stall with awning, counter, shelves, and sign
   */
  static buildShopStall(shop: Shop): THREE.Group {
    const group = new THREE.Group();
    const [sx, sz] = shop.position;
    const isLeft = sx < 0;
    group.position.set(sx, 0, sz);

    // 8. Entrance Interaction Zone marker (glowing ring on floor)
    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: shop.accentColor, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.05, isLeft ? 5.5 : -5.5);
    ring.userData = { shopId: shop.id, isEntrance: true };
    group.add(ring);

    // Rotate the entire stall to face the center street
    group.rotation.y = Math.PI / 2;

    // Use GLB for clothing and footwear stores
    if (shop.category === 'Fashion' || shop.category === 'Footwear') {
      const loader = new GLTFLoader();
      const url = '/my-assets/clothe-store.glb';
      
      loader.load(url, (gltf) => {
        const store = gltf.scene;
        
        // Auto-scale to roughly 10 units wide
        const box = new THREE.Box3().setFromObject(store);
        const size = box.getSize(new THREE.Vector3());
        const maxHoriz = Math.max(size.x, size.z);
        const scale = 10.0 / (maxHoriz || 1);
        store.scale.setScalar(scale);

        // Align origin to floor
        const newBox = new THREE.Box3().setFromObject(store);
        store.position.y -= newBox.min.y;
        
        // Center it horizontally
        const finalBox = new THREE.Box3().setFromObject(store);
        const center = finalBox.getCenter(new THREE.Vector3());
        store.position.x -= center.x;
        store.position.z -= center.z;
        
        // Nudge back slightly from the street so it doesn't overlap the ring
        store.position.z += isLeft ? -1.0 : 1.0;
        
        // Spin 180 degrees if on the right side so it faces the street
        if (!isLeft) {
          store.rotation.y = Math.PI;
        }

        store.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        group.add(store);
      }, undefined, (error) => {
        console.error('Error loading clothe-store.glb', error);
      });
      
      return group;
    }
    
    // Use GLB for fruit/food stores
    if (shop.category === 'Fresh Produce' || shop.category === 'Food & Groceries') {
      const loader = new GLTFLoader();
      const url = '/my-assets/fruits.glb';
      
      loader.load(url, (gltf) => {
        const store = gltf.scene;
        
        // Auto-scale to roughly 10 units wide
        const box = new THREE.Box3().setFromObject(store);
        const size = box.getSize(new THREE.Vector3());
        const maxHoriz = Math.max(size.x, size.z);
        const scale = 10.0 / (maxHoriz || 1);
        store.scale.setScalar(scale);

        // Align origin to floor
        const newBox = new THREE.Box3().setFromObject(store);
        store.position.y -= newBox.min.y;
        
        // Center it horizontally
        const finalBox = new THREE.Box3().setFromObject(store);
        const center = finalBox.getCenter(new THREE.Vector3());
        store.position.x -= center.x;
        store.position.z -= center.z;
        
        // Nudge back slightly from the street so it doesn't overlap the ring
        store.position.z += isLeft ? -1.0 : 1.0;
        
        // Spin 180 degrees if on the right side so it faces the street
        if (!isLeft) {
          store.rotation.y = Math.PI;
        }

        store.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        group.add(store);
      }, undefined, (error) => {
        console.error('Error loading fruits.glb', error);
      });
      
      return group;
    }

    // --- Default Primitive Build for other categories ---

    // 1. Back Wall / Container structure
    const wallGeo = new THREE.BoxGeometry(8, 5, 2.0);
    const wallMat = new THREE.MeshStandardMaterial({ color: '#E8E4D9', roughness: 0.9 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 2.5, isLeft ? -1.5 : 1.5);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // 2. Floor mat/rug
    const floorGeo = new THREE.PlaneGeometry(8, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: shop.accentColor, roughness: 1.0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.02, isLeft ? 1.0 : -1.0);
    floor.receiveShadow = true;
    group.add(floor);

    // 3. Colorful Awning (extended)
    const awningGeo = new THREE.BoxGeometry(9, 0.15, 7);
    const awningMat = new THREE.MeshStandardMaterial({ color: shop.color, roughness: 0.8 });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 5.2, isLeft ? 1.0 : -1.0);
    awning.rotation.z = isLeft ? -0.05 : 0.05;
    awning.rotation.x = isLeft ? 0.15 : -0.15;
    awning.castShadow = true;
    group.add(awning);

    // 4. Counter / Display Table (wooden planks)
    const counterGeo = new THREE.BoxGeometry(7, 0.8, 1.5);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, 0.4, isLeft ? 3.0 : -3.0);
    counter.castShadow = true;
    group.add(counter);

    // 5. Clutter/Goods on counter based on category
    const displayGroup = new THREE.Group();
    displayGroup.position.set(0, 0.8, isLeft ? 3.0 : -3.0);
    
    if (shop.category === 'Fashion') {
      displayGroup.add(this.buildFashionDisplay());
    } else if (shop.category === 'Electronics') {
      displayGroup.add(this.buildTechDisplay());
    } else if (shop.category === 'Food & Groceries' || shop.category === 'Fresh Produce') {
      displayGroup.add(this.buildFoodDisplay());
    } else {
      displayGroup.add(this.buildGenericDisplay());
    }
    group.add(displayGroup);

    // Stacked goods (sacks/buckets) on the ground next to stall
    for (let i = 0; i < 3; i++) {
      const sackGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 8);
      const sackMat = new THREE.MeshStandardMaterial({ color: 0xDDCCAA, roughness: 1.0 });
      const sack = new THREE.Mesh(sackGeo, sackMat);
      sack.position.set(isLeft ? 4.0 : -4.0, 0.4, isLeft ? 2.5 + i*0.5 : -2.5 - i*0.5);
      sack.castShadow = true;
      group.add(sack);
    }

    // 6. Wooden support posts
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 5.5);
    const postMat = new THREE.MeshStandardMaterial({ color: STALL_POST });
    const postPositions = [[-4, 0, isLeft ? 4.2 : -4.2], [4, 0, isLeft ? 4.2 : -4.2]];
    
    for (const [px, , pz] of postPositions) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 2.75, pz);
      post.castShadow = true;
      group.add(post);
    }

    // 7. Shop Name Sign (3D text panel)
    const signGeo = new THREE.BoxGeometry(6, 1.2, 0.15);
    const signMat = new THREE.MeshStandardMaterial({ color: shop.color });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 5.8, isLeft ? 4.2 : -4.2);
    sign.castShadow = true;
    group.add(sign);

    // Sign background plate (white)
    const platGeo = new THREE.BoxGeometry(5.6, 0.9, 0.2);
    const platMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
    const plate = new THREE.Mesh(platGeo, platMat);
    plate.position.set(0, 5.8, isLeft ? 4.28 : -4.28);
    group.add(plate);

    // We moved the ring and group.rotation to the top of the function to apply to GLB as well
    return group;
  }

  /**
   * Builds decorations: wheelbarrows, umbrellas, clutter
   */
  static buildDecorations(z: number): THREE.Group {
    const group = new THREE.Group();

    // Wheelbarrow on one side
    const barrow = this.buildWheelbarrow(0x34495E, 0xD35400); // Dark grey metal, orange goods (yams/produce)
    barrow.position.set(-6, 0, z);
    barrow.rotation.y = Math.PI / 4;
    group.add(barrow);

    // Umbrella on the other side with some baskets
    const umbrella = this.buildUmbrella(0xE74C3C); // Red canopy
    umbrella.position.set(6, 0, z + 2);
    group.add(umbrella);

    // Baskets under umbrella
    for (let i = 0; i < 3; i++) {
      const basketGeo = new THREE.CylinderGeometry(0.5, 0.3, 0.6, 12);
      const basketMat = new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 0.9 });
      const basket = new THREE.Mesh(basketGeo, basketMat);
      basket.position.set(5.5 + i*0.8, 0.3, z + 1.5 + i*0.5);
      basket.castShadow = true;
      group.add(basket);
    }

    return group;
  }

  // --- Category Specific Product Builders ---

  private static buildFashionDisplay(): THREE.Group {
    const group = new THREE.Group();
    // 3D Mannequins with Ankara colored dresses
    for (let i = 0; i < 3; i++) {
      const torsoGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.8, 8);
      const skirtGeo = new THREE.ConeGeometry(0.5, 0.7, 8);
      const color = [0xE74C3C, 0x8E44AD, 0xF1C40F][i];
      const dressMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      
      const torso = new THREE.Mesh(torsoGeo, dressMat);
      torso.position.set(-2 + i * 2, 0.4, 0);
      torso.castShadow = true;
      group.add(torso);

      const skirt = new THREE.Mesh(skirtGeo, dressMat);
      skirt.position.set(-2 + i * 2, -0.35, 0);
      skirt.castShadow = true;
      group.add(skirt);
    }
    // Folded shirts pile
    for (let i = 0; i < 5; i++) {
      const shirtGeo = new THREE.BoxGeometry(0.5, 0.1, 0.4);
      const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3498DB });
      const shirt = new THREE.Mesh(shirtGeo, shirtMat);
      shirt.position.set(2.5, i * 0.1, 0.2);
      shirt.rotation.y = (Math.random() - 0.5) * 0.2;
      shirt.castShadow = true;
      group.add(shirt);
    }
    return group;
  }

  private static buildTechDisplay(): THREE.Group {
    const group = new THREE.Group();
    // Open Laptops
    for (let i = 0; i < 2; i++) {
      const baseGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
      const screenGeo = new THREE.BoxGeometry(0.8, 0.6, 0.05);
      const laptopMat = new THREE.MeshStandardMaterial({ color: 0x7F8C8D, metalness: 0.8 });
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x2C3E50 }); // dark screen
      
      const laptop = new THREE.Group();
      const base = new THREE.Mesh(baseGeo, laptopMat);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0.3, -0.3);
      screen.rotation.x = -0.2; // tilted back
      laptop.add(base);
      laptop.add(screen);
      
      laptop.position.set(-2 + i * 2, 0.025, 0);
      laptop.rotation.y = i === 0 ? 0.3 : -0.3;
      group.add(laptop);
    }
    // Phones on display stands
    for (let i = 0; i < 4; i++) {
      const phoneGeo = new THREE.BoxGeometry(0.2, 0.4, 0.02);
      const phoneMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.9 });
      const phone = new THREE.Mesh(phoneGeo, phoneMat);
      phone.position.set(1.5 + i * 0.4, 0.2, 0.4);
      phone.rotation.x = -0.3; // leaning back
      phone.castShadow = true;
      group.add(phone);
    }
    return group;
  }

  private static buildFoodDisplay(): THREE.Group {
    const group = new THREE.Group();
    // Baskets of tomatoes
    for (let i = 0; i < 2; i++) {
      const basketGeo = new THREE.CylinderGeometry(0.5, 0.3, 0.4, 12);
      const basketMat = new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 1.0 });
      const basket = new THREE.Mesh(basketGeo, basketMat);
      basket.position.set(-2 + i * 1.5, 0.2, 0);
      basket.castShadow = true;
      group.add(basket);

      // Tomatoes inside
      for (let j = 0; j < 6; j++) {
        const tomatoGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xE74C3C, roughness: 0.3 });
        const tomato = new THREE.Mesh(tomatoGeo, tomatoMat);
        tomato.position.set(
          -2 + i * 1.5 + (Math.random()-0.5)*0.6, 
          0.4 + Math.random()*0.15, 
          (Math.random()-0.5)*0.6
        );
        group.add(tomato);
      }
    }
    // Palm Oil Bottles
    for (let i = 0; i < 3; i++) {
      const bottleGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
      const neckGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8);
      const oilMat = new THREE.MeshStandardMaterial({ color: 0xD35400, transparent: true, opacity: 0.8 });
      
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(bottleGeo, oilMat);
      const neck = new THREE.Mesh(neckGeo, oilMat);
      neck.position.y = 0.4;
      bottle.add(body);
      bottle.add(neck);
      
      bottle.position.set(1.5 + i * 0.4, 0.3, -0.2);
      bottle.castShadow = true;
      group.add(bottle);
    }
    return group;
  }

  private static buildGenericDisplay(): THREE.Group {
    const group = new THREE.Group();
    // Standard colorful boxes for generic goods
    for (let i = 0; i < 5; i++) {
      const boxGeo = new THREE.BoxGeometry(0.6, 0.4 + Math.random()*0.4, 0.6);
      const boxColor = [0x95A5A6, 0x34495E, 0x7F8C8D, 0xBDC3C7][i % 4];
      const boxMat = new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.7 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(-2 + i * 1.0, 0.2, 0);
      box.rotation.y = (Math.random() - 0.5);
      box.castShadow = true;
      group.add(box);
    }
    return group;
  }
}
