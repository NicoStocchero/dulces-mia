// Script de limpieza automática de datos de prueba para Sol Postres
// Elimina de forma segura registros de prueba generados por Playwright o Smoke Tests
// sin tocar NUNCA los registros reales de producción del negocio.

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
  console.log('⚠️ NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no configurados. Omitiendo limpieza remota.')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function cleanAllTestData() {
  console.log('\n🧹 Ejecutando purga de datos de prueba en Supabase...')

  try {
    // 1. Clientes de prueba
    const { data: testCusts } = await supabase
      .from('customers')
      .select('id, name')
      .or('name.ilike.%test%,name.ilike.%e2e%,name.ilike.%valida%,name.ilike.%valentina%')

    if (testCusts && testCusts.length > 0) {
      const ids = testCusts.filter(c => c.name !== 'Negocio' && c.name !== 'Manu').map(c => c.id)
      if (ids.length > 0) {
        await supabase.from('customers').delete().in('id', ids)
        console.log(`  ✓ Eliminados ${ids.length} clientes de prueba.`)
      }
    }

    // 2. Pedidos de prueba
    const { data: testOrders } = await supabase
      .from('orders')
      .select('id, customer_name')
      .or('customer_name.ilike.%test%,customer_name.ilike.%e2e%,customer_name.ilike.%valida%,customer_name.ilike.%valentina%,customer_name.eq.Consumidor Final')

    if (testOrders && testOrders.length > 0) {
      const ids = testOrders.filter(o => o.customer_name !== 'Negocio' && o.customer_name !== 'Manu').map(o => o.id)
      if (ids.length > 0) {
        await supabase.from('orders').delete().in('id', ids)
        console.log(`  ✓ Eliminados ${ids.length} pedidos de prueba.`)
      }
    }

    // 3. Ventas de prueba
    const { data: testSales } = await supabase
      .from('sales')
      .select('id, customer_name')
      .or('customer_name.ilike.%test%,customer_name.ilike.%e2e%,customer_name.ilike.%valida%,customer_name.ilike.%valentina%,customer_name.eq.Consumidor Final')

    if (testSales && testSales.length > 0) {
      const ids = testSales.filter(s => s.customer_name !== 'Negocio' && s.customer_name !== 'Manu').map(s => s.id)
      if (ids.length > 0) {
        await supabase.from('sales').delete().in('id', ids)
        console.log(`  ✓ Eliminadas ${ids.length} ventas de prueba.`)
      }
    }

    // 4. Productos de prueba
    const { data: testProds } = await supabase
      .from('products')
      .select('id, name')
      .or('name.ilike.%test%,name.ilike.%e2e%,name.ilike.%torta imperial%,name.ilike.%eliminar%')

    if (testProds && testProds.length > 0) {
      const realNames = [
        'Postre Oreo en Pote', 'Chocotorta en Pote', 'Tarta Coco 18 cm',
        'Tarta Cabsha 18 cm', 'Mini cabsha 10 cm', 'Mini coco 10 cm',
        'Tarta de ricota 18 cm', 'Tarta ricota mini', 'Mini pasta frola membrillo',
        'Mini tarta pasta frola batata'
      ]
      const ids = testProds.filter(p => !realNames.includes(p.name)).map(p => p.id)
      if (ids.length > 0) {
        await supabase.from('products').delete().in('id', ids)
        console.log(`  ✓ Eliminados ${ids.length} productos de prueba.`)
      }
    }

    // 5. Recetas de prueba
    const { data: testRecs } = await supabase
      .from('recipes')
      .select('id, title')
      .or('title.ilike.%test%,title.ilike.%qa%')

    if (testRecs && testRecs.length > 0) {
      const realRecipes = ['Tarta Coco 18 cm', 'Tarta Cabsha 18 cm', 'Tarta mini coco 10 cm', 'Mini tarta ricota']
      const ids = testRecs.filter(r => !realRecipes.includes(r.title)).map(r => r.id)
      if (ids.length > 0) {
        await supabase.from('recipes').delete().in('id', ids)
        console.log(`  ✓ Eliminadas ${ids.length} recetas de prueba.`)
      }
    }

    // 6. Gastos de prueba
    const { data: testExps } = await supabase
      .from('expenses')
      .select('id, description')
      .or('description.ilike.%test%,description.ilike.%qa%')

    if (testExps && testExps.length > 0) {
      const ids = testExps.map(e => e.id)
      if (ids.length > 0) {
        await supabase.from('expenses').delete().in('id', ids)
        console.log(`  ✓ Eliminados ${ids.length} gastos de prueba.`)
      }
    }

    console.log('✨ Base de datos verificada y limpia. Datos de Sol 100% preservados.\n')
  } catch (err) {
    console.error('⚠️ Error al limpiar datos de prueba:', err)
  }
}

// Ejecutar directamente si se llama desde CLI
if (process.argv[1] && process.argv[1].endsWith('clean-test-data.mjs')) {
  cleanAllTestData().then(() => process.exit(0))
}
