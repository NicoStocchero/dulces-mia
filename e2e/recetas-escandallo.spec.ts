import { test, expect } from '@playwright/test'

test.describe('Flujo Recetas ↔ Insumos ↔ Costos ↔ Postres - E2E Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  test('Crea receta completa con empaque y mano de obra, vincula a postre y verifica cálculo bidireccional y versionado', async ({ page }) => {
    // 1. Ir al Recetario
    await page.goto('/recetas')
    await expect(page.locator('h2', { hasText: 'Libro de Recetas & Escalado' })).toBeVisible({ timeout: 15000 })

    // 2. Abrir Modal de Nueva Receta
    const newRecipeBtn = page.getByRole('button', { name: /Nueva Receta/i })
    await expect(newRecipeBtn).toBeVisible()
    await newRecipeBtn.click()

    const recipeModal = page.locator('h3', { hasText: 'Nueva Receta' })
    await expect(recipeModal).toBeVisible()

    // 3. Completar datos de la receta de prueba
    const testRecipeTitle = `Receta E2E Test Tarta Frutillas ${Date.now()}`
    const titleInput = page.getByPlaceholder(/Ej: Tarta Cabsha/i)
    await titleInput.fill(testRecipeTitle)

    const yieldInput = page.getByPlaceholder(/Ej: 1 tarta 24cm/i)
    await yieldInput.fill('1 tarta')

    const packagingInput = page.getByPlaceholder(/Ej: 450/i)
    await packagingInput.fill('500')

    const laborInput = page.getByPlaceholder(/Ej: 0.5 hs/i)
    await laborInput.fill('0.5')

    // 4. Agregar ingredientes
    // Ingrediente 0: Harina 0000 250g
    const ing0Name = page.getByPlaceholder(/Ingrediente \(ej: Galletitas Oreo\)/i).first()
    const ing0Qty = page.getByPlaceholder(/Cant\. \(ej: 350g, 2 u\)/i).first()
    await ing0Name.fill('HARINA 0000')
    await ing0Qty.fill('250g')

    // Ingrediente 1: Dulce de leche 300g
    const addIngBtn = page.getByRole('button', { name: /Añadir ingrediente/i })
    await addIngBtn.click()

    const ing1Name = page.getByPlaceholder(/Ingrediente \(ej: Galletitas Oreo\)/i).nth(1)
    const ing1Qty = page.getByPlaceholder(/Cant\. \(ej: 350g, 2 u\)/i).nth(1)
    await ing1Name.fill('Dulce de leche')
    await ing1Qty.fill('300g')

    // Guardar receta
    const saveRecipeBtn = page.getByRole('button', { name: /Guardar Receta/i })
    await saveRecipeBtn.click()

    // El modal debe cerrarse y la receta debe aparecer
    await expect(recipeModal).not.toBeVisible({ timeout: 10000 })
    const createdRecipeCard = page.locator('h3', { hasText: testRecipeTitle })
    await expect(createdRecipeCard).toBeVisible({ timeout: 10000 })

    // Inicialmente no tiene postre vinculado en el catálogo
    await expect(page.locator('text=Sin postre vinculado en catálogo').first()).toBeVisible()

    // 5. Ir al Catálogo de Postres para vincularla a un postre
    await page.goto('/catalogo')
    await expect(page.locator('h2', { hasText: 'Catálogo de Postres' })).toBeVisible({ timeout: 15000 })

    const addProductBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await addProductBtn.click()

    const productModal = page.locator('h3', { hasText: 'Nuevo Postre en Catálogo' })
    await expect(productModal).toBeVisible()

    const testProductName = `Postre E2E Test Frutillas ${Date.now()}`
    const prodNameInput = page.getByPlaceholder(/Ej: Tarta de Ricota/i)
    await prodNameInput.fill(testProductName)

    // Seleccionar la receta recién creada en el dropdown
    const recipeSelect = page.locator('select').filter({ hasText: /Sin receta vinculada/i })
    const optionValue = await recipeSelect.locator('option', { hasText: testRecipeTitle }).getAttribute('value')
    if (optionValue) {
      await recipeSelect.selectOption(optionValue)
    }

    // Verificar que el modo de costo se activa en Automático
    await expect(page.locator('text=Automático (Receta)')).toBeVisible()

    // Completar precio de venta
    const priceInput = page.getByPlaceholder(/Ej: 4500/i)
    await priceInput.fill('12500')

    // Guardar postre
    const saveProductBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await saveProductBtn.click()

    await expect(productModal).not.toBeVisible({ timeout: 10000 })

    // Verificar que el postre aparece en el catálogo vinculado a la receta
    const productCard = page.locator('h3', { hasText: testProductName })
    await expect(productCard).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=Receta: ${testRecipeTitle}`)).toBeVisible()

    // 6. Volver a Recetas y verificar que la receta ahora muestra la vinculación bidireccional con el postre
    await page.goto('/recetas')
    await expect(page.locator('h2', { hasText: 'Libro de Recetas & Escalado' })).toBeVisible({ timeout: 15000 })

    const recipeTitleOnReturn = page.locator('h3', { hasText: testRecipeTitle })
    await expect(recipeTitleOnReturn).toBeVisible()

    // La insignia de vinculación debe mostrar el nombre del postre comercial
    await expect(page.locator(`text=Postre: ${testProductName}`)).toBeVisible()

    // 7. Probar Congelar Versión de Costo (Historial de Inmutabilidad)
    const freezeVersionBtn = page.getByRole('button', { name: /Congelar Versión/i }).first()
    await expect(freezeVersionBtn).toBeVisible()
    await freezeVersionBtn.click()

    // Verificar que el historial de costos se expande o registra la versión
    await expect(page.locator('text=Historial de Costos')).toBeVisible({ timeout: 8000 })
  })
})
