import { test, expect } from '@playwright/test'

test.describe('Ciclo de Vida de Pedidos, Señas y UX Táctil - E2E Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  test('Flujo Completo de Pedido con Seña, Saldo Pendiente, Entrega & Cobro y Pase a Venta', async ({ page }) => {
    await page.goto('/pedidos')

    // 1. Validar carga del módulo en modo Pedido Anticipado
    await expect(page.locator('h2', { hasText: 'Módulo Comercial Unificado' })).toBeVisible({ timeout: 15000 })
    const submitBtn = page.getByRole('button', { name: /Agendar Pedido/i })
    await expect(submitBtn).toBeVisible()

    // 2. Alta rápida de cliente para evitar anonimato y testear CRM
    const addCustBtn = page.getByRole('button', { name: /Agregar nuevo cliente/i })
    await expect(addCustBtn).toBeVisible()
    await addCustBtn.click()

    const quickCustModal = page.locator('h3', { hasText: 'Agregar Cliente al CRM' })
    await expect(quickCustModal).toBeVisible()

    const testCustName = `Cliente E2E Entrega ${Date.now()}`
    await page.getByTestId('quick-cust-name').fill(testCustName)
    const saveCustBtn = page.getByRole('button', { name: /Guardar y Vincular/i })
    await saveCustBtn.click()
    await expect(quickCustModal).not.toBeVisible()

    // 3. Seleccionar postre del catálogo
    const dessertSelect = page.locator('select').nth(1)
    await dessertSelect.selectOption({ index: 1 })

    // 4. Completar Fecha de Entrega
    const deliveryInput = page.getByTestId('delivery-date-input')
    await expect(deliveryInput).toBeVisible()
    await deliveryInput.fill('2026-10-25')

    // 5. Aplicar atajo de seña del 50%
    const deposit50Btn = page.getByRole('button', { name: /50%/i })
    await expect(deposit50Btn).toBeVisible()
    await deposit50Btn.click()

    // 6. Verificar desglose de saldo a cobrar al entregar
    await expect(page.getByText('Resta Cobrar al Entregar')).toBeVisible()

    // 7. Agendar el pedido
    await submitBtn.click()

    // 8. Verificar que aparezca en la lista de Próximas Entregas con el cliente correspondiente
    const deliverBtn = page.getByRole('button', { name: /✓ Cobrar/i }).first()
    await expect(deliverBtn).toBeVisible({ timeout: 10000 })
    await expect(page.locator('span', { hasText: testCustName }).first()).toBeVisible()

    // 9. Entregar y cobrar el pedido
    await deliverBtn.click()

    // 10. Verificar que el pedido ya no esté en la lista activa de Próximas Entregas
    await expect(page.locator('text=Próximas Entregas').locator(`text=${testCustName}`)).not.toBeVisible({ timeout: 10000 })

    // 11. Cambiar a la vista "Tabla de Ventas" y comprobar el impacto contable
    const tablaVentasBtn = page.getByRole('button', { name: /Tabla de Ventas/i })
    if (await tablaVentasBtn.isVisible()) {
      await tablaVentasBtn.click()
    }

    // 12. Verificar que figure la venta registrada a nombre del cliente con estado Cobrado
    const saleRow = page.locator('tr', { hasText: testCustName })
    await expect(saleRow.first()).toBeVisible({ timeout: 10000 })
    await expect(saleRow.first()).toContainText('Cobrado')
  })

  test('UX Táctil en Tablet con Teclado Virtual Abierto (Altura Reducida a 400px)', async ({ page }) => {
    await page.goto('/catalogo')

    // 1. Simular apertura del modal de nuevo postre
    const openBtn = page.getByRole('button', { name: /Nuevo Postre/i }).first()
    await expect(openBtn).toBeVisible({ timeout: 15000 })
    await openBtn.click()

    const modalTitle = page.locator('h3', { hasText: 'Nuevo Postre' })
    await expect(modalTitle).toBeVisible()

    // 2. Simular aparición del teclado virtual reduciendo la altura a 400px
    await page.setViewportSize({ width: 768, height: 400 })

    // 3. El botón X de cerrar superior debe seguir siendo visible
    const closeBtn = page.getByRole('button', { name: 'Cerrar ventana' })
    await expect(closeBtn).toBeVisible()

    // 4. El botón Guardar Postre en el Sticky Footer debe seguir visible y accesible
    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await expect(saveBtn).toBeVisible()

    // 5. El botón Cancelar debe responder al toque sin bloquear
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i })
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // El modal debe haberse cerrado limpiamente
    await expect(modalTitle).not.toBeVisible()
  })
})
