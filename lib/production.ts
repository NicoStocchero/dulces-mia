import { Order, Product, Recipe, IngredientMaster } from './types'
import { calculateRecipeCost } from '@/components/tabs/CatalogoTab'

export type ProductionRequirement = {
  ingredientName: string
  requiredQty: number
  unit: string
  currentStock: number
  packageCost: number
  packageSize: number
  toBuyQty: number
  estimatedCost: number
  isLowStock: boolean
}

/**
 * Calculates aggregated raw material requirements for a list of pending orders based on linked recipes.
 */
export function calculateProductionRequirements(
  orders: Order[],
  products: Product[],
  recipes: Recipe[],
  masterIngredients: IngredientMaster[]
): {
  requirements: ProductionRequirement[]
  totalEstimatedShoppingCost: number
  totalOrdersCount: number
  totalItemsCount: number
} {
  const pendingOrders = orders.filter(o => o.status === 'Pendiente')
  const aggregatedMap = new Map<string, { qty: number; unit: string }>()

  let totalItemsCount = 0

  pendingOrders.forEach(order => {
    totalItemsCount += order.quantity

    // Find product or recipe linked
    const product = products.find(p => p.id === order.product_id || p.name.toLowerCase() === order.product_name.toLowerCase())
    const recipeId = product?.recipe_id
    const recipe = recipes.find(r => r.id === recipeId || r.title.toLowerCase() === order.product_name.toLowerCase())

    if (recipe && recipe.ingredients) {
      // Calculate multiplier based on base servings
      let servings = recipe.base_servings || 1
      const yieldMatch = recipe.yield?.match(/(\d+)/)
      if (yieldMatch) {
        servings = parseInt(yieldMatch[1]) || 1
      }
      const recipeMultiplier = (order.quantity / servings)

      recipe.ingredients.forEach(ing => {
        if (!ing.name) return
        const match = ing.quantity.match(/^([\d.,]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ\s]*)$/)
        if (!match) return

        let amount = (parseFloat(match[1].replace(',', '.')) || 0) * recipeMultiplier
        const unit = match[2].trim().toLowerCase() || 'g'
        const key = ing.name.toLowerCase().trim()

        const existing = aggregatedMap.get(key) || { qty: 0, unit }
        aggregatedMap.set(key, {
          qty: existing.qty + amount,
          unit: unit
        })
      })
    }
  })

  const requirements: ProductionRequirement[] = []
  let totalEstimatedShoppingCost = 0

  aggregatedMap.forEach((val, key) => {
    const master = masterIngredients.find(m => m.name.toLowerCase().trim() === key)
    const masterName = master ? master.name : key.charAt(0).toUpperCase() + key.slice(1)
    const masterUnit = master ? master.unit : val.unit
    const currentStock = master ? (master.stock_qty ?? 1000) : 1000
    const packageCost = master ? master.package_cost : 0
    const packageSize = master ? master.package_size : 1000

    let requiredQty = val.qty

    // Standardize unit conversions if master is in g and required is in kg
    if (val.unit === 'kg' && masterUnit === 'g') requiredQty = val.qty * 1000
    if (val.unit === 'l' && masterUnit === 'ml') requiredQty = val.qty * 1000

    const missingQty = Math.max(0, requiredQty - currentStock)
    const isLowStock = currentStock < requiredQty

    // Estimate cost based on package cost
    let estimatedCost = 0
    let toBuyQty = 0

    if (missingQty > 0 && packageSize > 0 && packageCost > 0) {
      const packagesNeeded = Math.ceil(missingQty / packageSize)
      toBuyQty = packagesNeeded * packageSize
      estimatedCost = packagesNeeded * packageCost
    }

    totalEstimatedShoppingCost += estimatedCost

    requirements.push({
      ingredientName: masterName,
      requiredQty: Math.round(requiredQty * 10) / 10,
      unit: masterUnit,
      currentStock,
      packageCost,
      packageSize,
      toBuyQty,
      estimatedCost,
      isLowStock
    })
  })

  return {
    requirements: requirements.sort((a, b) => (b.isLowStock ? 1 : 0) - (a.isLowStock ? 1 : 0)),
    totalEstimatedShoppingCost,
    totalOrdersCount: pendingOrders.length,
    totalItemsCount
  }
}
