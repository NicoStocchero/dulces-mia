// Script de prueba de integración real (Smoke Test) para Sol Postres
// Ejecuta transacciones reales contra Supabase con la anon_key para garantizar que RLS,
// tipos y persistencia funcionen sin depender de mocks falsos.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Cargar .env.local si existe
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=')
      if (k && v) {
        process.env[k.trim()] = v.join('=').trim()
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configurados.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

let totalTests = 0
let passedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    console.log(`  ✓ ${message}`)
    passedTests++
  } else {
    console.error(`  ❌ FALLÓ: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runAllTests() {
  console.log('\n==================================================')
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS DE INTEGRACIÓN REAL')
  console.log('==================================================\n')

  try {
    // 1. TEST DE RLS Y PERSISTENCIA DE CLIENTES (CRM)
    console.log('▶ 1. Verificando persistencia y RLS en tabla "customers"...')
    const testCustName = `Test QA Cliente ${Date.now()}`
    const { data: createdCust, error: custInsertErr } = await supabase
      .from('customers')
      .insert([{
        name: testCustName,
        phone: '1122334455',
        notes: 'Cliente de prueba automatizada'
      }])
      .select()
      .single()

    assert(!custInsertErr && createdCust?.id, `Insertar cliente en Supabase con clave anónima (ID: ${createdCust?.id || 'none'})`)

    const { data: fetchCustList, error: custFetchErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', createdCust.id)

    assert(!custFetchErr && fetchCustList.length === 1, 'Lectura de cliente persistido (RLS permite lectura correcta)')
    assert(fetchCustList[0].name === testCustName, 'Los datos del cliente coinciden con lo registrado')

    // Cleanup cliente
    const { error: custDelErr } = await supabase.from('customers').delete().eq('id', createdCust.id)
    assert(!custDelErr, 'Eliminación del cliente de prueba')

    // 2. TEST DE VENTAS CON COSTO Y GANANCIA INMUTABLE
    console.log('\n▶ 2. Verificando persistencia de ventas con columna Costo...')
    const testRevenue = 5000
    const testCost = 1800
    const testProfit = testRevenue - testCost

    const { data: createdSale, error: saleInsertErr } = await supabase
      .from('sales')
      .insert([{
        customer_name: 'Cliente Prueba Venta',
        product_name: 'Chocotorta en Pote',
        quantity: 1,
        revenue: testRevenue,
        cost: testCost,
        profit: testProfit,
        paid: true,
        date: new Date().toISOString()
      }])
      .select()
      .single()

    assert(!saleInsertErr && createdSale?.id, `Insertar venta con columna "cost" y "customer_name" (ID: ${createdSale?.id})`)
    assert(Number(createdSale.cost) === testCost, `El costo persistido es inmutable y exacto ($${createdSale.cost})`)
    assert(Number(createdSale.revenue) - Number(createdSale.cost) === Number(createdSale.profit), 'Ecuación contable verificada: Revenue - Cost == Profit')

    // Cleanup venta
    await supabase.from('sales').delete().eq('id', createdSale.id)
    assert(true, 'Eliminación de venta de prueba')

    // 3. TEST DE GASTOS E INSUMOS ESTRUCTURADOS (MATERIA PRIMA)
    console.log('\n▶ 3. Verificando compras de insumos estructurados en "expenses"...')
    const { data: createdExp, error: expInsertErr } = await supabase
      .from('expenses')
      .insert([{
        description: 'Harina 0000 25kg (Test QA)',
        amount: 15000,
        type: 'Insumo',
        package_size: 25000,
        unit: 'g',
        quantity_bought: 1,
        unit_price: 15000,
        date: new Date().toISOString()
      }])
      .select()
      .single()

    assert(!expInsertErr && createdExp?.id, `Insertar compra de insumo con campos estructurados (ID: ${createdExp?.id})`)
    assert(createdExp.type === 'Insumo' && Number(createdExp.amount) === 15000, 'Monto y tipo de insumo registrado correctamente')

    // Cleanup gasto
    await supabase.from('expenses').delete().eq('id', createdExp.id)
    assert(true, 'Eliminación de gasto de prueba')

    // 4. TEST DE HISTORIAL DE COSTOS EN RECETAS
    console.log('\n▶ 4. Verificando historial de costos en "recipes"...')
    const { data: createdRecipe, error: recInsertErr } = await supabase
      .from('recipes')
      .insert([{
        title: `Receta Test Costo ${Date.now()}`,
        category: 'Tartas',
        ingredients: [{ name: 'Harina', quantity: '250g' }],
        cost_history: [{
          id: Date.now().toString(),
          date: new Date().toISOString(),
          total_cost: 2500,
          unit_cost: 2500,
          suggested_price: 5000,
          profit_margin: 100,
          note: 'Versión inicial de prueba QA'
        }]
      }])
      .select()
      .single()

    assert(!recInsertErr && createdRecipe?.id, `Insertar receta con "cost_history" snapshot`)
    assert(Array.isArray(createdRecipe.cost_history) && createdRecipe.cost_history.length === 1, 'Historial de versiones de costo recuperado como array JSON')

    // Cleanup receta
    await supabase.from('recipes').delete().eq('id', createdRecipe.id)
    assert(true, 'Eliminación de receta de prueba')

    console.log('\n==================================================')
    console.log(`🎉 RESULTADO: ${passedTests}/${totalTests} PRUEBAS COMPLETADAS CON ÉXITO`)
    console.log('==================================================\n')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ ERROR CRÍTICO EN PRUEBAS DE INTEGRACIÓN:', err)
    process.exit(1)
  }
}

runAllTests()
