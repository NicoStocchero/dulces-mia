import { test, expect } from '@playwright/test'

test.describe('Integridad Visual y Geométrica de la Interfaz (UI Geometry & Zero Overflow)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  const coreRoutes = [
    '/catalogo',
    '/ventas',
    '/pedidos',
    '/clientes',
    '/gastos',
    '/insumos',
    '/recetas',
    '/resumen',
  ]

  for (const route of coreRoutes) {
    test(`Cero desborde horizontal (Zero Horizontal Scroll) en ruta "${route}"`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')

      // Verificar que el ancho de scroll del documento no supere el ancho de la ventana
      const isOverflowing = await page.evaluate(() => {
        const docEl = document.documentElement
        return docEl.scrollWidth > docEl.clientWidth + 2 // Tolerancia de 2px por redondeo subpixel
      })

      expect(isOverflowing).toBe(false)
    })
  }

  test('Geometría de Pantalla en Modal de Catálogo: Cabecera y Botones 100% adentro del Viewport', async ({ page }) => {
    await page.goto('/catalogo')

    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await expect(addBtn).toBeVisible({ timeout: 15000 })
    await addBtn.click()

    const modalHeader = page.locator('h3', { hasText: 'Nuevo Postre en Catálogo' })
    await expect(modalHeader).toBeVisible()

    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i })
    await expect(saveBtn).toBeVisible()
    await expect(cancelBtn).toBeVisible()

    const viewport = page.viewportSize()!
    const headerBox = await modalHeader.boundingBox()
    const saveBox = await saveBtn.boundingBox()
    const cancelBox = await cancelBtn.boundingBox()

    expect(headerBox).not.toBeNull()
    expect(saveBox).not.toBeNull()
    expect(cancelBox).not.toBeNull()

    // 1. La cabecera debe estar visible en la parte superior (>= 0 px)
    expect(headerBox!.y).toBeGreaterThanOrEqual(0)

    // 2. Los botones de Guardar y Cancelar deben estar completamente contenidos dentro de la altura de la pantalla
    expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(viewport.height)
    expect(cancelBox!.y + cancelBox!.height).toBeLessThanOrEqual(viewport.height)

    // 3. El botón Guardar no puede tener coordenada Y menor a 0
    expect(saveBox!.y).toBeGreaterThanOrEqual(0)
  })

  test('Oclusión de Capas (Z-Index Defense): El botón de guardar es el elemento superior clickeable', async ({ page }) => {
    await page.goto('/catalogo')

    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await addBtn.click()

    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await expect(saveBtn).toBeVisible()

    // Evaluar que en las coordenadas centrales del botón, el elemento superior sea el propio botón o uno de sus hijos
    const isTopMost = await saveBtn.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const topEl = document.elementFromPoint(centerX, centerY)
      return el === topEl || el.contains(topEl)
    })

    expect(isTopMost).toBe(true)

    // Cerrar modal
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i })
    await cancelBtn.click()
  })

  test('Estrés de Layout con Nombre Ultra-Largo de 80 Caracteres', async ({ page }) => {
    await page.goto('/catalogo')

    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await addBtn.click()

    const longDessertName = `Torta Imperial ${Date.now()} Selva Negra Edición Especial con Frutillas y Moras 80 Caracteres`
    const nameInput = page.getByPlaceholder(/Ej: Tarta de Ricota/i)
    await nameInput.fill(longDessertName)

    const priceInput = page.getByPlaceholder(/Ej: 4500/i)
    await priceInput.fill('15000')

    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await saveBtn.click()

    // El postre largo debe renderizarse sin romper el ancho de su tarjeta
    const card = page.locator('h3', { hasText: longDessertName })
    await expect(card).toBeVisible({ timeout: 10000 })

    const isCardOverflowing = await card.evaluate((el) => {
      const container = el.closest('div')
      if (!container) return false
      return container.scrollWidth > container.clientWidth + 5
    })

    expect(isCardOverflowing).toBe(false)
  })
})
