// Universal Gemini 2.5 Flash Vision AI Scanner para Sol Postres
// Detecta automáticamente si la foto es: TICKET_COMPRA, LOTE_POSTRES o NOTA_PEDIDO

import { compressImageForGemini } from '@/lib/gemini'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyCilWSQmicwqlHF5oaPu3qGRmscTmZ2bv8'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

export type UniversalScanResult = {
  type: 'RECEIPT' | 'PRODUCTION_BATCH' | 'ORDER_NOTE' | 'UNKNOWN'
  summary: string
  receipt_data?: {
    merchant_name: string
    total_amount: number
    items: Array<{ name: string; quantity: number; unit: string; price: number }>
  }
  batch_data?: {
    total_count: number
    desserts: Array<{ product_name: string; count: number; container_type?: string }>
  }
  order_data?: {
    customer_name: string
    product_name: string
    quantity: number
    total_price: number
    delivery_date?: string
    notes?: string
  }
}

export async function analyzeUniversalImage(base64Image: string): Promise<UniversalScanResult> {
  const cleanBase64 = await compressImageForGemini(base64Image, 1600)

  const jsonSchema = {
    type: 'OBJECT',
    properties: {
      type: { type: 'STRING', description: 'RECEIPT (ticket de compra), PRODUCTION_BATCH (postres en la mesada), ORDER_NOTE (nota o captura de pedido) o UNKNOWN' },
      summary: { type: 'STRING', description: 'Resumen descriptivo corto de lo que la IA detectó en la imagen' },
      receipt_data: {
        type: 'OBJECT',
        properties: {
          merchant_name: { type: 'STRING' },
          total_amount: { type: 'NUMBER' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                quantity: { type: 'NUMBER' },
                unit: { type: 'STRING' },
                price: { type: 'NUMBER' }
              },
              required: ['name', 'price']
            }
          }
        }
      },
      batch_data: {
        type: 'OBJECT',
        properties: {
          total_count: { type: 'NUMBER' },
          desserts: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                product_name: { type: 'STRING' },
                count: { type: 'NUMBER' },
                container_type: { type: 'STRING' }
              },
              required: ['product_name', 'count']
            }
          }
        }
      },
      order_data: {
        type: 'OBJECT',
        properties: {
          customer_name: { type: 'STRING' },
          product_name: { type: 'STRING' },
          quantity: { type: 'NUMBER' },
          total_price: { type: 'NUMBER' },
          delivery_date: { type: 'STRING' },
          notes: { type: 'STRING' }
        }
      }
    },
    required: ['type', 'summary']
  }

  const prompt = `Eres la Inteligencia Visión Universal de la pastelería artesanal "Dulces Mía".
Analiza minuciosamente esta fotografía recibida:

1. Si ves un TICKET / FACTURA de compra de insumos:
   - type = "RECEIPT"
   - Extrae proveedor, total pagado y lista de insumos comprados.

2. Si ves POSTRES en la mesada de la cocina (potes plásticos transparentes de 250cc, tartas, alfajores, cajas de mini postres):
   - type = "PRODUCTION_BATCH"
   - Identifica el tipo de postre (Chocotorta en Pote, Postre Oreo en Pote, Tarta Cabsha, Mini Cajas) y la CANTIDAD EXACTA producida.

3. Si ves una ANOTACIÓN DE PEDIDO, comanda en papel o captura de pantalla de chat:
   - type = "ORDER_NOTE"
   - Extrae el nombre del cliente, producto encargado, cantidad, precio pactado y fecha de entrega.

Sé hiper preciso en tu análisis.`

  try {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: 'application/json',
          response_schema: jsonSchema
        }
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini Universal Vision Error:', errText)
      throw new Error(`Error en Gemini Vision API: ${res.statusText}`)
    }

    const data = await res.json()
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textOutput) throw new Error('No se recibió respuesta de Gemini AI')

    const clean = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim()
    const firstBrace = clean.indexOf('{')
    const lastBrace = clean.lastIndexOf('}')
    const jsonStr = (firstBrace !== -1 && lastBrace > firstBrace) ? clean.substring(firstBrace, lastBrace + 1) : clean

    return JSON.parse(jsonStr) as UniversalScanResult
  } catch (err: any) {
    console.error('Error en escáner universal:', err)
    return {
      type: 'UNKNOWN',
      summary: 'No se pudo clasificar la imagen de forma automática.'
    }
  }
}
