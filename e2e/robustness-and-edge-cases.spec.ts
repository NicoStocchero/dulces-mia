import { test, expect } from '@playwright/test'
import { calculateRecipeCost } from '../lib/costCalculations'
import { Recipe, IngredientMaster } from '../lib/types'

test.describe('Casos Borde Numéricos y Anti-NaN (Financial & Math Edge Cases)', () => {
  const masterIngredients: IngredientMaster[] = [
    {
      id: 'ing-1',
      name: 'Harina 0000',
      category: 'Secos',
      unit: 'g',
      package_cost: 1500,
      package_size: 1000,
      stock_qty: 2000,
    },
    {
      id: 'ing-zero-pkg',
      name: 'Insumo Tamaño Cero',
      category: 'Varios',
      unit: 'g',
      package_cost: 1000,
      package_size: 0, // Peligro: división por cero
      stock_qty: 100,
    },
    {
      id: 'ing-neg-cost',
      name: 'Insumo Costo Negativo',
      category: 'Varios',
      unit: 'g',
      package_cost: -500, // Peligro: precio corrupto negativo
      package_size: 100,
      stock_qty: 100,
    },
  ]

  test('Evita división por cero y NaN cuando el tamaño del paquete es 0', () => {
    const recipe: Recipe = {
      id: 'rec-edge-1',
      title: 'Receta Peligro Cero',
      category: 'Varios',
      base_servings: 1,
      ingredients: [
        { name: 'Insumo Tamaño Cero', quantity: '100g' },
      ],
    }

    const { totalCost, unitCost } = calculateRecipeCost(recipe, masterIngredients)

    expect(Number.isFinite(totalCost)).toBe(true)
    expect(Number.isFinite(unitCost)).toBe(true)
    expect(isNaN(totalCost)).toBe(false)
    expect(isNaN(unitCost)).toBe(false)
    expect(totalCost).toBeGreaterThanOrEqual(0)
  })

  test('Evita números negativos cuando hay insumos o tarifas con signo negativo', () => {
    const recipe: Recipe = {
      id: 'rec-edge-2',
      title: 'Receta con Costos Negativos',
      category: 'Varios',
      base_servings: 1,
      packaging_cost: -200,
      labor_hours: -2,
      labor_rate: -4000,
      ingredients: [
        { name: 'Insumo Costo Negativo', quantity: '50g' },
      ],
    }

    const { totalCost, unitCost } = calculateRecipeCost(recipe, masterIngredients)

    expect(totalCost).toBeGreaterThanOrEqual(0)
    expect(unitCost).toBeGreaterThanOrEqual(0)
  })

  test('Evita división por cero cuando las porciones o rendimiento son 0 o negativos', () => {
    const recipeZeroServings: Recipe = {
      id: 'rec-edge-3',
      title: 'Receta Cero Porciones',
      category: 'Varios',
      yield: '0 porciones',
      base_servings: 0,
      ingredients: [
        { name: 'Harina 0000', quantity: '200g' },
      ],
    }

    const { totalCost, unitCost, servings } = calculateRecipeCost(recipeZeroServings, masterIngredients)

    // Debe asignar al menos 1 porción para evitar Infinity
    expect(servings).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(unitCost)).toBe(true)
    expect(unitCost).toBe(totalCost)
  })

  test('Tolera recetas con ingredientes vacíos, nulos o textos descriptivos no numéricos', () => {
    const recipeMalformed: Partial<Recipe> = {
      id: 'rec-edge-4',
      title: 'Receta Textos Raros',
      ingredients: [
        { name: 'Canela', quantity: 'un toque a gusto' },
        { name: 'Vainilla', quantity: '' },
        { name: '', quantity: '100g' },
      ],
    }

    const { totalCost, unitCost } = calculateRecipeCost(recipeMalformed as Recipe, masterIngredients)

    expect(totalCost).toBe(0)
    expect(unitCost).toBe(0)
  })

  test('Tolera objeto de receta completamente nulo o indefinido', () => {
    const resultNull = calculateRecipeCost(null, masterIngredients)
    expect(resultNull.totalCost).toBe(0)
    expect(resultNull.unitCost).toBe(0)

    const resultUndefined = calculateRecipeCost(undefined, masterIngredients)
    expect(resultUndefined.totalCost).toBe(0)
    expect(resultUndefined.unitCost).toBe(0)
  })
})

test.describe('Concurrencia, Bloqueo de Doble Clic y Prevención de Duplicados (Double Submit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  test('En Catálogo: Clic rápido doble en "Guardar Postre" procesa una única vez', async ({ page }) => {
    await page.goto('/catalogo')

    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await expect(addBtn).toBeVisible({ timeout: 15000 })
    await addBtn.click()

    const nameInput = page.getByPlaceholder(/Ej: Tarta de Ricota/i)
    const uniqueDessert = `Anti-Double-Click ${Date.now()}`
    await nameInput.fill(uniqueDessert)

    const priceInput = page.getByPlaceholder(/Ej: 4500/i)
    await priceInput.fill('6500')

    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await expect(saveBtn).toBeVisible()

    // Simular doble clic consecutivo súper veloz
    await saveBtn.click({ clickCount: 2 })

    // El modal debe cerrarse limpiamente
    await expect(page.locator('h3', { hasText: 'Nuevo Postre en Catálogo' })).not.toBeVisible({ timeout: 10000 })

    // Debe haber exactamente 1 tarjeta con ese nombre, NUNCA 2 tarjetas duplicadas
    const dessertCards = page.locator('h3', { hasText: uniqueDessert })
    await expect(dessertCards).toHaveCount(1)
  })

  test('En Comercial: Clic rápido doble en "Registrar Venta Directa" no duplica la venta', async ({ page }) => {
    await page.goto('/ventas')

    await expect(page.locator('h2', { hasText: 'Módulo Comercial Unificado' })).toBeVisible({ timeout: 15000 })

    // Esperar a que el catálogo de postres cargue sus opciones y esté hidratado
    const dessertSelect = page.locator('select').nth(1)
    await expect(dessertSelect.locator('option').nth(1)).toBeAttached({ timeout: 15000 })

    await expect(async () => {
      await dessertSelect.selectOption({ index: 1 })
      const val = await dessertSelect.inputValue()
      expect(val).not.toBe('')
    }).toPass({ timeout: 10000 })

    const submitBtn = page.getByRole('button', { name: /Registrar Venta Directa/i })
    await expect(submitBtn).toBeEnabled({ timeout: 10000 })

    // Simular doble toque rápido consecutivo (double click)
    await submitBtn.click({ clickCount: 2 })

    // El sistema debe procesar la venta y mostrar el toast
    await expect(page.locator('text=registrada y cobrada')).toBeVisible({ timeout: 10000 })
  })
})
