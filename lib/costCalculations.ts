import { Recipe, IngredientMaster } from './types'

// Helper to normalize strings for comparison (remove accents, lowercase, trim)
export function normalizeText(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Standardize units to 'g', 'kg', 'ml', 'l', or 'u'
export function normalizeUnit(unitStr: string): 'g' | 'kg' | 'ml' | 'l' | 'u' | string {
  const u = normalizeText(unitStr)
  if (['g', 'gr', 'grs', 'gramo', 'gramos'].includes(u)) return 'g'
  if (['kg', 'kilo', 'kilos', 'kgs'].includes(u)) return 'kg'
  if (['ml', 'cc', 'cm3', 'mililitro', 'mililitros'].includes(u)) return 'ml'
  if (['l', 'lt', 'lts', 'litro', 'litros'].includes(u)) return 'l'
  if (['u', 'un', 'uni', 'unidad', 'unidades', 'huevo', 'huevos', 'paquete', 'paquetes'].includes(u)) return 'u'
  return u
}

/**
 * Converts an amount from one unit to another (e.g., kg <-> g, l <-> ml).
 */
export function convertUnitQuantity(amount: number, fromUnit: string, toUnit: string): number {
  if (!amount || isNaN(amount)) return 0
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)
  if (from === to) return amount

  // Weight: kg <-> g
  if (from === 'kg' && to === 'g') return amount * 1000
  if (from === 'g' && to === 'kg') return amount / 1000

  // Volume: l <-> ml
  if (from === 'l' && to === 'ml') return amount * 1000
  if (from === 'ml' && to === 'l') return amount / 1000

  return amount
}

/**
 * Calculates total and unit cost of a recipe based on master ingredient prices,
 * packaging costs, and labor hours with automatic unit conversions.
 * Resilient to NaN, nulls, negative numbers, missing fields, and division by zero.
 */
export function calculateRecipeCost(
  recipe: Partial<Recipe> | null | undefined,
  masterIngredients: IngredientMaster[] = []
): { totalCost: number; unitCost: number; servings: number } {
  if (!recipe) {
    return { totalCost: 0, unitCost: 0, servings: 1 }
  }

  let totalCost = 0
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

  ingredients.forEach(ing => {
    if (!ing || !ing.name) return

    // 0. If user specifically configured or locked a cost_override for this ingredient in this recipe:
    if (typeof ing.cost_override === 'number' && !isNaN(ing.cost_override) && ing.cost_override >= 0) {
      totalCost += ing.cost_override
      return
    }

    const ingNormName = normalizeText(ing.name)

    // 1. Smart matching: exact match first, then partial/substring match
    let master = masterIngredients.find(
      m => m && m.name && normalizeText(m.name) === ingNormName
    )

    if (!master) {
      master = masterIngredients.find(
        m => m && m.name && (
          normalizeText(m.name).includes(ingNormName) ||
          ingNormName.includes(normalizeText(m.name))
        )
      )
    }

    // Parse quantity number & unit from string like "350g", "130 gr", "1.5 kg", "1 unidad", "40"
    const match = (ing.quantity || '').toString().match(/^([\d.,]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ\s]*)$/)
    if (match) {
      let num = parseFloat(match[1].replace(',', '.'))
      if (isNaN(num) || num < 0) num = 0
      const rawUnit = (match[2] || '').trim()
      const recipeUnit = normalizeUnit(rawUnit)

      if (master && typeof master.package_size === 'number' && master.package_size > 0) {
        const pkgCost = Math.max(0, master.package_cost || 0)
        const masterUnit = normalizeUnit(master.unit || 'g')
        const pkgSize = master.package_size

        // Calculate cost per base unit (g, ml, or u)
        let costPerBaseUnit = 0

        if (masterUnit === 'kg') {
          costPerBaseUnit = pkgCost / (pkgSize * 1000)
        } else if (masterUnit === 'l') {
          costPerBaseUnit = pkgCost / (pkgSize * 1000)
        } else {
          costPerBaseUnit = pkgCost / pkgSize
        }

        // Convert recipe quantity to base unit (g, ml, or u)
        let qtyInBaseUnit = num
        if (recipeUnit === 'kg') {
          qtyInBaseUnit = num * 1000
        } else if (recipeUnit === 'l') {
          qtyInBaseUnit = num * 1000
        }

        totalCost += qtyInBaseUnit * costPerBaseUnit
      } else {
        // Fallback default estimate if ingredient cost not found ($2.5 per gram or unit)
        let mult = num
        if (recipeUnit === 'kg' || recipeUnit === 'l') mult = num * 1000
        totalCost += mult * 2.5
      }
    }
  })

  // Add Packaging & Labor hours cost if present
  const packaging = Math.max(0, recipe.packaging_cost || 0)
  const laborHours = Math.max(0, recipe.labor_hours || 0)
  const laborRate = Math.max(0, recipe.labor_rate || 3500)
  const labor = laborHours * laborRate
  totalCost += packaging + labor

  // Extract servings count from yield string or base_servings (e.g. "6 potes" -> 6)
  let servings = Math.max(1, recipe.base_servings || 1)
  const yieldMatch = (recipe.yield || '').match(/(\d+)/)
  if (yieldMatch) {
    const parsedServings = parseInt(yieldMatch[1], 10)
    if (parsedServings > 0) {
      servings = parsedServings
    }
  }

  // Ensure totalCost is valid and finite
  if (isNaN(totalCost) || !isFinite(totalCost) || totalCost < 0) {
    totalCost = 0
  }

  const unitCost = servings > 0 ? totalCost / servings : totalCost
  const safeUnitCost = isNaN(unitCost) || !isFinite(unitCost) || unitCost < 0 ? 0 : unitCost

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    unitCost: Math.round(safeUnitCost),
    servings
  }
}

