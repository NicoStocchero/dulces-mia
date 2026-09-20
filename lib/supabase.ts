import { createClient } from '@supabase/supabase-js'
import { Product, Sale, Expense, Order, Recipe, IngredientMaster, InsumoHistoryItem, Customer, RecipeCostSnapshot } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = () => !!supabase

// Helper to check if a string is a valid UUID
function isValidUUID(str?: string): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// Storage fallback keys
const KEYS = {
  PRODUCTS: 'dulcesmia_products',
  SALES: 'dulcesmia_sales',
  EXPENSES: 'dulcesmia_expenses',
  ORDERS: 'dulcesmia_orders',
  RECIPES: 'dulcesmia_recipes',
  INGREDIENTS: 'dulcesmia_ingredients',
  GOAL: 'dulcesmia_goal',
  NOTES: 'dulcesmia_notes'
}

function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

function setLocal(key: string, val: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

// ── PRODUCTS API ──
const META_KEY = 'sol_product_meta_v1'

function getProductMetaMap(): Record<string, { image_url?: string; description?: string }> {
  return getLocal<Record<string, { image_url?: string; description?: string }>>(META_KEY, {})
}

function setProductMeta(id: string, meta: { image_url?: string; description?: string }) {
  const current = getProductMetaMap()
  current[id] = {
    ...current[id],
    ...meta
  }
  setLocal(META_KEY, current)
}

export async function fetchProducts(): Promise<Product[]> {
  const metaMap = getProductMetaMap()
  let list: Product[] = []

  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) {
      list = data.map(p => {
        const fallbackCost = (typeof p.manual_cost === 'number' && !isNaN(p.manual_cost))
          ? p.manual_cost
          : (typeof p.cost === 'number' && !isNaN(p.cost) ? p.cost : 0)
        return {
          ...p,
          cost: typeof p.cost === 'number' && !isNaN(p.cost) ? p.cost : fallbackCost,
          is_auto_cost: p.is_auto_cost ?? false,
          manual_cost: fallbackCost
        }
      }) as Product[]
    } else if (error) {
      console.error('Supabase fetchProducts error:', error)
    }
  }

  if (list.length === 0) {
    list = getLocal<Product[]>(KEYS.PRODUCTS, [
      { id: '1', name: 'Postre Oreo en Pote', cost: 1800, price: 4500, emoji: '🍨', category: 'Postres en Pote', recipe_id: '2', active: true },
      { id: '2', name: 'Chocotorta en Pote', cost: 1800, price: 4500, emoji: '🍰', category: 'Postres en Pote', active: true },
      { id: '3', name: 'Tarta Cabsha (con bordes de DDL)', cost: 4500, price: 12500, emoji: '🍫', category: 'Tartas', recipe_id: '1', active: true },
      { id: '4', name: 'Tarta Marquise de Chocolate', cost: 4800, price: 13000, emoji: '🍫', category: 'Tartas', active: true },
      { id: '5', name: 'Lemon Pie Artesanal', cost: 3800, price: 9800, emoji: '🍋', category: 'Tartas', active: true },
      { id: '6', name: 'Box Cupcakes (x6)', cost: 3000, price: 7800, emoji: '🧁', category: 'Boxes & Varios', active: true },
      { id: '7', name: 'Alfajores de Maicena (x6)', cost: 2200, price: 5500, emoji: '🍪', category: 'Boxes & Varios', active: true }
    ])
  }

  // Merge image_url and description from metaMap or default fallbacks
  return list.map(p => {
    const meta = metaMap[p.id] || {}
    let img = p.image_url || meta.image_url
    if (!img || img.trim() === '') {
      const nameLower = p.name.toLowerCase()
      if (nameLower.includes('pote') || nameLower.includes('oreo') || nameLower.includes('chocotorta')) {
        img = '/images/desserts/sol_pote_oreo.jpg'
      } else if (nameLower.includes('cabsha') || nameLower.includes('tarta') || nameLower.includes('coco')) {
        img = '/images/desserts/sol_tarta_cabsha.png'
      }
    }

    return {
      ...p,
      image_url: img,
      description: p.description || meta.description
    }
  })
}

