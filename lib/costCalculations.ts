import { Recipe, IngredientMaster } from './types'

/**
 * Calculates total and unit cost of a recipe based on master ingredient prices,
 * packaging costs, and labor hours with automatic unit conversions.
 */
export function calculateRecipeCost(
  recipe: Recipe,
  masterIngredients: IngredientMaster[]
): { totalCost: number; unitCost: number; servings: number } {
  let totalCost = 0

  recipe.ingredients.forEach(ing => {
    if (!ing.name) return
    const master = masterIngredients.find(
      m => m.name.toLowerCase().trim() === ing.name.toLowerCase().trim()
    )

    // Parse quantity number & unit from string like "350g" or "1.5 kg"
    const match = ing.quantity.match(/^([\d.,]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ]*)$/)
    if (match) {
      let num = parseFloat(match[1].replace(',', '.')) || 0
      const unit = match[2].toLowerCase().trim()

      if (master && master.package_size > 0) {
        const costPerUnit = master.package_cost / master.package_size

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
  const packaging = recipe.packaging_cost || 0
  const labor = (recipe.labor_hours || 0) * (recipe.labor_rate || 3500)
  totalCost += packaging + labor

  // Extract servings count from yield string or base_servings (e.g. "6 potes" -> 6)
  let servings = recipe.base_servings || 1
  const yieldMatch = recipe.yield?.match(/(\d+)/)
  if (yieldMatch) {
    servings = parseInt(yieldMatch[1]) || 1
  }

  const unitCost = servings > 0 ? totalCost / servings : totalCost
  return { totalCost: Math.round(totalCost * 100) / 100, unitCost: Math.round(unitCost), servings }
}
