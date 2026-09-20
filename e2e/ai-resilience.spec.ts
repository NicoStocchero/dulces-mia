import { test, expect } from '@playwright/test'
import { parseGeminiJson } from '../lib/gemini'
import { parseVoiceHeuristics } from '../lib/voiceInterpreter'

test.describe('Sanitización y Parsing de Respuestas de Gemini AI (Vision & Data)', () => {
  test('Parsea correctamente JSON envuelto en bloques de código markdown ```json', () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: '```json\n{\n  "merchant_name": "Supermercado Coto",\n  "date": "2026-09-19",\n  "total_amount": 14500,\n  "items": []\n}\n```',
              },
            ],
          },
        },
      ],
    }

    const result = parseGeminiJson<{ merchant_name: string; total_amount: number }>(mockGeminiResponse)
    expect(result.merchant_name).toBe('Supermercado Coto')
    expect(result.total_amount).toBe(14500)
  })

  test('Parsea JSON plano sin markdown', () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: '{"detected_desserts": [{"name": "Chocotorta", "quantity": 3, "confidence": 0.95}]}',
              },
            ],
          },
        },
      ],
    }

    const result = parseGeminiJson<{ detected_desserts: any[] }>(mockGeminiResponse)
    expect(result.detected_desserts).toHaveLength(1)
    expect(result.detected_desserts[0].name).toBe('Chocotorta')
    expect(result.detected_desserts[0].quantity).toBe(3)
  })

  test('Lanza error seguro y descriptivo ante bloqueo de seguridad (finishReason: SAFETY) sin TypeError', () => {
    const mockBlockedResponse = {
      candidates: [
        {
          finishReason: 'SAFETY',
          content: { parts: [] },
        },
      ],
    }

    expect(() => parseGeminiJson(mockBlockedResponse)).toThrow(
      /filtros de seguridad/i
    )
  })

  test('Lanza error controlado ante candidates vacíos o respuesta nula sin crashear', () => {
    expect(() => parseGeminiJson({ candidates: [] })).toThrow(
      /no devolvió una respuesta/i
    )
    expect(() => parseGeminiJson(null)).toThrow(
      /no devolvió una respuesta/i
    )
    expect(() => parseGeminiJson({})).toThrow(
      /no devolvió una respuesta/i
    )
  })
})

test.describe('Motor Heurístico de Voz Offline (Kitchen Voice Rule Engine)', () => {
  test('Clasifica gastos con monto extraído automáticamente ("Gasté 8500 pesos en dulce de leche")', () => {
    const result = parseVoiceHeuristics('Gasté 8500 pesos en dulce de leche')
    expect(result.actions.length).toBeGreaterThan(0)
    const expense = result.actions.find(a => a.type === 'RECORD_EXPENSE')
    expect(expense).toBeDefined()
    expect(expense?.data.amount).toBe(8500)
    expect(result.speech_response).toContain('acción')
  })

  test('Clasifica pedidos con cantidad extraída ("Anotame un pedido de 2 tartas para el viernes")', () => {
    const result = parseVoiceHeuristics('Anotame un pedido de 2 tartas para el viernes')
    const order = result.actions.find(a => a.type === 'ADD_ORDER')
    expect(order).toBeDefined()
    expect(order?.data.quantity).toBe(2)
    expect(order?.data.product_name).toBe('Tarta Cabsha')
  })

  test('Clasifica envíos al local familiar ("Hice 5 postres oreo para enviar al local")', () => {
    const result = parseVoiceHeuristics('Hice 5 postres oreo para enviar al local')
    const delivery = result.actions.find(a => a.type === 'DELIVER_TO_FAMILY_STORE')
    expect(delivery).toBeDefined()
    expect(delivery?.data.quantity).toBe(5)
    expect(delivery?.data.product_name).toBe('Postre Oreo en Pote')
  })

  test('Clasifica insumos con conversión a gramos ("Compré 10kg de harina")', () => {
    const result = parseVoiceHeuristics('Compré 10kg de harina')
    const ing = result.actions.find(a => a.type === 'ADD_INGREDIENT')
    expect(ing).toBeDefined()
    expect(ing?.data.ingredient_name).toBe('Harina 0000')
    expect(ing?.data.quantity).toBe(10000) // 10 * 1000g
  })

  test('Tolera texto vacío o ruidos ininteligibles sin romper la app', () => {
    const resultEmpty = parseVoiceHeuristics('')
    expect(resultEmpty.actions).toBeDefined()
    expect(resultEmpty.speech_response).toBeDefined()

    const resultNoise = parseVoiceHeuristics('ahmm ehh shhh')
    expect(resultNoise.actions.length).toBeGreaterThan(0)
  })
})