export async function saveProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<Product | null> {
  const fullPayload = {
    name: product.name,
    cost: product.cost,
    price: product.price,
    emoji: product.emoji,
    category: product.category || 'General',
    image_url: product.image_url || '',
    description: product.description || '',
    recipe_id: (product.recipe_id && isValidUUID(product.recipe_id)) ? product.recipe_id : null,
    active: product.active ?? true,
    is_auto_cost: product.is_auto_cost ?? true,
    manual_cost: product.manual_cost ?? product.cost
  }

  const cleanPayload = {
    name: product.name,
    cost: product.cost,
    price: product.price,
    emoji: product.emoji,
    category: product.category || 'General',
    recipe_id: (product.recipe_id && isValidUUID(product.recipe_id)) ? product.recipe_id : null,
    active: product.active ?? true,
    is_auto_cost: product.is_auto_cost ?? true,
    manual_cost: product.manual_cost ?? product.cost
  }

  let savedId = product.id

  if (supabase) {
    let resData: Product | null = null
    if (product.id && isValidUUID(product.id)) {
      let { data, error } = await supabase.from('products').update(fullPayload).eq('id', product.id).select().single()
      if (error) {
        // Fallback to cleanPayload if schema cache lacks image_url/description columns
        const retry = await supabase.from('products').update(cleanPayload).eq('id', product.id).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) {
        resData = data as Product
      } else if (error) {
        console.error('Supabase update product error:', error)
      }
    } else {
      let { data, error } = await supabase.from('products').insert([fullPayload]).select().single()
      if (error) {
        // Fallback to cleanPayload if schema cache lacks image_url/description columns
        const retry = await supabase.from('products').insert([cleanPayload]).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) {
        resData = data as Product
      } else if (error) {
        console.error('Supabase insert product error:', error)
      }
    }

    if (resData) {
      savedId = resData.id
      if (product.image_url || product.description) {
        setProductMeta(resData.id, {
          image_url: product.image_url,
          description: product.description
        })
      }
      return {
        ...resData,
        image_url: product.image_url || resData.image_url,
        description: product.description || resData.description,
        is_auto_cost: product.is_auto_cost ?? true,
        manual_cost: product.manual_cost ?? product.cost
      }
    }
  }

  // Local fallback
  const list = getLocal<Product[]>(KEYS.PRODUCTS, [])
  const targetId = savedId || Date.now().toString()
  const newProductObj: Product = {
    ...cleanPayload,
    id: targetId,
    image_url: product.image_url,
    description: product.description
  } as Product

  if (product.id) {
    const updated = list.map(p => p.id === product.id ? newProductObj : p)
    setLocal(KEYS.PRODUCTS, updated)
  } else {
    setLocal(KEYS.PRODUCTS, [...list, newProductObj])
  }

  if (product.image_url || product.description) {
    setProductMeta(targetId, {
      image_url: product.image_url,
      description: product.description
    })
  }

  return newProductObj
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) return true
    else console.error('Supabase deleteProduct error:', error)
  }
  const list = getLocal<Product[]>(KEYS.PRODUCTS, [])
  setLocal(KEYS.PRODUCTS, list.filter(p => p.id !== id))
  return true
}

// ── SALES API ──
export async function fetchSales(): Promise<Sale[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false })
    if (!error && data) return data.map(s => ({ ...s, paid: s.paid ?? true })) as Sale[]
    else if (error) console.error('Supabase fetchSales error:', error)
  }
  return getLocal<Sale[]>(KEYS.SALES, []).map(s => ({ ...s, paid: s.paid ?? true }))
}

export async function recordSale(saleData: Omit<Sale, 'id'>): Promise<Sale | null> {
  const fullPayload = {
    product_id: (saleData.product_id && isValidUUID(saleData.product_id)) ? saleData.product_id : null,
    product_name: saleData.product_name,
    customer_id: (saleData.customer_id && isValidUUID(saleData.customer_id)) ? saleData.customer_id : null,
    customer_name: saleData.customer_name || 'Consumidor Final',
    quantity: saleData.quantity,
    revenue: saleData.revenue,
    cost: saleData.cost,
    profit: saleData.profit,
    paid: saleData.paid ?? true,
    paid_at: saleData.paid ? (saleData.paid_at || new Date().toISOString()) : null,
    date: saleData.date || new Date().toISOString()
  }

  const standardPayload = {
    product_id: (saleData.product_id && isValidUUID(saleData.product_id)) ? saleData.product_id : null,
    product_name: saleData.product_name,
    quantity: saleData.quantity,
    revenue: saleData.revenue,
    cost: saleData.cost,
    profit: saleData.profit,
    paid: saleData.paid ?? true,
    date: saleData.date || new Date().toISOString()
  }

  if (supabase) {
    let { data, error } = await supabase.from('sales').insert([fullPayload]).select().single()
    if (error) {
      const retry = await supabase.from('sales').insert([standardPayload]).select().single()
      data = retry.data
      error = retry.error
    }

    if (!error && data) {
      return {
        ...(data as Sale),
        customer_id: saleData.customer_id,
        customer_name: saleData.customer_name,
        paid_at: saleData.paid_at
      }
    } else if (error) {
      console.error('Supabase sale insert error:', error)
    }
  }
  const list = getLocal<Sale[]>(KEYS.SALES, [])
  const newSale: Sale = { ...fullPayload, id: Date.now().toString(), paid_at: saleData.paid_at } as Sale
  const updated = [newSale, ...list]
  setLocal(KEYS.SALES, updated)
  return newSale
}

