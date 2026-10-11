import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MarketScene } from './MarketScene';
import { MOCK_SHOPS } from '../data/mockShops';
import { useCart } from '../context/CartContext';
import { ShoppingCart, LogIn } from 'lucide-react';

import type { Shop } from '../types/market';

interface Props {
  onEnterShop: (shopId: string) => void;
  shops: Shop[];
}

export const MarketLobby: React.FC<Props> = ({ onEnterShop, shops }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MarketScene | null>(null);
  const [nearbyShop, setNearbyShop] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { itemCount } = useCart();

  const nearbyShopData = nearbyShop ? shops.find(s => s.id === nearbyShop) : null;

  useEffect(() => {
    if (!containerRef.current) return;

    // Hook into global Three.js loader manager
    THREE.DefaultLoadingManager.onStart = () => {
      setIsLoading(true);
      setLoadingProgress(0);
    };
    THREE.DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      setLoadingProgress((itemsLoaded / itemsTotal) * 100);
    };
    THREE.DefaultLoadingManager.onLoad = () => {
      // Slight delay to allow GPU to upload geometries
      setTimeout(() => setIsLoading(false), 300);
    };

    const scene = new MarketScene(containerRef.current, shops);
    sceneRef.current = scene;

    scene.onNearShop = (shopId) => setNearbyShop(shopId);
    scene.onEnterShop = (shopId) => onEnterShop(shopId);

    scene.start();

    return () => {
      scene.destroy();
    };
  }, [onEnterShop]);

  // Mobile Controls Handlers
  const handleKey = useCallback((key: 'up'|'down'|'left'|'right', isDown: boolean) => {
    if (sceneRef.current) {
      sceneRef.current.setMobileKeys(prev => ({ ...prev, [key]: isDown }) as any); // using a hack to keep state in Scene directly
      // Actually, better to send the whole state:
    }
  }, []);

  const [mobileKeys, setMobileKeys] = useState({ up: false, down: false, left: false, right: false });

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setMobileKeys(mobileKeys);
    }
  }, [mobileKeys]);

  const updateMobileKey = (key: 'up'|'down'|'left'|'right', val: boolean) => {
    setMobileKeys(prev => ({ ...prev, [key]: val }));
  };

  const handleEnterMobile = () => {
    if (sceneRef.current) {
      sceneRef.current.triggerEnter();
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {isLoading && (
        <div className="preloader-overlay">
          <div className="preloader-content">
            <div className="preloader-title">Generating Market...</div>
            <div className="preloader-bar-bg">
              <div className="preloader-bar-fill" style={{ width: `${loadingProgress}%` }} />
            </div>
            <div className="preloader-text">{Math.round(loadingProgress)}%</div>
          </div>
        </div>
      )}

      {/* Top HUD Bar */}
      <div className="lobby-hud">
        <div className="lobby-title">
          <span className="lobby-icon">🏪</span>
          Virtual Market
        </div>
        <div className="lobby-cart-badge" onClick={() => onEnterShop(MOCK_SHOPS[0].id)}>
          <ShoppingCart size={20} />
          {itemCount > 0 && <span className="badge-count">{itemCount}</span>}
        </div>
      </div>

      {/* Desktop Controls hint */}
      <div className="lobby-controls desktop-only">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / Arrows to Walk</span>
        <span><kbd>Enter</kbd> to Enter Shop</span>
      </div>

      {/* Mobile On-Screen Controls */}
      <div className="mobile-controls">
        <div className="d-pad">
          <button 
            className="d-btn d-up"
            onPointerDown={() => updateMobileKey('up', true)}
            onPointerUp={() => updateMobileKey('up', false)}
            onPointerOut={() => updateMobileKey('up', false)}
          >▲</button>
          <div className="d-middle">
            <button 
              className="d-btn d-left"
              onPointerDown={() => updateMobileKey('left', true)}
              onPointerUp={() => updateMobileKey('left', false)}
              onPointerOut={() => updateMobileKey('left', false)}
            >◀</button>
            <button 
              className="d-btn d-right"
              onPointerDown={() => updateMobileKey('right', true)}
              onPointerUp={() => updateMobileKey('right', false)}
              onPointerOut={() => updateMobileKey('right', false)}
            >▶</button>
          </div>
          <button 
            className="d-btn d-down"
            onPointerDown={() => updateMobileKey('down', true)}
            onPointerUp={() => updateMobileKey('down', false)}
            onPointerOut={() => updateMobileKey('down', false)}
          >▼</button>
        </div>
        
        <div className="action-buttons">
          <button 
            className={`action-btn ${nearbyShopData ? 'active' : ''}`}
            onClick={handleEnterMobile}
            disabled={!nearbyShopData}
          >
            <LogIn size={28} />
          </button>
        </div>
      </div>

      {/* Shop Proximity Prompt */}
      {nearbyShopData && (
        <div className="shop-prompt">
          <div className="shop-prompt-icon">{nearbyShopData.icon}</div>
          <div className="shop-prompt-info">
            <div className="shop-prompt-name">{nearbyShopData.name}</div>
            <div className="shop-prompt-desc">{nearbyShopData.category} • ⭐ {nearbyShopData.rating}</div>
          </div>
          <div className="shop-prompt-action desktop-only">
            Press <kbd>Enter</kbd> to browse
          </div>
        </div>
      )}
    </div>
  );
};
