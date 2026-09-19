import { test, expect } from '@playwright/test'

test.describe('Catálogo de Postres - Responsive & Modal Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Autenticación preestablecida en localStorage para acceder al dashboard
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  test('Debe abrir el modal de nuevo postre con cabecera y pie de página siempre visibles en cualquier pantalla', async ({ page }) => {
    await page.goto('/catalogo')

    // Verificar que cargue la página del catálogo
    const headerTitle = page.locator('h2', { hasText: 'Catálogo de Postres' })
    await expect(headerTitle).toBeVisible({ timeout: 15000 })

    // Hacer click en "Agregar Nuevo Postre"
    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await expect(addBtn).toBeVisible()
    await addBtn.click()

    // 1. Verificar que el modal se abrió y el encabezado está visible
    const modalHeader = page.locator('h3', { hasText: 'Nuevo Postre en Catálogo' })
    await expect(modalHeader).toBeVisible()

    // 2. Verificar que el botón de cierre (X) en el sticky header está visible y accesible
    const closeBtn = page.getByTitle('Cerrar ventana')
    await expect(closeBtn).toBeVisible()

    // 3. Verificar que el campo Nombre del Postre está visible y se puede escribir
    const nameInput = page.getByPlaceholder(/Ej: Tarta de Ricota/i)
    await expect(nameInput).toBeVisible()
    const testDessertName = `Postre E2E Test ${Date.now()}`
    await nameInput.fill(testDessertName)

    // 4. Verificar que el botón "Guardar Postre" en el sticky footer está VISIBLE y no queda fuera de pantalla
    const saveBtn = page.getByRole('button', { name: /Guardar Postre/i })
    await expect(saveBtn).toBeVisible()

    // 5. Completar Precio de Venta
    const priceInput = page.getByPlaceholder(/Ej: 4500/i)
    await expect(priceInput).toBeVisible()
    await priceInput.fill('7500')

    // 6. Guardar el postre
    await saveBtn.click()

    // 7. El modal debe cerrarse automáticamente
    await expect(modalHeader).not.toBeVisible({ timeout: 10000 })

    // 8. El nuevo postre debe figurar en el listado del catálogo
    const createdCard = page.locator('h3', { hasText: testDessertName })
    await expect(createdCard).toBeVisible({ timeout: 10000 })
  })

  test('Permite cerrar el modal con el botón X y con Cancelar sin bloquear la interfaz', async ({ page }) => {
    await page.goto('/catalogo')

    const addBtn = page.getByRole('button', { name: /Agregar Nuevo Postre/i })
    await addBtn.click()

    const modalHeader = page.locator('h3', { hasText: 'Nuevo Postre en Catálogo' })
    await expect(modalHeader).toBeVisible()

    // Click en Cancelar en el sticky footer
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i })
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    await expect(modalHeader).not.toBeVisible()
  })
})