export async function updateSalePaid(id: string, paid: boolean, paid_at?: string): Promise<boolean> {
  const paidAtTime = paid ? (paid_at || new Date().toISOString()) : null
  if (supabase && isValidUUID(id)) {
    let { error } = await supabase.from('sales').update({ paid, paid_at: paidAtTime }).eq('id', id)
    if (error) {
      const retry = await supabase.from('sales').update({ paid }).eq('id', id)
      error = retry.error
    }
    if (!error) return true
    else console.error('Supabase updateSalePaid error:', error)
  }
  const list = getLocal<Sale[]>(KEYS.SALES, [])
  setLocal(KEYS.SALES, list.map(s => s.id === id ? { ...s, paid, paid_at: paidAtTime || undefined } : s))
  return true
}

export async function deleteSale(id: string): Promise<boolean> {
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (!error) return true
    else console.error('Supabase deleteSale error:', error)
  }
  const list = getLocal<Sale[]>(KEYS.SALES, [])
  setLocal(KEYS.SALES, list.filter(s => s.id !== id))
  return true
}

// ── EXPENSES API ──
export async function fetchExpenses(): Promise<Expense[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    if (!error && data) return data as Expense[]
    else if (error) console.error('Supabase fetchExpenses error:', error)
  }
  return getLocal<Expense[]>(KEYS.EXPENSES, [])
}

export async function autoSyncExpenseWithIngredients(expense: {
  description: string
  amount: number
  type: string
  ingredient_id?: string
  package_size?: number
  unit?: string
  quantity_bought?: number
  unit_price?: number
}) {
  try {
    const isIngredientType = expense.type === 'Insumo'
    const descLower = (expense.description || '').toLowerCase()
    
    const keywords = ['harina', 'azucar', 'azúcar', 'manteca', 'dulce de leche', 'oreo', 'queso crema', 'crema', 'chocolate', 'cacao', 'chips', 'insumo', 'materia prima', 'leche', 'huevos', 'frutilla', 'frambuesa', 'molde']
    const hasKeyword = keywords.some(k => descLower.includes(k))

    if (!isIngredientType && !hasKeyword) return

    const currentIngredients = await fetchMasterIngredients()
    
    let match: IngredientMaster | undefined
    if (expense.ingredient_id) {
      match = currentIngredients.find(ing => ing.id === expense.ingredient_id)
    }

    if (!match) {
      match = currentIngredients.find(ing => {
        const ingLower = ing.name.toLowerCase()
        return descLower.includes(ingLower) || ingLower.includes(descLower) ||
          (descLower.includes('harina') && ingLower.includes('harina')) ||
          (descLower.includes('dulce de leche') && ingLower.includes('dulce de leche')) ||
          (descLower.includes('manteca') && ingLower.includes('manteca')) ||
          (descLower.includes('oreo') && ingLower.includes('oreo')) ||
          (descLower.includes('queso') && ingLower.includes('queso')) ||
          (descLower.includes('crema') && ingLower.includes('crema')) ||
          (descLower.includes('chocolate') && ingLower.includes('chocolate')) ||
          (descLower.includes('azucar') && ingLower.includes('azúcar')) ||
          (descLower.includes('cacao') && ingLower.includes('cacao'))
      })
    }

    if (match) {
      // Calculate quantity added to stock
      let addedStock = 1000
      if (expense.package_size && expense.quantity_bought) {
        let size = expense.package_size
        const expUnit = (expense.unit || match.unit || 'g').toLowerCase()
        const targetUnit = (match.unit || 'g').toLowerCase()

        if (expUnit === 'kg' && targetUnit === 'g') size = size * 1000
        if (expUnit === 'l' && targetUnit === 'ml') size = size * 1000

        addedStock = size * expense.quantity_bought
      } else if (match.package_size) {
        addedStock = match.package_size
      }

      const newStock = (match.stock_qty || 0) + addedStock
      const packageCost = expense.unit_price || expense.amount || match.package_cost
      const packageSize = expense.package_size || match.package_size

      const updatedHistory: InsumoHistoryItem[] = [
        {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          package_cost: packageCost,
          package_size: packageSize,
          unit: expense.unit || match.unit || 'g',
          notes: `Compra de Insumo: "${expense.description}"`
        },
        ...(match.history || [])
      ]

      await saveMasterIngredient({
        ...match,
        package_cost: packageCost,
        package_size: packageSize,
        stock_qty: newStock,
        history: updatedHistory
      })
    } else if (isIngredientType) {
      const pSize = expense.package_size || 1000
      const qBought = expense.quantity_bought || 1
      const totalInitialStock = pSize * qBought

      await saveMasterIngredient({
        name: expense.description,
        category: 'Varios',
        unit: expense.unit || 'g',
        package_size: pSize,
        package_cost: expense.unit_price || expense.amount,
        stock_qty: totalInitialStock,
        min_stock: Math.round(totalInitialStock * 0.2),
        history: [{
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          package_cost: expense.unit_price || expense.amount,
          package_size: pSize,
          unit: expense.unit || 'g',
          notes: 'Creado desde registro de Gastos'
        }]
      })
    }
  } catch (err) {
    console.error('Error en autoSyncExpenseWithIngredients:', err)
  }
}

