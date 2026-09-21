import { test, expect } from '@playwright/test'

test.describe('Flujo 3: Compras de Insumos & Control de Stock - E2E Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  test('Sincronización Bidireccional Insumos ↔ Gastos, Conversión de Unidades y Reversión de Stock', async ({ page }) => {
    const timestamp = Date.now()
    const testInsumoName = `Insumo E2E Harina Especial ${timestamp}`

    // 1. Ir a la pestaña de Insumos
    await page.goto('/insumos')
    await expect(page.locator('h2', { hasText: 'Control de Insumos & Costos' })).toBeVisible({ timeout: 15000 })

    // 2. Crear nuevo insumo maestro de prueba
    const addInsumoBtn = page.getByRole('button', { name: /Agregar Insumo/i })
    await expect(addInsumoBtn).toBeVisible()
    await addInsumoBtn.click()

    // Llenar formulario de nuevo insumo
    await page.locator('form input[placeholder*="Azúcar"]').first().fill(testInsumoName)
    await page.locator('form input[placeholder="1000"]').first().fill('1000') // package_size
    await page.locator('form input[placeholder="1800"]').first().fill('2500') // package_cost
    await page.locator('[data-testid="input-stock-qty"]').fill('1000') // initial stock: 1000g
    await page.locator('[data-testid="input-min-stock"]').fill('500')  // min stock: 500g

    const submitInsumoBtn = page.getByRole('button', { name: /Guardar Insumo/i })
    await submitInsumoBtn.click()

    // 3. Verificar que la tarjeta aparezca en el catálogo de insumos con stock inicial (1000 g)
    const insumoCard = page.locator('[data-testid="insumo-card"]', { hasText: testInsumoName }).first()
    await expect(insumoCard).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${testInsumoName}`).first()).toBeVisible()
    await expect(insumoCard.locator('text=1000 g').first()).toBeVisible()

    // 4. Registrar compra desde InsumosTab
    const purchaseBtn = insumoCard.getByRole('button', { name: /Registrar Compra/i })
    await purchaseBtn.click()

    // Modal de compra
    const purchaseModal = page.locator('div', { hasText: 'Registrar Nueva Compra' }).first()
    await expect(purchaseModal).toBeVisible({ timeout: 5000 })

    await purchaseModal.locator('input[placeholder="1800"]').fill('5000') // precio total pagado: $5000
    await purchaseModal.locator('input[placeholder="1000"]').fill('2000') // 2000g comprados

    const savePurchaseBtn = purchaseModal.getByRole('button', { name: /Guardar y Actualizar Precio/i })
    await savePurchaseBtn.click()

    // Verificar que el stock haya aumentado a 3000g (1000g iniciales + 2000g comprados)
    await expect(insumoCard.locator('text=3000 g').first()).toBeVisible({ timeout: 10000 })

    // 5. Ir a la pestaña de Gastos y comprobar que la compra impactó automáticamente en el libro de gastos
    await page.goto('/gastos')
    await expect(page.locator('h2', { hasText: 'Registrar Compra o Gasto' })).toBeVisible({ timeout: 15000 })

    // Buscar en el historial de gastos la compra registrada
    const expenseItem = page.locator('div, tr', { hasText: testInsumoName }).first()
    await expect(expenseItem).toBeVisible({ timeout: 10000 })

    // 6. Registrar una compra adicional directamente desde GastosTab con conversión de unidades (1 kg -> 1000 g)
    const expenseDescInput = page.locator('[data-testid="input-expense-description"]').first()
    await expenseDescInput.fill(testInsumoName)

    // Formato: 1 kg
    const packageSizeInput = page.locator('[data-testid="input-expense-package-size"]').first()
    await packageSizeInput.fill('1')

    const unitSelect = page.locator('[data-testid="select-expense-unit"]').first()
    await unitSelect.selectOption('kg')

    // Precio total $3000
    const amountInput = page.locator('[data-testid="input-expense-amount"]').first()
    await amountInput.fill('3000')

    const addExpenseSubmit = page.locator('[data-testid="submit-expense-btn"]').first()
    await addExpenseSubmit.click()

    // Esperar a que la compra impacte y se confirme
    await expect(page.getByText(/Stock general actualizado/i)).toBeVisible({ timeout: 15000 })

    // 7. Volver a InsumosTab y verificar que el stock aumentó en 1000g exactos (3000g + 1000g = 4000g)
    await page.goto('/insumos')
    await expect(page.locator('h2', { hasText: 'Control de Insumos & Costos' })).toBeVisible({ timeout: 15000 })
    const updatedCard = page.locator('[data-testid="insumo-card"]', { hasText: testInsumoName }).first()
    await expect(updatedCard.locator('text=4000 g').first()).toBeVisible({ timeout: 10000 })

    // 8. Volver a Gastos y eliminar el último gasto registrado para comprobar la reversión del stock
    await page.goto('/gastos')
    await expect(page.locator('h2', { hasText: 'Registrar Compra o Gasto' })).toBeVisible({ timeout: 15000 })

    const searchGastos = page.locator('input[placeholder*="Buscar"]').first()
    if (await searchGastos.isVisible()) {
      await searchGastos.fill(testInsumoName)
    }

    // Click en eliminar el gasto de $3000
    const expense3000Row = page.locator('tr').filter({ hasText: testInsumoName }).filter({ hasText: /3\.000|3000/ }).first()
    const deleteExpenseBtn = expense3000Row.locator('[data-testid="delete-expense-btn"]').first()
    await expect(deleteExpenseBtn).toBeVisible({ timeout: 5000 })
    await deleteExpenseBtn.click()

    // Confirmar en el modal de confirmación
    const confirmBtn = page.locator('[data-testid="confirm-modal-button"]').first()
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click()

    // Esperar toast de confirmación "Gasto eliminado"
    await expect(page.locator('text=Gasto eliminado')).toBeVisible({ timeout: 10000 })

    // 9. Volver a Insumos y verificar que el stock volvió a 3000g tras la reversión
    await page.goto('/insumos')
    await expect(page.locator('h2', { hasText: 'Control de Insumos & Costos' })).toBeVisible({ timeout: 15000 })
    const revertedCard = page.locator('[data-testid="insumo-card"]', { hasText: testInsumoName }).first()
    await expect(revertedCard.locator('text=3000 g').first()).toBeVisible({ timeout: 10000 })
  })

  test('Alerta visual de Stock Mínimo y filtro "Para Comprar"', async ({ page }) => {
    const timestamp = Date.now()
    const testScarceName = `Insumo E2E Azúcar Escaso ${timestamp}`

    await page.goto('/insumos')
    await expect(page.locator('h2', { hasText: 'Control de Insumos & Costos' })).toBeVisible({ timeout: 15000 })

    // Crear insumo con stock menor al mínimo (stock: 100g, min_stock: 500g)
    const addInsumoBtn = page.getByRole('button', { name: /Agregar Insumo/i })
    await addInsumoBtn.click()

    await page.locator('form input[placeholder*="Azúcar"]').first().fill(testScarceName)
    await page.locator('form input[placeholder="1000"]').first().fill('1000') // package_size
    await page.locator('form input[placeholder="1800"]').first().fill('1200') // package_cost
    await page.locator('[data-testid="input-stock-qty"]').fill('100') // stock: 100g
    await page.locator('[data-testid="input-min-stock"]').fill('500') // min: 500g

    const submitInsumoBtn = page.getByRole('button', { name: /Guardar Insumo/i })
    await submitInsumoBtn.click()

    const scarceCard = page.locator('[data-testid="insumo-card"]', { hasText: testScarceName }).first()
    await expect(scarceCard).toBeVisible({ timeout: 10000 })

    // Verificar que tenga el badge de Recompra Urgente
    await expect(scarceCard.locator('text=⚠️ Recompra Urgente')).toBeVisible({ timeout: 8000 })

    // Probar filtro "Para Comprar"
    const paraComprarBtn = page.getByRole('button', { name: /Para Comprar/i }).first()
    await expect(paraComprarBtn).toBeVisible()
    await paraComprarBtn.click()

    await expect(page.locator(`text=${testScarceName}`).first()).toBeVisible()

    // Probar filtro "Todos"
    const todosBtn = page.getByRole('button', { name: /Todos/i }).first()
    await todosBtn.click()
    await expect(page.locator(`text=${testScarceName}`).first()).toBeVisible()
  })
})
