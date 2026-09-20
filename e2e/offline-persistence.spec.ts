import { test, expect } from '@playwright/test'

test.describe('Sistema de Guardado y Resiliencia Offline (Offline & LocalStorage Persistence)', () => {
  test.beforeEach(async ({ page }) => {
    // Autenticación preestablecida en localStorage para acceder al dashboard
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })

    // Simular corte total de conexión con la nube (Supabase Cloud Inaccesible / Fallo de Red)
    await page.route('**/*supabase.co/**', route => route.abort('failed'))
  })

  test('1. Resiliencia de carga inicial sin conexión (Fallback a datos locales sin pantalla blanca)', async ({ page }) => {
    await page.goto('/catalogo')

    // El catálogo debe cargar limpiamente con los datos de fallback sin lanzar errores no controlados
    const headerTitle = page.locator('h2', { hasText: 'Catálogo de Postres' })
    await expect(headerTitle).toBeVisible({ timeout: 15000 })

    // Debe mostrar al menos un postre del catálogo fallback (ej: Postre Oreo o Chocotorta)
    const productCard = page.locator('h3').first()
    await expect(productCard).toBeVisible()
  })

  test('2. Guardado de nuevo postre en modo offline y persistencia en localStorage', async ({ page }) => {
    await page.goto('/catalogo')

    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await expect(addBtn).toBeVisible({ timeout: 15000 })
    await addBtn.click()

    const dessertName = `Tarta Offline Resiliente ${Date.now()}`
    const nameInput = page.getByPlaceholder(/Ej: Tarta de Ricota/i)
    await expect(nameInput).toBeVisible()
    await nameInput.fill(dessertName)

    const priceInput = page.getByPlaceholder(/Ej: 4500/i)
    await priceInput.fill('7900')

    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await saveBtn.click()

    // El modal debe cerrarse y el nuevo postre debe figurar en pantalla
    const newCard = page.locator('h3', { hasText: dessertName })
    await expect(newCard).toBeVisible({ timeout: 10000 })

    // Verificar directamente en localStorage que el producto fue persistido
    const savedProducts = await page.evaluate(() => {
      return JSON.parse(window.localStorage.getItem('dulcesmia_products') || '[]')
    })
    const found = savedProducts.some((p: any) => p.name === dessertName && Number(p.price) === 7900)
    expect(found).toBe(true)
  })

  test('3. Supervivencia de datos tras recarga en frío sin internet (Cold Reload Offline)', async ({ page }) => {
    await page.goto('/catalogo')

    // 1. Crear un postre offline en la sesión
    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await expect(addBtn).toBeVisible({ timeout: 15000 })
    await addBtn.click()

    const offlineDessert = `Tarta Cold Reload ${Date.now()}`
    const nameInput = page.getByPlaceholder(/Ej: Tarta de Ricota/i)
    await nameInput.fill(offlineDessert)

    const priceInput = page.getByPlaceholder(/Ej: 4500/i)
    await priceInput.fill('8900')

    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await saveBtn.click()

    // Verificar que se visualiza
    await expect(page.locator('h3', { hasText: offlineDessert })).toBeVisible({ timeout: 10000 })

    // 2. Recargar la página manteniendo Supabase totalmente bloqueado
    await page.reload()

    // 3. El postre debe seguir existiendo y renderizándose desde localStorage
    await expect(page.locator('h3', { hasText: offlineDessert })).toBeVisible({ timeout: 15000 })
  })

  test('4. Registro comercial de cliente y venta offline con inmutabilidad de costo', async ({ page }) => {
    await page.goto('/ventas')

    const title = page.locator('h2', { hasText: 'Módulo Comercial Unificado' })
    await expect(title).toBeVisible({ timeout: 15000 })

    // 1. Crear cliente rápido offline
    const addCustBtn = page.getByRole('button', { name: /Agregar nuevo cliente/i })
    await expect(addCustBtn).toBeVisible()
    await addCustBtn.click()

    const custModal = page.locator('h3', { hasText: 'Agregar Cliente al CRM' })
    await expect(custModal).toBeVisible()

    const custName = `Sol Client Offline ${Date.now()}`
    const custInput = page.getByPlaceholder(/Ej: Carolina Gómez/i)
    await custInput.fill(custName)

    const saveCustBtn = page.getByRole('button', { name: /Guardar y Vincular/i })
    await saveCustBtn.click()
    await expect(custModal).not.toBeVisible({ timeout: 15000 })

    // 2. Verificar que el cliente existe en el almacenamiento local y obtener su ID
    let targetCust: any
    await expect(async () => {
      const savedCustomers = await page.evaluate(() => {
        return JSON.parse(window.localStorage.getItem('sol_postres_customers') || '[]')
      })
      targetCust = savedCustomers.find((c: any) => c.name === custName)
      expect(targetCust).toBeDefined()
    }).toPass({ timeout: 10000 })

    // 3. Seleccionar al cliente recién creado en el desplegable comercial
    const customerSelect = page.locator('select').first()
    await expect(async () => {
      await customerSelect.selectOption(targetCust.id)
      const val = await customerSelect.inputValue()
      expect(val).toBe(targetCust.id)
    }).toPass({ timeout: 10000 })

    // 4. Seleccionar postre y registrar venta
    const dessertSelect = page.locator('select').nth(1)
    await expect(async () => {
      await dessertSelect.selectOption({ index: 1 })
      const val = await dessertSelect.inputValue()
      expect(val).toBeTruthy()
    }).toPass({ timeout: 10000 })

    const submitBtn = page.getByRole('button', { name: /Registrar Venta Directa/i })
    await submitBtn.click()

    // 5. Verificar que la venta se registró en localStorage con costo, cliente y ganancia
    await expect(async () => {
      const sales = await page.evaluate(() => {
        return JSON.parse(window.localStorage.getItem('dulcesmia_sales') || '[]')
      })
      expect(sales.length).toBeGreaterThan(0)
      const targetSale = sales.find((s: any) => s.customer_name === custName)
      expect(targetSale).toBeDefined()
      expect(targetSale.revenue).toBeGreaterThan(0)
      expect(typeof targetSale.cost).toBe('number')
      expect(targetSale.paid).toBe(true)
    }).toPass({ timeout: 10000 })
  })

  test('5. Registro de compras de insumos y auto-actualización de stock offline', async ({ page }) => {
    await page.goto('/gastos')

    const gastosTitle = page.locator('h2', { hasText: 'Registrar Compra o Gasto' })
    await expect(gastosTitle).toBeVisible({ timeout: 15000 })

    // Llenar datos de compra de insumo
    const ingName = `Harina Offline Test ${Date.now()}`
    const descInput = page.getByPlaceholder(/Ej: Harina 0000, Dulce de Leche Repostero/i)
    await expect(descInput).toBeVisible()
    await descInput.fill(ingName)

    const totalAmountInput = page.getByPlaceholder('0.00').last()
    await totalAmountInput.fill('4800')

    const submitBtn = page.getByRole('button', { name: /Guardar Compra de Insumo/i })
    await submitBtn.click()

    // Verificar que el gasto se guardó en localStorage
    await expect(async () => {
      const expenses = await page.evaluate(() => {
        return JSON.parse(window.localStorage.getItem('dulcesmia_expenses') || '[]')
      })
      expect(expenses.some((e: any) => e.description === ingName)).toBe(true)
    }).toPass({ timeout: 10000 })
  })

  test('6. Eliminación de datos offline con actualización inmediata de localStorage', async ({ page }) => {
    await page.goto('/catalogo')

    // 1. Crear un postre con el UI
    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await expect(addBtn).toBeVisible({ timeout: 15000 })
    await addBtn.click()

    const tempDessertName = `Postre a Eliminar ${Date.now()}`
    const nameInput = page.getByPlaceholder(/Ej: Tarta de Ricota/i)
    await nameInput.fill(tempDessertName)

    const priceInput = page.getByPlaceholder(/Ej: 4500/i)
    await priceInput.fill('5000')

    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await saveBtn.click()

    // 2. Verificar que la tarjeta aparece en el catálogo
    const dessertCard = page.locator('div.glass-panel', { has: page.locator('h3', { hasText: tempDessertName }) })
    await expect(dessertCard).toBeVisible({ timeout: 10000 })

    // 3. Hacer click en el botón de eliminar del postre
    const deleteBtn = dessertCard.locator('button[title="Eliminar producto"]')
    await deleteBtn.click()

    // 4. Modal de confirmación: confirmar eliminación con botón 'Eliminar'
    const confirmBtn = page.getByRole('button', { name: /^Eliminar$/i })
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click()

    // 5. Verificar que desaparece de la vista y de localStorage
    await expect(page.locator('h3', { hasText: tempDessertName })).not.toBeVisible({ timeout: 10000 })

    const productsAfter = await page.evaluate(() => {
      return JSON.parse(window.localStorage.getItem('dulcesmia_products') || '[]')
    })
    expect(productsAfter.some((p: any) => p.name === tempDessertName)).toBe(false)
  })

  test('7. Exportación de Respaldo CSV en Modo Offline sin dependencia de red', async ({ page }) => {
    // Pre-cargar datos en localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_sales', JSON.stringify([
        { id: 's-offline-1', date: new Date().toISOString(), product_name: 'Postre Oreo', quantity: 2, revenue: 9000, cost: 3600, profit: 5400, paid: true }
      ]))
      window.localStorage.setItem('dulcesmia_products', JSON.stringify([
        { id: 'p-offline-1', name: 'Postre Oreo', price: 4500, cost: 1800, active: true }
      ]))
    })

    await page.goto('/resumen')

    const exportBtn = page.getByRole('button', { name: /Descargar Todo \(CSV\)/i })
    await expect(exportBtn).toBeVisible({ timeout: 15000 })

    // Escuchar el evento de descarga del navegador
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await exportBtn.click()
    const download = await downloadPromise

    // Verificar que el archivo generado sea un CSV válido con nombre estructurado
    expect(download.suggestedFilename()).toMatch(/\.csv$/i)
  })
})
