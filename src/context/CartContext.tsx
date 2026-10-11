import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CartItem, CartState, Product } from '../types/market';

interface CartContextType {
  cart: CartState;
  addToCart: (product: Product, shopId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>({ items: [], total: 0 });

  const recalcTotal = (items: CartItem[]): number =>
    items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = useCallback((product: Product, shopId: string) => {
    setCart(prev => {
      const existing = prev.items.find(i => i.product.id === product.id);
      let newItems: CartItem[];
      if (existing) {
        newItems = prev.items.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        newItems = [...prev.items, { product, shopId, quantity: 1 }];
      }
      return { items: newItems, total: recalcTotal(newItems) };
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(i => i.product.id !== productId);
      return { items: newItems, total: recalcTotal(newItems) };
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => {
      const newItems = prev.items.map(i =>
        i.product.id === productId ? { ...i, quantity } : i
      );
      return { items: newItems, total: recalcTotal(newItems) };
    });
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0 });
  }, []);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
