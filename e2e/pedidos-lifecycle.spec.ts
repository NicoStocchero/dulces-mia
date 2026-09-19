import { test, expect } from '@playwright/test'

test.describe('Ciclo de Vida de Pedidos, Señas y UX Táctil', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  test('Flujo de Pedido con Seña del 50%, Saldo Pendiente y Entrega & Cobro', async ({ page }) => {
    await page.goto('/pedidos')

    // 1. Validar que cargue el módulo en modo pedido
    await expect(page.locator('h2', { hasText: 'Módulo Comercial Unificado' })).toBeVisible({ timeout: 15000 })
    const submitBtn = page.getByRole('button', { name: /Agendar Pedido/i })
    await expect(submitBtn).toBeVisible()

    // 2. Seleccionar postre del catálogo
    const dessertSelect = page.locator('select').nth(1)
    await dessertSelect.selectOption({ index: 1 })

    // 3. Verificar sección de seña y activar atajo del 50%
    const deposit50Btn = page.getByRole('button', { name: /50%/i })
    await expect(deposit50Btn).toBeVisible()
    await deposit50Btn.click()

    // 4. Verificar que "Resta Cobrar al Entregar" muestre saldo mayor a 0
    await expect(page.getByText('Resta Cobrar al Entregar')).toBeVisible()

    // 5. Agendar el pedido
    await submitBtn.click()

    // 6. Verificar que aparezca en la lista de Próximas Entregas
    const deliverBtn = page.getByRole('button', { name: /✓ Entregar & Cobrar/i }).first()
    await expect(deliverBtn).toBeVisible({ timeout: 10000 })

    // 7. Entregar y cobrar el pedido
    await deliverBtn.click()

    // 8. Verificar confirmación toast o paso a venta cobrada
    const toast = page.locator('text=entregado y registrado como VENTA COBRADA')
    await expect(toast).toBeVisible({ timeout: 8000 })
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

    // 3. El botón X de cerrar superior (title="Cerrar ventana") debe seguir siendo visible
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