export async function recordExpense(expenseData: Omit<Expense, 'id'>): Promise<Expense | null> {
  const fullPayload = {
    description: expenseData.description,
    amount: expenseData.amount,
    type: expenseData.type,
    related_product: expenseData.related_product || '',
    ingredient_id: (expenseData.ingredient_id && isValidUUID(expenseData.ingredient_id)) ? expenseData.ingredient_id : null,
    package_size: expenseData.package_size || null,
    unit: expenseData.unit || null,
    quantity_bought: expenseData.quantity_bought || null,
    unit_price: expenseData.unit_price || null,
    date: expenseData.date || new Date().toISOString()
  }

  const standardPayload = {
    description: expenseData.description,
    amount: expenseData.amount,
    type: expenseData.type,
    related_product: expenseData.related_product || '',
    date: expenseData.date || new Date().toISOString()
  }

  let newExpense: Expense | null = null

  if (supabase) {
    let { data, error } = await supabase
      .from('expenses')
      .insert([fullPayload])
      .select()
      .single()
    if (error) {
      const retry = await supabase.from('expenses').insert([standardPayload]).select().single()
      data = retry.data
      error = retry.error
    }
    if (!error && data) newExpense = data as Expense
    else if (error) console.error('Supabase expense insert error:', error)
  }

  if (!newExpense) {
    const list = getLocal<Expense[]>(KEYS.EXPENSES, [])
    newExpense = { ...fullPayload, id: Date.now().toString() } as Expense
    const updated = [newExpense, ...list]
    setLocal(KEYS.EXPENSES, updated)
  }

  // Auto sync with Master Ingredients table in Supabase
  await autoSyncExpenseWithIngredients(expenseData)

  return newExpense
}

export async function deleteExpense(id: string): Promise<boolean> {
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) return true
    else console.error('Supabase deleteExpense error:', error)
  }
  const list = getLocal<Expense[]>(KEYS.EXPENSES, [])
  setLocal(KEYS.EXPENSES, list.filter(e => e.id !== id))
  return true
}

// ── ORDERS API ──
export async function fetchOrders(): Promise<Order[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      return data.map(o => ({
        ...o,
        deposit: o.deposit ?? 0,
        pending_balance: o.pending_balance ?? Math.max(0, (o.total_price || 0) - (o.deposit || 0))
      })) as Order[]
    }
    else if (error) console.error('Supabase fetchOrders error:', error)
  }
  return getLocal<Order[]>(KEYS.ORDERS, [])
}

export async function saveOrder(orderData: Omit<Order, 'id'> & { id?: string }): Promise<Order | null> {
  const depositVal = orderData.deposit || 0
  const pendingVal = orderData.pending_balance ?? Math.max(0, (orderData.total_price || 0) - depositVal)

  const fullPayload = {
    customer_id: (orderData.customer_id && isValidUUID(orderData.customer_id)) ? orderData.customer_id : null,
    customer_name: orderData.customer_name,
    product_id: (orderData.product_id && isValidUUID(orderData.product_id)) ? orderData.product_id : null,
    product_name: orderData.product_name,
    quantity: orderData.quantity,
    total_price: orderData.total_price,
    cost: orderData.cost || 0,
    deposit: depositVal,
    pending_balance: pendingVal,
    delivery_date: orderData.delivery_date || null,
    status: orderData.status || 'Pendiente',
    notes: orderData.notes || '',
    created_at: orderData.created_at || new Date().toISOString()
  }

  const standardPayload = {
    customer_name: orderData.customer_name,
    product_id: (orderData.product_id && isValidUUID(orderData.product_id)) ? orderData.product_id : null,
    product_name: orderData.product_name,
    quantity: orderData.quantity,
    total_price: orderData.total_price,
    delivery_date: orderData.delivery_date || null,
    status: orderData.status || 'Pendiente',
    notes: orderData.notes || '',
    created_at: orderData.created_at || new Date().toISOString()
  }

  if (supabase) {
    let resData: Order | null = null
    if (orderData.id && isValidUUID(orderData.id)) {
      let { data, error } = await supabase.from('orders').update(fullPayload).eq('id', orderData.id).select().single()
      if (error) {
        const retry = await supabase.from('orders').update(standardPayload).eq('id', orderData.id).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) resData = data as Order
      else if (error) console.error('Supabase order update error:', error)
    } else {
      let { data, error } = await supabase.from('orders').insert([fullPayload]).select().single()
      if (error) {
        const retry = await supabase.from('orders').insert([standardPayload]).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) resData = data as Order
      else if (error) console.error('Supabase order insert error:', error)
    }

    if (resData) {
      return {
        ...resData,
        customer_id: orderData.customer_id,
        cost: orderData.cost || resData.cost || 0,
        deposit: depositVal,
        pending_balance: pendingVal
      }
    }
  }
  const list = getLocal<Order[]>(KEYS.ORDERS, [])
  if (orderData.id) {
    const updated = list.map(o => o.id === orderData.id ? { ...o, ...fullPayload, id: orderData.id } as Order : o)
    setLocal(KEYS.ORDERS, updated)
    return { ...fullPayload, id: orderData.id } as Order
  } else {
    const newO: Order = { ...fullPayload, id: Date.now().toString() } as Order
    setLocal(KEYS.ORDERS, [...list, newO])
    return newO
  }
}