test.describe('Interacción E2E con Modales de Asistente de Voz y Escáner Visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dulcesmia_auth_session', 'true')
    })
  })

  test('Asistente de Voz: Permite dictar o escribir orden manual, revisar acciones y confirmar antes de ejecutar', async ({ page }) => {
    await page.goto('/ventas')

    // 1. Abrir menú de acciones rápidas y activar el Asistente de Voz
    const fabBtn = page.getByLabel('Menú de acciones rápidas')
    await expect(fabBtn).toBeVisible({ timeout: 10000 })
    await fabBtn.click()

    const voiceBtn = page.getByRole('button', { name: /Asistente de Voz/i })
    await expect(voiceBtn).toBeVisible({ timeout: 5000 })
    await voiceBtn.click()

    // 2. Verificar que el modal de voz abra
    const voiceModal = page.locator('h3', { hasText: 'Asistente de Voz' })
    await expect(voiceModal).toBeVisible({ timeout: 10000 })

    // 3. Escribir orden manual simulando dictado en cocina
    const textarea = page.locator('textarea[placeholder*="Hice"]')
    await expect(textarea).toBeVisible()
    await textarea.fill('Hice 5 postres oreo para enviar al local familiar')

    // 4. Click en Interpretar Dictado
    const interpretBtn = page.getByRole('button', { name: /Interpretar Dictado/i })
    await interpretBtn.click()

    // 5. Verificar que se muestre el Paso 2: Previsualización de acciones y solicitud de confirmación
    await expect(page.locator('text=Traslado a Local Familiar').or(page.locator('text=Acción'))).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=¿Está todo okay para registrar estas acciones en el sistema?')).toBeVisible()

    // 6. Probar botón "Modificar texto" para volver atrás sin perder contenido
    const modifyBtn = page.getByRole('button', { name: /Modificar texto/i })
    await expect(modifyBtn).toBeVisible()
    await modifyBtn.click()

    // Verificar que volvió a la vista de edición con el texto intacto
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveValue('Hice 5 postres oreo para enviar al local familiar')

    // 7. Volver a interpretar y confirmar ejecución
    await page.getByRole('button', { name: /Interpretar Dictado/i }).click()
    await expect(page.locator('text=¿Está todo okay para registrar estas acciones en el sistema?')).toBeVisible({ timeout: 15000 })
    
    const executeBtn = page.getByRole('button', { name: /Sí, Ejecutar/i })
    await expect(executeBtn).toBeVisible()
    await executeBtn.click()

    // El modal debe cerrarse tras ejecutar
    await expect(voiceModal).not.toBeVisible({ timeout: 10000 })
  })

  test('Escáner de Postres: Abre el modal de cámara fotográfica para la mesada', async ({ page }) => {
    await page.goto('/ventas')

    const scanBtn = page.getByRole('button', { name: /Reconocer Postres/i })
    await expect(scanBtn).toBeVisible({ timeout: 15000 })
    await scanBtn.click()

    const scanModal = page.locator('h3', { hasText: 'Reconocimiento Visual de Postres' })
    await expect(scanModal).toBeVisible()

    // Botón de cerrar X funcional
    const closeBtn = page.locator('button:has(.lucide-x)').last()
    await closeBtn.click()
    await expect(scanModal).not.toBeVisible()
  })
})