/**
 * Calculates the individual cost and matching master price for a single recipe ingredient,
 * taking into account cost_override if set.
 */
export function calculateSingleIngredientCost(
  ing: { name: string; quantity: string; cost_override?: number },
  masterIngredients: IngredientMaster[] = []
): {
  cost: number
  calculatedCost: number
  isOverride: boolean
  matchedMaster?: IngredientMaster
  costPerUnitText?: string
} {
  if (!ing || !ing.name) {
    return { cost: 0, calculatedCost: 0, isOverride: false }
  }

  const ingNormName = normalizeText(ing.name)

  let master = masterIngredients.find(
    m => m && m.name && normalizeText(m.name) === ingNormName
  )

  if (!master) {
    master = masterIngredients.find(
      m => m && m.name && (
        normalizeText(m.name).includes(ingNormName) ||
        ingNormName.includes(normalizeText(m.name))
      )
    )
  }

  let calculated = 0
  let costPerUnitText = ''

  const match = (ing.quantity || '').toString().match(/^([\d.,]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ\s]*)$/)
  if (match) {
    let num = parseFloat(match[1].replace(',', '.'))
    if (isNaN(num) || num < 0) num = 0
    const rawUnit = (match[2] || '').trim()
    const recipeUnit = normalizeUnit(rawUnit)

    if (master && typeof master.package_size === 'number' && master.package_size > 0) {
      const pkgCost = Math.max(0, master.package_cost || 0)
      const masterUnit = normalizeUnit(master.unit || 'g')
      const pkgSize = master.package_size

      let costPerBaseUnit = 0
      if (masterUnit === 'kg') {
        costPerBaseUnit = pkgCost / (pkgSize * 1000)
        costPerUnitText = `$${(pkgCost / pkgSize).toFixed(0)}/kg`
      } else if (masterUnit === 'l') {
        costPerBaseUnit = pkgCost / (pkgSize * 1000)
        costPerUnitText = `$${(pkgCost / pkgSize).toFixed(0)}/L`
      } else {
        costPerBaseUnit = pkgCost / pkgSize
        costPerUnitText = `$${costPerBaseUnit.toFixed(2)}/${master.unit || 'u'}`
      }

      let qtyInBaseUnit = num
      if (recipeUnit === 'kg') qtyInBaseUnit = num * 1000
      else if (recipeUnit === 'l') qtyInBaseUnit = num * 1000

      calculated = Math.round(qtyInBaseUnit * costPerBaseUnit * 100) / 100
    } else {
      let mult = num
      if (recipeUnit === 'kg' || recipeUnit === 'l') mult = num * 1000
      calculated = Math.round(mult * 2.5 * 100) / 100
      costPerUnitText = '$2.50/g (Estimado)'
    }
  }

  const isOverride = typeof ing.cost_override === 'number' && !isNaN(ing.cost_override) && ing.cost_override >= 0
  const finalCost = isOverride ? ing.cost_override! : calculated

  return {
    cost: finalCost,
    calculatedCost: calculated,
    isOverride,
    matchedMaster: master,
    costPerUnitText
  }
}

