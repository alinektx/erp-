-- Migração para criação da tabela de produtos
-- Copie e cole este código no SQL Editor do seu projeto Supabase

-- 1. Criar a tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  sku TEXT UNIQUE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 3. Criar política para permitir acesso total (ajuste conforme necessário para produção)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow all access to products'
    ) THEN
        CREATE POLICY "Allow all access to products"
        ON products FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 4. Inserir dados iniciais (opcional)
INSERT INTO products (name, price, cost, stock, min_stock, max_stock, category, sku, image)
VALUES 
('Coca-Cola 350ml', 5.50, 2.50, 50, 10, 100, 'Bebidas', '789123456001', 'https://picsum.photos/seed/coke/200'),
('Água Mineral 500ml', 3.00, 1.00, 100, 20, 200, 'Bebidas', '789123456002', 'https://picsum.photos/seed/water/200'),
('Chocolate Barra 90g', 7.90, 4.00, 30, 5, 50, 'Doces', '789123456003', 'https://picsum.photos/seed/chocolate/200')
ON CONFLICT (sku) DO NOTHING;

-- 5. Criar tabelas de vendas
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_sale NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Habilitar RLS para vendas
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'Allow all access to sales') THEN
        CREATE POLICY "Allow all access to sales" ON sales FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'Allow all access to sale_items') THEN
        CREATE POLICY "Allow all access to sale_items" ON sale_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