export async function deleteOrder(id: string): Promise<boolean> {
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) return true
    else console.error('Supabase deleteOrder error:', error)
  }
  const list = getLocal<Order[]>(KEYS.ORDERS, [])
  setLocal(KEYS.ORDERS, list.filter(o => o.id !== id))
  return true
}

// ── MASTER INGREDIENTS API ──
export async function fetchMasterIngredients(): Promise<IngredientMaster[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('ingredients_master')
      .select('*')
      .order('name', { ascending: true })
    if (!error && data) {
      return data.map(i => ({
        ...i,
        category: i.category || 'Varios',
        stock_qty: i.stock_qty ?? 1000,
        min_stock: i.min_stock ?? 200,
        history: i.history || []
      })) as IngredientMaster[]
    } else if (error) {
      console.error('Supabase fetchMasterIngredients error:', error)
    }
  }
  return getLocal<IngredientMaster[]>(KEYS.INGREDIENTS, [
    { id: '1', name: 'Azúcar', category: 'Azúcares', unit: 'g', package_size: 1000, package_cost: 1800, stock_qty: 2000, min_stock: 500, history: [{ id: 'h1', date: '2026-07-28', package_cost: 1800, package_size: 1000, unit: 'g', notes: 'Compra Distribuidora' }] },
    { id: '2', name: 'Azúcar impalpable', category: 'Azúcares', unit: 'g', package_size: 500, package_cost: 1400, stock_qty: 1000, min_stock: 250, history: [{ id: 'h2', date: '2026-07-25', package_cost: 1400, package_size: 500, unit: 'g' }] },
    { id: '3', name: 'Cacao en polvo', category: 'Chocolates', unit: 'g', package_size: 250, package_cost: 2100, stock_qty: 500, min_stock: 200, history: [{ id: 'h3', date: '2026-07-20', package_cost: 2100, package_size: 250, unit: 'g' }] },
    { id: '4', name: 'Chips de chocolate', category: 'Chocolates', unit: 'g', package_size: 500, package_cost: 3500, stock_qty: 1000, min_stock: 300 },
    { id: '5', name: 'Dulce de Leche Repostero', category: 'Lácteos', unit: 'g', package_size: 5000, package_cost: 18500, stock_qty: 5000, min_stock: 1000 },
    { id: '6', name: 'Galletitas Oreo', category: 'Varios', unit: 'g', package_size: 1000, package_cost: 5200, stock_qty: 2000, min_stock: 500 },
    { id: '7', name: 'Queso Crema (Finlandia/Fianza)', category: 'Lácteos', unit: 'g', package_size: 1000, package_cost: 6800, stock_qty: 1500, min_stock: 500 },
    { id: '8', name: 'Crema de Leche 35%', category: 'Lácteos', unit: 'ml', package_size: 1000, package_cost: 4900, stock_qty: 2000, min_stock: 500 },
    { id: '9', name: 'Chocolate Semiamargo (Ganache)', category: 'Chocolates', unit: 'g', package_size: 1000, package_cost: 9500, stock_qty: 1000, min_stock: 300 },
    { id: '10', name: 'Harina 0000', category: 'Harinas', unit: 'g', package_size: 1000, package_cost: 1200, stock_qty: 4000, min_stock: 1000 },
    { id: '11', name: 'Manteca', category: 'Lácteos', unit: 'g', package_size: 500, package_cost: 3800, stock_qty: 1000, min_stock: 400 }
  ])
}

