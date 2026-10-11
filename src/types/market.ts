export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  inStock: boolean;
}

export interface Shop {
  id: string;
  name: string;
  owner: string;
  description: string;
  category: string;
  color: string;       // Primary brand color for awning & signage
  accentColor: string;
  icon: string;        // Emoji icon for the shop
  rating: number;
  products: Product[];
  position: [number, number]; // X, Z position in the 3D market
}

export interface CartItem {
  product: Product;
  shopId: string;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
}
