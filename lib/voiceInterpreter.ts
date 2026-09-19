// Voice AI Command Interpreter para Sol Postres v5.0

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyCilWSQmicwqlHF5oaPu3qGRmscTmZ2bv8'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

export type InterpretedAction = {
  type: 'RECORD_EXPENSE' | 'DELIVER_TO_FAMILY_STORE' | 'ADD_ORDER' | 'RECORD_SALE' | 'ADD_INGREDIENT' | 'UNKNOWN'
  data: any
}

export type VoiceInterpreterResult = {
  actions: InterpretedAction[]
  speech_response: string
}

export async function interpretVoiceCommand(spokenText: string): Promise<VoiceInterpreterResult> {
  const jsonSchema = {
    type: 'OBJECT',
    properties: {
      actions: {
        type: 'ARRAY',
        description: 'Acciones a ejecutar en la app',
        items: {
          type: 'OBJECT',
          properties: {
            type: { type: 'STRING', description: 'RECORD_EXPENSE, DELIVER_TO_FAMILY_STORE, ADD_ORDER, RECORD_SALE, ADD_INGREDIENT o UNKNOWN' },
            data: {
              type: 'OBJECT',
              properties: {
                description: { type: 'STRING' },
                amount: { type: 'NUMBER' },
                expense_type: { type: 'STRING' },
                product_name: { type: 'STRING' },
                customer_name: { type: 'STRING' },
                quantity: { type: 'NUMBER' },
                price: { type: 'NUMBER' },
                ingredient_name: { type: 'STRING' }
              }
            }
          },
          required: ['type', 'data']
        }
      },
      speech_response: { type: 'STRING', description: 'Mensaje amigable de confirmación para Sol' }
    },
    required: ['actions', 'speech_response']
  }

  const prompt = `Eres el Asistente de Voz Inteligente de la pastelería "Dulces Mía" de Sol.
Interpreta este comando de voz dictado por Sol en la cocina: "${spokenText}".

Analiza la frase completa. Sol puede relatar secuencias complejas de cocina de múltiples pasos en una sola oración.
Debes desglosar la frase en TODAS las acciones individuales correspondientes:

1. TRASLADOS AL LOCAL FAMILIAR (DELIVER_TO_FAMILY_STORE):
   - Ej: "hice 5 postres de Oreo y 2 chocotortas para enviar al local"
   - Genera una acción por cada postre trasmitido: { type: "DELIVER_TO_FAMILY_STORE", data: { product_name: "Postre Oreo en Pote", quantity: 5 } } y otra con { type: "DELIVER_TO_FAMILY_STORE", data: { product_name: "Chocotorta en Pote", quantity: 2 } }.

2. VENTAS COBRADAS (RECORD_SALE):
   - Ej: "y de esos ya cobré uno", "vendí 3 alfajores"
   - Genera una acción: { type: "RECORD_SALE", data: { product_name: "Postre Oreo en Pote", quantity: 1, price: 4500 } }.

3. AGENDAR PEDIDOS (ADD_ORDER):
   - Ej: "anotame un pedido de 2 tartas para el viernes" -> { type: "ADD_ORDER", data: { customer_name: "Cliente Dictado", product_name: "Tarta Cabsha", quantity: 2 } }.

4. REGISTRAR GASTOS (RECORD_EXPENSE):
   - Ej: "gasté 5000 en dulce de leche" -> { type: "RECORD_EXPENSE", data: { description: "Dulce de Leche", amount: 5000, expense_type: "Variable" } }.

5. INSUMOS / COMPRAS DE MATERIA PRIMA (ADD_INGREDIENT):
   - Ej: "compré 10kg de harina" -> { type: "ADD_INGREDIENT", data: { ingredient_name: "Harina 0000", quantity: 10000, amount: 4500 } }.

Proporciona un speech_response cálido, claro y entusiasta que confirme en lenguaje natural a Sol exactamente todo lo que se registró.`

  try {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: 'application/json',
          response_schema: jsonSchema
        }
      })
    })

    if (!res.ok) throw new Error('Error en el servidor de Gemini AI')

    const data = await res.json()
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textOutput) throw new Error('No se recibió respuesta de Gemini AI')

    const clean = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim()
    const firstBrace = clean.indexOf('{')
    const lastBrace = clean.lastIndexOf('}')
    const jsonStr = (firstBrace !== -1 && lastBrace > firstBrace) ? clean.substring(firstBrace, lastBrace + 1) : clean

    return JSON.parse(jsonStr) as VoiceInterpreterResult
  } catch (err: any) {
    console.warn('Fallback a interpretador heurístico por voz:', err)
    
    // Deterministic Rule Parser Fallback for kitchen speech
    const lower = spokenText.toLowerCase()
    const actions: InterpretedAction[] = []

    if (lower.includes('pedido')) {
      actions.push({
        type: 'ADD_ORDER',
        data: { customer_name: 'Cliente Dictado', product_name: 'Pedido Registrado por Voz', quantity: 1, price: 5000 }
      })
    }
    if (lower.includes('venta')) {
      actions.push({
        type: 'RECORD_SALE',
        data: { product_name: 'Venta Registrada por Voz', quantity: 1, price: 4500 }
      })
    }
    if (lower.includes('ingrediente') || lower.includes('insumo') || lower.includes('harina') || lower.includes('compr')) {
      actions.push({
        type: 'ADD_INGREDIENT',
        data: { ingredient_name: 'Insumo Dictado por Voz', quantity: 1000, amount: 2500 }
      })
    }
    if (lower.includes('local') || lower.includes('pote') || lower.includes('tarta')) {
      actions.push({
        type: 'DELIVER_TO_FAMILY_STORE',
        data: { product_name: 'Postre en Pote', quantity: 1 }
      })
    }
    if (lower.includes('gasto') || lower.includes('alquiler') || lower.includes('luz') || lower.includes('gas') || actions.length === 0) {
      actions.push({
        type: 'RECORD_EXPENSE',
        data: { description: spokenText, amount: 1500, expense_type: 'Variable' }
      })
    }

    return {
      actions,
      speech_response: `Registré tu dictado de voz (${actions.length} acción/es procesadas).`
    }
  }
}
