-- Script de Migración Opcional para Supabase
-- Ejecutar en el Editor SQL de tu proyecto Supabase (https://supabase.com/dashboard)
-- Este script agrega las columnas adicionales si deseas almacenarlas directamente en la base de datos de Supabase.

-- 1. Agregar columnas a la tabla de productos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_auto_cost BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS manual_cost NUMERIC DEFAULT 0;

-- 2. Agregar columna a la tabla de ventas
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 3. Agregar columnas a la tabla de insumos maestros
ALTER TABLE ingredients_master 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Varios',
ADD COLUMN IF NOT EXISTS stock_qty NUMERIC DEFAULT 1000,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 200,
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;

-- 4. Crear tabla de clientes CRM y habilitar RLS con política pública
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  birthday DATE,
  notes TEXT,
  favorite_dessert TEXT,
  dietary_tags TEXT[],
  address_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Allow public all on customers'
  ) THEN
    CREATE POLICY "Allow public all on customers" ON public.customers FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Vincular clientes a ventas y órdenes
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_id UUID;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_id UUID;

-- 6. Desglose estructurado para gastos de insumos
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS ingredient_id UUID,
ADD COLUMN IF NOT EXISTS package_size NUMERIC,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS quantity_bought NUMERIC,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC;

-- 7. Historial inmutable de versiones de costos de recetas
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS cost_history JSONB DEFAULT '[]'::jsonb;

-- 8. Permitir tipos de gastos 'Variable' y 'Fijo' además de 'Insumo' y 'General'
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_type_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_type_check CHECK (type IN ('Insumo', 'Variable', 'Fijo', 'General'));


