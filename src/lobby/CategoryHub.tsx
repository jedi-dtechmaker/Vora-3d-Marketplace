import React from 'react';
import { Store, Smartphone, ShoppingBasket, Shirt, ArrowRight } from 'lucide-react';

export type MarketCategory = 'Fashion & Footwear' | 'Electronics & Gadgets' | 'Food & Groceries' | 'Home & Lifestyle';

interface Props {
  onSelectCategory: (category: MarketCategory) => void;
}

export const CategoryHub: React.FC<Props> = ({ onSelectCategory }) => {
  const markets = [
    {
      id: 'ariaria',
      title: 'Ariaria International',
      category: 'Fashion & Footwear' as MarketCategory,
      desc: 'Proudly Aba made shoes, fabrics, bags, and beauty products.',
      icon: <Shirt size={32} color="#9B59B6" />,
      bg: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
    },
    {
      id: 'cemetery',
      title: 'Cemetery Market',
      category: 'Food & Groceries' as MarketCategory,
      desc: 'Fresh produce, spices, palm oil, and raw food stuffs.',
      icon: <ShoppingBasket size={32} color="#E67E22" />,
      bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
    },
    {
      id: 'new-market',
      title: 'New Market (Electronics)',
      category: 'Electronics & Gadgets' as MarketCategory,
      desc: 'Smartphones, laptops, accessories and gadgets.',
      icon: <Smartphone size={32} color="#2980B9" />,
      bg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
    },
    {
      id: 'shopping-centre',
      title: 'Aba Shopping Centre',
      category: 'Home & Lifestyle' as MarketCategory,
      desc: 'Kitchen utensils, books, stationeries, and home goods.',
      icon: <Store size={32} color="#27AE60" />,
      bg: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
    }
  ];

  return (
    <div className="category-hub">
      <div className="hub-header">
        <h1>Aba Virtual Market</h1>
        <p>Select a market to explore our 3D streets and start shopping.</p>
      </div>

      <div className="hub-grid">
        {markets.map(market => (
          <div 
            key={market.id} 
            className="market-card"
            style={{ background: market.bg }}
            onClick={() => onSelectCategory(market.category)}
          >
            <div className="market-icon-wrap">{market.icon}</div>
            <h2>{market.title}</h2>
            <p>{market.desc}</p>
            <div className="enter-arrow"><ArrowRight size={20} /> Enter Market</div>
          </div>
        ))}
      </div>
    </div>
  );
};