export async function saveMasterIngredient(item: Omit<IngredientMaster, 'id'> & { id?: string }): Promise<IngredientMaster | null> {
  const fullPayload = {
    name: item.name,
    unit: item.unit || 'g',
    package_size: item.package_size || 1000,
    package_cost: item.package_cost || 0,
    category: item.category || 'Varios',
    stock_qty: item.stock_qty ?? 1000,
    min_stock: item.min_stock ?? 200,
    history: item.history || []
  }

  const standardPayload = {
    name: item.name,
    unit: item.unit || 'g',
    package_size: item.package_size || 1000,
    package_cost: item.package_cost || 0
  }

  if (supabase) {
    let resData: IngredientMaster | null = null
    if (item.id && isValidUUID(item.id)) {
      let { data, error } = await supabase.from('ingredients_master').update(fullPayload).eq('id', item.id).select().single()
      if (error) {
        const retry = await supabase.from('ingredients_master').update(standardPayload).eq('id', item.id).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) {
        resData = data as IngredientMaster
      } else if (error) {
        console.error('Supabase update master ingredient error:', error)
      }
    } else {
      let { data, error } = await supabase.from('ingredients_master').insert([fullPayload]).select().single()
      if (error) {
        const retry = await supabase.from('ingredients_master').insert([standardPayload]).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) {
        resData = data as IngredientMaster
      } else if (error) {
        console.error('Supabase insert master ingredient error:', error)
      }
    }

    if (resData) {
      return {
        ...resData,
        category: item.category || 'Varios',
        stock_qty: item.stock_qty ?? 1000,
        min_stock: item.min_stock ?? 200,
        history: item.history || []
      }
    }
  }

  const list = getLocal<IngredientMaster[]>(KEYS.INGREDIENTS, [])
  if (item.id) {
    const updated = list.map(i => i.id === item.id ? { ...i, ...standardPayload, id: item.id } as IngredientMaster : i)
    setLocal(KEYS.INGREDIENTS, updated)
    return { ...standardPayload, id: item.id } as IngredientMaster
  } else {
    const newI: IngredientMaster = { ...standardPayload, id: Date.now().toString() } as IngredientMaster
    setLocal(KEYS.INGREDIENTS, [...list, newI])
    return newI
  }
}

export async function recordInsumoPurchase(insumoId: string, purchaseData: { date: string; package_cost: number; package_size: number; unit: string; supplier?: string; notes?: string }): Promise<boolean> {
  const ingredients = await fetchMasterIngredients()
  const target = ingredients.find(i => i.id === insumoId)
  if (!target) return false

  const newHistoryItem = {
    id: Date.now().toString(),
    ...purchaseData
  }

  const updatedHistory = [newHistoryItem, ...(target.history || [])]
  const updatedItem: IngredientMaster = {
    ...target,
    package_cost: purchaseData.package_cost,
    package_size: purchaseData.package_size,
    unit: purchaseData.unit,
    history: updatedHistory
  }

  await saveMasterIngredient(updatedItem)
  return true
}

export async function deleteMasterIngredient(id: string): Promise<boolean> {
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('ingredients_master').delete().eq('id', id)
    if (!error) return true
    else console.error('Supabase deleteMasterIngredient error:', error)
  }
  const list = getLocal<IngredientMaster[]>(KEYS.INGREDIENTS, [])
  setLocal(KEYS.INGREDIENTS, list.filter(i => i.id !== id))
  return true
}

// ── STOCK DEDUCTION API ──
export async function deductRecipeStock(
  recipeId: string,
  quantityMultiplier: number,
  recipes: Recipe[],
  ingredients: IngredientMaster[]
): Promise<IngredientMaster[]> {
  const recipe = recipes.find(r => r.id === recipeId)
  if (!recipe || !recipe.ingredients) return ingredients

  const updatedIngredients = [...ingredients]

  recipe.ingredients.forEach(ing => {
    if (!ing.name) return
    const targetIdx = updatedIngredients.findIndex(m => m.name.toLowerCase().trim() === ing.name.toLowerCase().trim())
    if (targetIdx === -1) return

    const target = updatedIngredients[targetIdx]
    const match = ing.quantity.match(/^([\d.,]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ]*)$/)
    if (match) {
      let num = parseFloat(match[1].replace(',', '.')) || 0
      const unit = match[2].toLowerCase().trim()

      if (unit === 'kg' && target.unit === 'g') num = num * 1000
      if (unit === 'l' && target.unit === 'ml') num = num * 1000

      const totalDeduction = num * quantityMultiplier
      const currentStock = target.stock_qty ?? target.package_size ?? 1000
      const newStock = Math.max(0, currentStock - totalDeduction)

      updatedIngredients[targetIdx] = {
        ...target,
        stock_qty: Math.round(newStock * 100) / 100
      }

      saveMasterIngredient(updatedIngredients[targetIdx])
    }
  })

  return updatedIngredients
}

// ── RECIPES API ──
export async function fetchRecipes(): Promise<Recipe[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) return data as Recipe[]
    else if (error) console.error('Supabase fetchRecipes error:', error)
  }
  return getLocal<Recipe[]>(KEYS.RECIPES, [
    {
      id: '1',
      title: 'Tarta Cabsha Artesanal',
      category: 'Tartas',
      yield: '1 tarta (24cm)',
      base_servings: 8,
      ingredients: [
        { name: 'Masa sablée (harina, manteca, azúcar, huevo)', quantity: '350g' },
        { name: 'Dulce de Leche Repostero', quantity: '500g' },
        { name: 'Chocolate Semiamargo (Ganache)', quantity: '200g' },
        { name: 'Crema de Leche 35%', quantity: '150g' }
      ],
      steps: '1. Forrar el molde de tarta con la masa y blanquear a horno medio 15 min.\n2. Rellenar con los 500g de dulce de leche repostero parejo.\n3. Calentar la crema hasta casi hervor y verter sobre el chocolate picado para formar la ganache.\n4. Cubrir el dulce de leche con la ganache y decorar los bordes con picos de dulce de leche.',
      notes: 'Usar dulce de leche firme para que los picos no bajen.'
    },
    {
      id: '2',
      title: 'Postre Oreo en Pote',
      category: 'Postres en Pote',
      yield: '6 potes individuales',
      base_servings: 6,
      ingredients: [
        { name: 'Galletitas Oreo', quantity: '234g' },
        { name: 'Dulce de Leche Repostero', quantity: '400g' },
        { name: 'Queso Crema (Finlandia/Fianza)', quantity: '300g' },
        { name: 'Crema de Leche 35%', quantity: '200g' }
      ],
      steps: '1. Colocar una capa de galletitas Oreo molidas en la base del pote.\n2. Mezclar el dulce de leche con el queso crema (chocotorta mix) y manga en el pote.\n3. Agregar capa de crema batida y terminar con trozos de Oreo arriba.',
      notes: 'Armar en potes individuales transparentes de 250cc.'
    }
  ])
}

