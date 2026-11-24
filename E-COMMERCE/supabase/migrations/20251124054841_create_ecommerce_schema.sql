/*
  # E-commerce Database Schema

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text) - Product name
      - `description` (text) - Product description
      - `price` (decimal) - Product price in dollars
      - `image_url` (text) - Product image URL
      - `stock` (integer) - Available stock quantity
      - `created_at` (timestamp)
    
    - `cart_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `product_id` (uuid) - References products
      - `quantity` (integer) - Quantity in cart
      - `created_at` (timestamp)
    
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `total_amount` (decimal) - Total order amount
      - `status` (text) - Order status (pending, completed, cancelled)
      - `stripe_payment_id` (text) - Stripe payment ID
      - `created_at` (timestamp)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid) - References orders
      - `product_id` (uuid) - References products
      - `quantity` (integer) - Quantity ordered
      - `price` (decimal) - Price at time of order
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Products: Public read access, no write access for users
    - Cart items: Users can only access their own cart
    - Orders: Users can only access their own orders
    - Order items: Users can only view their own order items
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL,
  image_url text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO public
  USING (true);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Insert sample products
INSERT INTO products (name, description, price, image_url, stock) VALUES
  ('Wireless Headphones', 'Premium noise-cancelling wireless headphones with 30-hour battery life', 199.99, 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', 50),
  ('Smart Watch', 'Fitness tracker with heart rate monitor and GPS', 299.99, 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg', 30),
  ('Laptop Stand', 'Adjustable aluminum laptop stand for better ergonomics', 49.99, 'https://images.pexels.com/photos/7974/pexels-photo.jpg', 100),
  ('Mechanical Keyboard', 'RGB backlit mechanical keyboard with blue switches', 149.99, 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg', 45),
  ('Webcam HD', '1080p HD webcam with auto-focus and noise reduction', 79.99, 'https://images.pexels.com/photos/5082560/pexels-photo-5082560.jpeg', 60),
  ('USB-C Hub', '7-in-1 USB-C hub with HDMI, USB 3.0, and card readers', 39.99, 'https://images.pexels.com/photos/163117/circuit-circuit-board-resistor-computer-163117.jpeg', 80)
ON CONFLICT DO NOTHING;