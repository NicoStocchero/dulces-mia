// Generador del Paquete de Contexto para Gemini AI Assistant

import { Product, Order, Sale, Expense, IngredientMaster, Customer, Recipe } from '@/lib/types'

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function generateGeminiBusinessContext({
  products,
  orders,
  sales,
  expenses,
  ingredients,
  customers,
  recipes
}: {
  products: Product[]
  orders: Order[]
  sales: Sale[]
  expenses: Expense[]
  ingredients: IngredientMaster[]
  customers: Customer[]
  recipes: Recipe[]
}): string {
  const dateStr = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.revenue || 0), 0)
  const totalSalesCost = sales.reduce((acc, s) => acc + (s.cost || 0), 0)
  const totalSalesProfit = sales.reduce((acc, s) => acc + (s.profit || 0), 0)

  const fixedExpenses = expenses.filter(e => e.expense_type === 'Fijo' || e.type === 'Fijo').reduce((acc, e) => acc + (e.amount || 0), 0)
  const variableExpenses = expenses.filter(e => e.expense_type !== 'Fijo' && e.type !== 'Fijo').reduce((acc, e) => acc + (e.amount || 0), 0)
  const totalExpenses = fixedExpenses + variableExpenses

  const netRealProfit = totalSalesProfit - totalExpenses

  let prompt = `# CONTEXTO EJECUTIVO DE NEGOCIO - DULCES MÍA PASTELERÍA
Fecha del reporte: ${dateStr}

Hola Gemini! Soy Sol, dueña de "Dulces Mía Pastelería Artesanal". Te comparto la información actualizada y estructurada de mi negocio para que me asesores, analices mis finanzas, me sugieras estrategias de precios, ideas de recetas y promociones para mis clientes.

---

## 📊 1. RESUMEN FINANCIERO Y VENTAS
- Total Ventas Realizadas: ${fmt(totalSalesRevenue)} (${sales.length} ventas registradas)
- Costo Total de Productos Vendidos: ${fmt(totalSalesCost)}
- Ganancia Bruta en Ventas: ${fmt(totalSalesProfit)}
- Gastos Fijos (Alquiler, Luz, Gas, etc.): ${fmt(fixedExpenses)}
- Gastos Variables (Packaging, Limpieza): ${fmt(variableExpenses)}
- **GANANCIA NETA REAL:** ${fmt(netRealProfit)}

---

## 🎂 2. CATÁLOGO DE POSTRES Y PRECIOS (${products.length} productos activos)
`
  products.forEach(p => {
    prompt += `- **${p.name}** | Precio Venta: ${fmt(p.price)} | Costo Insumos: ${fmt(p.cost)} | Categoría: ${p.category || 'General'}\n`
  })

  prompt += `\n---

## 📦 3. INVENTARIO DE INSUMOS Y MATERIA PRIMA (${ingredients.length} insumos)
`
  ingredients.forEach(i => {
    const isLow = (i.stock_qty ?? 1000) <= (i.min_stock ?? 200)
    prompt += `- **${i.name}**: Stock actual: ${i.stock_qty || 0}${i.unit} (Mínimo: ${i.min_stock || 0}${i.unit}) ${isLow ? '⚠️ RECOMPRA URGENTE' : '🟢 OK'} | Costo paquete: ${fmt(i.package_cost)}\n`
  })

  prompt += `\n---

## 📅 4. PEDIDOS AGENDADOS Y LOCAL FAMILIAR (${orders.length} pedidos)
`
  orders.forEach(o => {
    prompt += `- Cliente: ${o.customer_name} | Producto: ${o.quantity}x ${o.product_name} | Total: ${fmt(o.total_price)} | Estado: ${o.status}\n`
  })

  prompt += `\n---

## 👤 5. CRM DE CLIENTES Y PREFERENCIAS (${customers.length} clientes)
`
  customers.forEach(c => {
    const tags = c.dietary_tags ? c.dietary_tags.join(', ') : 'Sin restricciones'
    prompt += `- **${c.name}** | Tel: ${c.phone || 'Sin tel'} | Postre favorito: ${c.favorite_dessert || 'No especificado'} | Alergias/Dietas: ${tags} | Cumple: ${c.birthday || 'No agendado'}\n`
  })

  prompt += `\n---

## 💡 INSTRUCCIONES PARA GEMINI AI:
Actúa como mi Consultor Estratégico de Negocios y Pastelería Artesanal. Analiza estos datos y responde mi consulta considerando mis costos, stock e historial de clientes. ¡Gracias!`

  return prompt
}