export async function saveRecipe(recipeData: Omit<Recipe, 'id'> & { id?: string }): Promise<Recipe | null> {
  const payload = {
    title: recipeData.title,
    category: recipeData.category || 'General',
    yield: recipeData.yield || '',
    ingredients: recipeData.ingredients || [],
    steps: recipeData.steps || '',
    notes: recipeData.notes || '',
    packaging_cost: recipeData.packaging_cost || 0,
    labor_hours: recipeData.labor_hours || 0,
    labor_rate: recipeData.labor_rate || 3500,
    base_servings: recipeData.base_servings || 1,
    cost_history: recipeData.cost_history || [],
    created_at: recipeData.created_at || new Date().toISOString()
  }

  const standardPayload = {
    title: recipeData.title,
    category: recipeData.category || 'General',
    yield: recipeData.yield || '',
    ingredients: recipeData.ingredients || [],
    steps: recipeData.steps || '',
    notes: recipeData.notes || '',
    created_at: recipeData.created_at || new Date().toISOString()
  }

  if (supabase) {
    if (recipeData.id && isValidUUID(recipeData.id)) {
      let { data, error } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', recipeData.id)
        .select()
        .single()
      if (error) {
        const retry = await supabase.from('recipes').update(standardPayload).eq('id', recipeData.id).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) return data as Recipe
      else if (error) console.error('Supabase recipe update error:', error)
    } else {
      let { data, error } = await supabase
        .from('recipes')
        .insert([payload])
        .select()
        .single()
      if (error) {
        const retry = await supabase.from('recipes').insert([standardPayload]).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) return data as Recipe
      else if (error) console.error('Supabase recipe insert error:', error)
    }
  }
  const list = getLocal<Recipe[]>(KEYS.RECIPES, [])
  if (recipeData.id) {
    const updated = list.map(r => r.id === recipeData.id ? { ...r, ...payload, id: recipeData.id } as Recipe : r)
    setLocal(KEYS.RECIPES, updated)
    return { ...payload, id: recipeData.id } as Recipe
  } else {
    const newR: Recipe = { ...payload, id: Date.now().toString() } as Recipe
    setLocal(KEYS.RECIPES, [newR, ...list])
    return newR
  }
}

export async function saveRecipeCostSnapshot(recipeId: string, snapshot: Omit<RecipeCostSnapshot, 'id'>): Promise<boolean> {
  const recipes = await fetchRecipes()
  const target = recipes.find(r => r.id === recipeId)
  if (!target) return false

  const newSnapshotItem: RecipeCostSnapshot = {
    id: Date.now().toString(),
    ...snapshot
  }

  const updatedHistory = [newSnapshotItem, ...(target.cost_history || [])]
  const updatedRecipe: Recipe = {
    ...target,
    cost_history: updatedHistory
  }

  await saveRecipe(updatedRecipe)
  return true
}

// ── CUSTOMERS API ──
const CUST_META_KEY = 'sol_customer_meta_v1'

function getCustMetaMap(): Record<string, { favorite_dessert?: string; dietary_tags?: string[]; address_notes?: string }> {
  return getLocal<Record<string, { favorite_dessert?: string; dietary_tags?: string[]; address_notes?: string }>>(CUST_META_KEY, {})
}

function setCustMeta(id: string, meta: { favorite_dessert?: string; dietary_tags?: string[]; address_notes?: string }) {
  const current = getCustMetaMap()
  current[id] = {
    ...current[id],
    ...meta
  }
  setLocal(CUST_META_KEY, current)
}

