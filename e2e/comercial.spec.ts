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

    // 2. Alternar a Pedido Anticipado de forma reactiva a hidratación
    const mostradorTab = page.getByRole('button', { name: /Venta Mostrador/i })
    const pedidoTab = page.getByRole('button', { name: /Pedido Anticipado/i })
    await expect(mostradorTab).toBeVisible()
    await expect(pedidoTab).toBeVisible()

    await expect(async () => {
      await pedidoTab.click()
      await expect(page.getByText('Fecha de Entrega')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 10000 })

    // Alternar de vuelta a Venta Mostrador
    await expect(async () => {
      await mostradorTab.click()
      await expect(page.getByText('Estado de Cobro')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 10000 })

    // 3. Probar Modal de Alta Rápida de Cliente (+ Agregar nuevo cliente)
    const addCustBtn = page.getByRole('button', { name: /Agregar nuevo cliente/i })
    await expect(addCustBtn).toBeVisible()
    await addCustBtn.click()

    const quickCustModal = page.locator('h3', { hasText: 'Agregar Cliente al CRM' })
    await expect(quickCustModal).toBeVisible()

    const testCustName = `Cliente E2E ${Date.now()}`
    await page.getByTestId('quick-cust-name').fill(testCustName)

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

  test('Encargo a medida: permite ingresar encargo personalizado, precio acordado y costo estimado, calculando seña del 50%', async ({ page }) => {
    await page.goto('/ventas')
    await expect(page.locator('h2', { hasText: 'Módulo Comercial Unificado' })).toBeVisible({ timeout: 15000 })

    // 1. Cambiar a modo Pedido Anticipado asegurando hidratación completa
    const pedidoTab = page.getByRole('button', { name: /Pedido Anticipado/i })
    await expect(async () => {
      await pedidoTab.click()
      await expect(page.getByText('Fecha de Entrega')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 10000 })

    // 2. Crear cliente rápido con teléfono para vincularlo
    const addCustBtn = page.getByRole('button', { name: /Agregar nuevo cliente/i })
    await addCustBtn.click()

    const uniqueId = Date.now().toString().slice(-4)
    const custName = `Valentina Medida ${uniqueId}`
    await page.getByTestId('quick-cust-name').fill(custName)
    await page.getByTestId('quick-cust-phone').fill('1145678901')
    await page.getByRole('button', { name: /Guardar y Vincular/i }).click()
    await expect(page.locator('h3', { hasText: 'Agregar Cliente al CRM' })).not.toBeVisible()

    // 3. Escribir nombre de encargo a medida
    const customInput = page.getByTestId('custom-product-name')
    await customInput.fill('Torta Temática Sirenita 3kg')

    // 4. Completar Precio Unitario Acordado y Costo Estimado
    const priceInput = page.getByTestId('custom-product-price')
    await expect(priceInput).toBeVisible()
    await priceInput.fill('40000')

    const costInput = page.getByTestId('custom-product-cost')
    await costInput.fill('16000')

    // 5. Verificar cálculo automático de desglose financiero ($40.000 - $16.000 = $24.000)
    await expect(page.locator('text=Desglose Financiero de la Operación')).toBeVisible()
    await expect(page.locator('span', { hasText: '$40.000' }).first()).toBeVisible()
    await expect(page.locator('span', { hasText: '$16.000' }).first()).toBeVisible()
    await expect(page.locator('span', { hasText: '$24.000' }).first()).toBeVisible()

    // 6. Probar botón de Seña 50%
    const btn50 = page.getByRole('button', { name: /50%/i })
    await btn50.click()

    // Resta cobrar debe reflejar $20.000
    await expect(page.locator('text=$20.000').first()).toBeVisible()

    // 7. Seleccionar Fecha de Entrega
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    await page.getByTestId('delivery-date-input').fill(tomorrow)

    // 8. Agendar Pedido
    await page.getByRole('button', { name: /Agendar Pedido/i }).click()

    // 9. Verificar que se muestre el toast de éxito
    await expect(page.locator(`text=Pedido agendado a nombre de ${custName}`)).toBeVisible({ timeout: 10000 })

    // 10. Cambiar a vista de Tarjetas Pedidos y comprobar que la tarjeta muestre el saldo y seña
    const tarjetasBtn = page.getByRole('button', { name: /Tarjetas Pedidos/i })
    await tarjetasBtn.click()

    const orderCard = page.locator('[data-testid="order-card"]', { hasText: custName }).first()
    await expect(orderCard).toBeVisible()
    await expect(orderCard).toContainText('Torta Temática Sirenita 3kg')
    await expect(orderCard).toContainText('$40.000')
    await expect(orderCard).toContainText('Seña abonada: $20.000')
    await expect(orderCard).toContainText('Saldo pendiente: $20.000')
  })

  test('Validaciones estrictas de Pedido Anticipado: bloquea cliente faltante, fecha vacía y seña excesiva', async ({ page }) => {
    await page.goto('/ventas')
    await expect(page.locator('h2', { hasText: 'Módulo Comercial Unificado' })).toBeVisible({ timeout: 15000 })

    // 1. Cambiar a modo Pedido Anticipado asegurando hidratación completa
    const pedidoTab = page.getByRole('button', { name: /Pedido Anticipado/i })
    await expect(async () => {
      await pedidoTab.click()
      await expect(page.getByText('Fecha de Entrega')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 10000 })

    // 2. Escribir encargo con precio pero SIN cliente CRM (Consumidor Final)
    const customInput = page.getByTestId('custom-product-name')
    await customInput.fill('Muffins Personalizados x24')
    await page.getByTestId('custom-product-price').fill('15000')

    // Intentar registrar sin cliente seleccionado
    await page.getByRole('button', { name: /Agendar Pedido/i }).click()
    await expect(page.getByText('Para un pedido anticipado seleccioná o creá el cliente en el CRM')).toBeVisible()

    // 3. Crear cliente rápido
    await page.getByRole('button', { name: /Agregar nuevo cliente/i }).click()
    const testName = `Cliente Valida ${Date.now().toString().slice(-4)}`
    await page.getByTestId('quick-cust-name').fill(testName)
    await page.getByRole('button', { name: /Guardar y Vincular/i }).click()
    await expect(page.locator('h3', { hasText: 'Agregar Cliente al CRM' })).not.toBeVisible()

    // 4. Intentar registrar sin fecha de entrega
    await page.getByRole('button', { name: /Agendar Pedido/i }).click()
    await expect(page.getByText('Ingresá la fecha de entrega del pedido')).toBeVisible()

    // 5. Cargar fecha pero con Seña mayor al precio ($20.000 > $15.000)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    await page.getByTestId('delivery-date-input').fill(tomorrow)
    await page.getByTestId('deposit-input').fill('20000')

    await page.getByRole('button', { name: /Agendar Pedido/i }).click()
    await expect(page.getByText('La seña no puede ser mayor al precio total del pedido')).toBeVisible()
  })

  test('Acción Compartir WhatsApp de Presupuesto: formatea teléfono con 549 y texto con detalles', async ({ page }) => {
    await page.goto('/ventas')
    await expect(page.locator('h2', { hasText: 'Módulo Comercial Unificado' })).toBeVisible({ timeout: 15000 })

    // Espiar window.open
    await page.evaluate(() => {
      ;(window as any).__openedUrls = []
      window.open = (url?: string | URL) => {
        if (url) (window as any).__openedUrls.push(url.toString())
        return null
      }
    })

    // Cambiar a Pedido Anticipado asegurando hidratación completa
    const pedidoTab = page.getByRole('button', { name: /Pedido Anticipado/i })
    await expect(async () => {
      await pedidoTab.click()
      await expect(page.getByText('Fecha de Entrega')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 10000 })

    await page.getByRole('button', { name: /Agregar nuevo cliente/i }).click()
    const custName = `WhatsApp Test ${Date.now().toString().slice(-4)}`
    await page.getByTestId('quick-cust-name').fill(custName)
    await page.getByTestId('quick-cust-phone').fill('1155667788')
    await page.getByRole('button', { name: /Guardar y Vincular/i }).click()
    await expect(page.locator('h3', { hasText: 'Agregar Cliente al CRM' })).not.toBeVisible()

    // Seleccionar postre del catálogo
    const dessertSelect = page.locator('select').nth(1)
    await dessertSelect.selectOption({ index: 1 })

    // Seña 50% y fecha
    await page.getByRole('button', { name: /50%/i }).click()
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    await page.getByTestId('delivery-date-input').fill(tomorrow)

    // Agendar
    await page.getByRole('button', { name: /Agendar Pedido/i }).click()
    await expect(page.locator(`text=Pedido agendado a nombre de ${custName}`)).toBeVisible({ timeout: 10000 })

    // Ir a vista Tarjetas Pedidos
    await page.getByRole('button', { name: /Tarjetas Pedidos/i }).click()

    // Encontrar la tarjeta del cliente recién agendado y hacer click en el botón WhatsApp
    const orderCard = page.locator('[data-testid="order-card"]', { hasText: custName }).first()
    await expect(orderCard).toBeVisible()
    const waBtn = orderCard.getByTestId('order-card-wa-btn')
    await expect(waBtn).toBeVisible()
    await waBtn.click()

    // Verificar URL capturada por window.open
    const openedUrls = await page.evaluate(() => (window as any).__openedUrls)
    expect(openedUrls.length).toBeGreaterThan(0)
    const waUrl = openedUrls[0]

    // Debe contener el prefijo internacional argentino 549 y el número sin 15
    expect(waUrl).toContain('https://wa.me/5491155667788')
    expect(waUrl).toContain(encodeURIComponent('DULCES MÍA - Presupuesto & Encargo'))
    expect(waUrl).toContain(encodeURIComponent(custName))
  })
})
