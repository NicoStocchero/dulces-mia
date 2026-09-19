import { Recipe, IngredientMaster } from './types'

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
    const master = masterIngredients.find(
      m => m && m.name && m.name.toLowerCase().trim() === ing.name.toLowerCase().trim()
    )

    // Parse quantity number & unit from string like "350g" or "1.5 kg"
    const match = (ing.quantity || '').match(/^([\d.,]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ]*)$/)
    if (match) {
      let num = parseFloat(match[1].replace(',', '.'))
      if (isNaN(num) || num < 0) num = 0
      const unit = (match[2] || '').toLowerCase().trim()

      if (master && typeof master.package_size === 'number' && master.package_size > 0) {
        const pkgCost = Math.max(0, master.package_cost || 0)
        const costPerUnit = pkgCost / master.package_size

        // Convert kg to g if master is in g
        if (unit === 'kg' && master.unit === 'g') num = num * 1000
        // Convert L to ml if master is in ml
        if (unit === 'l' && master.unit === 'ml') num = num * 1000

        totalCost += num * costPerUnit
      } else {
        // Fallback default estimate if ingredient cost not found
        totalCost += num * 2.5
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