export async function fetchCustomers(): Promise<Customer[]> {
  const metaMap = getCustMetaMap()
  let list: Customer[] = []

  if (supabase) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })
    if (!error && data) {
      list = data as Customer[]
      
      // Check if there are local customers that were saved offline
      const localList = getLocal<Customer[]>('sol_postres_customers', [])
      const missingInCloud = localList.filter(lc => !list.some(sc => sc.id === lc.id || sc.name.toLowerCase().trim() === lc.name.toLowerCase().trim()))
      if (missingInCloud.length > 0) {
        for (const mc of missingInCloud) {
          saveCustomer(mc).catch(() => {})
        }
        list = [...list, ...missingInCloud]
      }
    } else if (error) {
      console.error('Supabase fetchCustomers error:', error)
    }
  }

  if (list.length === 0) {
    list = getLocal<Customer[]>('sol_postres_customers', [])
  }

  return list.map(c => {
    const meta = metaMap[c.id] || {}
    return {
      ...c,
      favorite_dessert: c.favorite_dessert || meta.favorite_dessert,
      dietary_tags: c.dietary_tags || meta.dietary_tags || [],
      address_notes: c.address_notes || meta.address_notes
    }
  })
}

export async function saveCustomer(customerData: Omit<Customer, 'id'> & { id?: string }): Promise<Customer | null> {
  const fullPayload = {
    name: customerData.name,
    phone: customerData.phone || '',
    address: customerData.address || '',
    birthday: customerData.birthday || null,
    favorite_dessert: customerData.favorite_dessert || '',
    dietary_tags: customerData.dietary_tags || [],
    address_notes: customerData.address_notes || '',
    notes: customerData.notes || '',
    created_at: customerData.created_at || new Date().toISOString()
  }

  const cleanPayload = {
    name: customerData.name,
    phone: customerData.phone || '',
    address: customerData.address || '',
    birthday: customerData.birthday || null,
    notes: customerData.notes || '',
    created_at: customerData.created_at || new Date().toISOString()
  }

  let savedId = customerData.id

  if (supabase) {
    let resData: Customer | null = null
    if (customerData.id && isValidUUID(customerData.id)) {
      let { data, error } = await supabase.from('customers').update(fullPayload).eq('id', customerData.id).select().single()
      if (error) {
        const retry = await supabase.from('customers').update(cleanPayload).eq('id', customerData.id).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) resData = data as Customer
      else if (error) console.error('Supabase customer update error:', error)
    } else {
      let { data, error } = await supabase.from('customers').insert([fullPayload]).select().single()
      if (error) {
        const retry = await supabase.from('customers').insert([cleanPayload]).select().single()
        data = retry.data
        error = retry.error
      }
      if (!error && data) resData = data as Customer
      else if (error) console.error('Supabase customer insert error:', error)
    }

    if (resData) {
      savedId = resData.id
      setCustMeta(resData.id, {
        favorite_dessert: customerData.favorite_dessert,
        dietary_tags: customerData.dietary_tags,
        address_notes: customerData.address_notes
      })
      return {
        ...resData,
        favorite_dessert: customerData.favorite_dessert || resData.favorite_dessert,
        dietary_tags: customerData.dietary_tags || [],
        address_notes: customerData.address_notes || resData.address_notes
      }
    }
  }

  const list = getLocal<Customer[]>('sol_postres_customers', [])
  const targetId = savedId || Date.now().toString()
  const newC: Customer = {
    ...cleanPayload,
    id: targetId,
    favorite_dessert: customerData.favorite_dessert,
    dietary_tags: customerData.dietary_tags || [],
    address_notes: customerData.address_notes
  } as Customer

  if (customerData.id) {
    const updated = list.map(c => c.id === customerData.id ? newC : c)
    setLocal('sol_postres_customers', updated)
  } else {
    setLocal('sol_postres_customers', [newC, ...list])
  }

  setCustMeta(targetId, {
    favorite_dessert: customerData.favorite_dessert,
    dietary_tags: customerData.dietary_tags,
    address_notes: customerData.address_notes
  })

  return newC
}

export async function deleteCustomer(id: string): Promise<boolean> {
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (!error) return true
    else console.error('Supabase deleteCustomer error:', error)
  }
  const list = getLocal<Customer[]>('sol_postres_customers', [])
  setLocal('sol_postres_customers', list.filter(c => c.id !== id))
  return true
}

export async function deleteRecipe(id: string): Promise<boolean> {
  if (supabase && isValidUUID(id)) {
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (!error) return true
    else console.error('Supabase deleteRecipe error:', error)
  }
  const list = getLocal<Recipe[]>(KEYS.RECIPES, [])
  setLocal(KEYS.RECIPES, list.filter(r => r.id !== id))
  return true
}

// ── SETTINGS API ──
export async function fetchSetting(key: string, defaultValue: string): Promise<string> {
  if (supabase) {
    const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
    if (!error && data?.value) return data.value
    else if (error) console.error('Supabase fetchSetting error:', error)
  }
  return getLocal<string>(key === 'monthly_goal' ? KEYS.GOAL : KEYS.NOTES, defaultValue)
}

export async function saveSetting(key: string, value: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })
    if (!error) return true
    else console.error('Supabase saveSetting error:', error)
  }
  setLocal(key === 'monthly_goal' ? KEYS.GOAL : KEYS.NOTES, value)
  return true
}

