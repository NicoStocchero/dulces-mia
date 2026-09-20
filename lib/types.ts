export type Product = {
  id: string
  name: string
  cost: number
  price: number
  emoji: string
  category?: string
  image_url?: string
  description?: string
  recipe_id?: string
  active?: boolean
  is_auto_cost?: boolean
  manual_cost?: number
  packaging_cost?: number
  labor_hours?: number
  labor_rate?: number
  created_at?: string
}

export type Sale = {
  id: string
  product_id?: string
  product_name: string
  customer_id?: string
  customer_name?: string
  quantity: number
  revenue: number
  cost: number
  profit: number
  paid?: boolean
  paid_at?: string
  date: string
}

export type Expense = {
  id: string
  description: string
  amount: number
  type: 'Fijo' | 'Variable' | 'Insumo' | 'General'
  expense_type?: string
  related_product?: string
  ingredient_id?: string
  ingredient_name?: string
  brand?: string
  notes?: string
  package_size?: number
  unit?: string
  quantity_bought?: number
  unit_price?: number
  date: string
}

export type Order = {
  id: string
  customer_id?: string
  customer_name: string
  product_id?: string
  product_name: string
  quantity: number
  total_price: number
  cost?: number
  deposit?: number
  pending_balance?: number
  delivery_date?: string
  status: 'Pendiente' | 'En Local' | 'Entregado' | 'Cancelado'
  mold_size?: string
  notes?: string
  created_at?: string
}

export type InsumoHistoryItem = {
  id: string
  date: string
  package_cost: number
  package_size: number
  unit: string
  supplier?: string
  brand?: string
  notes?: string
}

export type IngredientMaster = {
  id: string
  name: string
  category?: string
  unit: string
  package_size: number
  package_cost: number
  brand?: string
  stock_qty?: number
  min_stock?: number
  history?: InsumoHistoryItem[]
  created_at?: string
}

export type RecipeIngredient = {
  name: string
  quantity: string
  ingredient_id?: string
  amount_num?: number
  unit?: string
  cost_override?: number
}

export type RecipeCostSnapshot = {
  id: string
  date: string
  total_cost: number
  unit_cost: number
  suggested_price: number
  margin_percent?: number
  margin_amount?: number
  profit_margin?: number
  ingredients_breakdown?: Array<{
    name: string
    quantity: string
    unit_cost: number
    total_cost: number
  }>
  notes?: string
  note?: string
}

export type Recipe = {
  id: string
  title: string
  category?: string
  yield?: string
  base_servings?: number
  ingredients: RecipeIngredient[]
  steps?: string
  notes?: string
  packaging_cost?: number
  labor_hours?: number
  labor_rate?: number
  cost_history?: RecipeCostSnapshot[]
  created_at?: string
}


export type Customer = {
  id: string
  name: string
  phone?: string
  address?: string
  birthday?: string
  favorite_dessert?: string
  dietary_tags?: string[]
  address_notes?: string
  notes?: string
  created_at?: string
}

export type SolNote = {
  id: string
  title: string
  content: string
  category: 'General' | 'Ideas' | 'Encargos' | 'Compras' | 'Recordatorio'
  completed?: boolean
  created_at: string
}

export type Setting = {
  key: string
  value: string
  updated_at?: string
}

export type ActiveTab = 'pedidos' | 'ventas' | 'gastos' | 'insumos' | 'clientes' | 'catalogo' | 'recetas' | 'resumen' | 'notas'

