import { test, expect } from '@playwright/test'

test.describe('Módulo Comercial Unificado - E2E Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  test('Permite alternar entre Venta Mostrador y Pedido Anticipado y registrar con desglose de costo', async ({ page }) => {
    await page.goto('/ventas')

    // 1. Verificar carga del módulo unificado
    const title = page.locator('h2', { hasText: 'Módulo Comercial Unificado' })
    await expect(title).toBeVisible({ timeout: 15000 })

    // 2. Verificar selector de modo (Venta Mostrador vs Pedido Anticipado)
    const mostradorTab = page.getByRole('button', { name: /Venta Mostrador/i })
    const pedidoTab = page.getByRole('button', { name: /Pedido Anticipado/i })
    await expect(mostradorTab).toBeVisible()
    await expect(pedidoTab).toBeVisible()

    // Alternar a Pedido Anticipado
    await pedidoTab.click()
    await expect(page.getByText('Fecha de Entrega')).toBeVisible()

    // Alternar de vuelta a Venta Mostrador
    await mostradorTab.click()
    await expect(page.getByText('Estado de Cobro')).toBeVisible()

    // 3. Probar Modal de Alta Rápida de Cliente (+ Agregar nuevo cliente)
    const addCustBtn = page.getByRole('button', { name: /Agregar nuevo cliente/i })
    await expect(addCustBtn).toBeVisible()
    await addCustBtn.click()

    const quickCustModal = page.locator('h3', { hasText: 'Agregar Cliente al CRM' })
    await expect(quickCustModal).toBeVisible()

    const custNameInput = page.getByPlaceholder(/Ej: Carolina Gómez/i)
    const testCustName = `Cliente E2E ${Date.now()}`
    await custNameInput.fill(testCustName)

    const saveCustBtn = page.getByRole('button', { name: /Guardar y Vincular/i })
    await saveCustBtn.click()

    // El modal de cliente debe cerrarse
    await expect(quickCustModal).not.toBeVisible()

    // 4. Seleccionar un postre del catálogo (segundo select del form)
    const dessertSelect = page.locator('select').nth(1)
    await dessertSelect.selectOption({ index: 1 })

    // 5. Verificar que se muestre el desglose en tiempo real (Venta, Costo, Ganancia)
    const desglose = page.locator('text=Desglose Financiero de la Operación')
    await expect(desglose).toBeVisible()

    // 6. Registrar la venta
    const submitBtn = page.getByRole('button', { name: /Registrar Venta Directa/i })
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // 7. Verificar que en la tabla del historial figure la columna de Costo Producción
    const costHeader = page.locator('th', { hasText: /Costo Producci/i })
    await expect(costHeader).toBeVisible({ timeout: 10000 })
  })
})
