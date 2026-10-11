import React, { useState } from 'react';
import type { Shop } from '../types/market';
import { useCart } from '../context/CartContext';
import { ArrowLeft, ShoppingCart, Star, Plus, Minus, X, Check, Package } from 'lucide-react';

interface Props {
  shop: Shop;
  onBack: () => void;
}

export const ShopPage: React.FC<Props> = ({ shop, onBack }) => {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAdd = (product: typeof shop.products[0]) => {
    addToCart(product, shop.id);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  const formatPrice = (p: number) => '₦' + p.toLocaleString();

  return (
    <div className="shop-page">
      {/* Header */}
      <header className="shop-header" style={{ borderBottomColor: shop.color }}>
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Market
        </button>
        <div className="shop-header-info">
          <span className="shop-header-icon">{shop.icon}</span>
          <div>
            <h1 className="shop-header-name">{shop.name}</h1>
            <p className="shop-header-meta">
              by {shop.owner} • <Star size={14} fill="#F4A261" color="#F4A261" /> {shop.rating} • {shop.category}
            </p>
          </div>
        </div>
        <button className="cart-btn" onClick={() => setCartOpen(true)}>
          <ShoppingCart size={20} />
          {itemCount > 0 && <span className="cart-btn-count">{itemCount}</span>}
        </button>
      </header>

      {/* Description */}
      <div className="shop-desc-bar" style={{ backgroundColor: shop.color + '15', borderLeftColor: shop.color }}>
        <p>{shop.description}</p>
      </div>

      {/* Product Grid */}
      <div className="product-grid">
        {shop.products.map(product => (
          <div key={product.id} className={`product-card ${!product.inStock ? 'out-of-stock' : ''}`}>
            <div className="product-img-wrap">
              <img src={product.image} alt={product.name} className="product-img" loading="lazy" />
              {!product.inStock && <div className="oos-badge">Out of Stock</div>}
            </div>
            <div className="product-info">
              <span className="product-category">{product.category}</span>
              <h3 className="product-name">{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <div className="product-footer">
                <span className="product-price">{formatPrice(product.price)}</span>
                {product.inStock ? (
                  <button
                    className={`add-btn ${addedId === product.id ? 'added' : ''}`}
                    onClick={() => handleAdd(product)}
                    style={{ backgroundColor: addedId === product.id ? '#27AE60' : shop.color }}
                  >
                    {addedId === product.id ? <><Check size={16} /> Added</> : <><Plus size={16} /> Add</>}
                  </button>
                ) : (
                  <button className="add-btn disabled" disabled>Unavailable</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h2><ShoppingCart size={22} /> Your Cart</h2>
              <button className="close-btn" onClick={() => setCartOpen(false)}><X size={20} /></button>
            </div>

            {cart.items.length === 0 ? (
              <div className="cart-empty">
                <Package size={48} />
                <p>Your cart is empty</p>
                <span>Walk around and add some items!</span>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map(item => (
                    <div key={item.product.id} className="cart-item">
                      <img src={item.product.image} alt={item.product.name} className="cart-item-img" />
                      <div className="cart-item-info">
                        <h4>{item.product.name}</h4>
                        <span className="cart-item-price">{formatPrice(item.product.price)}</span>
                      </div>
                      <div className="cart-item-qty">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus size={14} /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus size={14} /></button>
                      </div>
                      <button className="cart-item-remove" onClick={() => removeFromCart(item.product.id)}><X size={16} /></button>
                    </div>
                  ))}
                </div>
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>Total</span>
                    <strong>{formatPrice(cart.total)}</strong>
                  </div>
                  <button className="checkout-btn">Proceed to Checkout</button>
                  <button className="clear-btn" onClick={clearCart}>Clear Cart</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
