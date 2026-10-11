import React, { useState, useCallback, useMemo } from 'react';
import { CartProvider } from './context/CartContext';
import { CategoryHub } from './lobby/CategoryHub';
import type { MarketCategory } from './lobby/CategoryHub';
import { MarketLobby } from './lobby/MarketLobby';
import { ShopPage } from './shop/ShopPage';
import { MOCK_SHOPS } from './data/mockShops';
import type { Shop } from './types/market';
import { CharacterPreview } from './CharacterPreview';

type View = 
  | { type: 'hub' } 
  | { type: 'lobby'; category: MarketCategory } 
  | { type: 'shop'; shopId: string; categoryContext: MarketCategory }
  | { type: 'preview' };

const AppContent: React.FC = () => {
  const [view, setView] = useState<View>({ type: 'hub' });

  // Map high-level MarketCategory to specific shop categories in mock data
  const categoryMap: Record<MarketCategory, string[]> = {
    'Fashion & Footwear': ['Fashion', 'Footwear', 'Beauty'],
    'Electronics & Gadgets': ['Electronics'],
    'Food & Groceries': ['Food & Groceries', 'Fresh Produce'],
    'Home & Lifestyle': ['Books & Stationery', 'Home & Kitchen']
  };

  const handleSelectCategory = useCallback((category: MarketCategory) => {
    setView({ type: 'lobby', category });
  }, []);

  const handleEnterShop = useCallback((shopId: string) => {
    if (view.type === 'lobby') {
      setView({ type: 'shop', shopId, categoryContext: view.category });
    }
  }, [view]);

  const handleBackToLobby = useCallback(() => {
    if (view.type === 'shop') {
      setView({ type: 'lobby', category: view.categoryContext });
    }
  }, [view]);

  const handleBackToHub = useCallback(() => {
    setView({ type: 'hub' });
  }, []);

  if (view.type === 'preview') {
    return <CharacterPreview onClose={handleBackToHub} />;
  }

  if (view.type === 'hub') {
    return (
      <>
        <CategoryHub onSelectCategory={handleSelectCategory} />
        <button 
          onClick={() => setView({ type: 'preview' })}
          style={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            zIndex: 100, 
            padding: '12px 24px', 
            background: '#2C3E50', 
            color: 'white', 
            borderRadius: 8, 
            border: 'none', 
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}
        >
          View Character Model
        </button>
      </>
    );
  }

  if (view.type === 'shop') {
    const shop = MOCK_SHOPS.find(s => s.id === view.shopId);
    if (!shop) return null;
    return <ShopPage shop={shop} onBack={handleBackToLobby} />;
  }

  // Lobby View - Filter shops based on category
  const allowedCategories = categoryMap[view.category];
  const filteredShops = MOCK_SHOPS.filter(shop => allowedCategories.includes(shop.category));
  
  // Re-position filtered shops along the street so they don't have huge gaps
  const remappedShops = filteredShops.map((shop, index) => {
    const isLeft = index % 2 === 0;
    // Base positions: 5, 30, 55, 80, 105...
    // Since 2 shops per row, the Z offset increases every 2 shops
    const zIndex = Math.floor(index / 2);
    const sz = 5 + (zIndex * 25);
    const sx = isLeft ? -12 : 12;
    return { ...shop, position: [sx, sz] as [number, number] };
  });

  return (
    <>
      <button className="hub-back-btn" onClick={handleBackToHub}>
        ← Back to Categories
      </button>
      <MarketLobby 
        key={view.category} // Remount 3D scene when category changes
        onEnterShop={handleEnterShop} 
        shops={remappedShops} 
      />
    </>
  );
};

export const App: React.FC = () => (
  <CartProvider>
    <AppContent />
  </CartProvider>
);

export default App;
