import { test, expect } from '@playwright/test'
import { calculateRecipeCost } from '../lib/costCalculations'
import { calculateProductionRequirements } from '../lib/production'
import { Recipe, IngredientMaster, Order, Product } from '../lib/types'

test.describe('Lógica Contable, Escandallo y Conversiones de Unidades', () => {
  const mockMasterIngredients: IngredientMaster[] = [
    {
      id: 'ing-1',
      name: 'Harina 0000',
      category: 'Secos',
      unit: 'g',
      package_cost: 1200, // $1200 por paquete de 1000g -> $1.2/g
      package_size: 1000,
      stock_qty: 5000,
    },
    {
      id: 'ing-2',
      name: 'Manteca',
      category: 'Lácteos',
      unit: 'g',
      package_cost: 2400, // $2400 por paquete de 200g -> $12/g
      package_size: 200,
      stock_qty: 600,
    },
    {
      id: 'ing-3',
      name: 'Leche Entera',
      category: 'Lácteos',
      unit: 'ml',
      package_cost: 1500, // $1500 por 1000ml -> $1.5/ml
      package_size: 1000,
      stock_qty: 2000,
    },
    {
      id: 'ing-4',
      name: 'Huevos',
      category: 'Frescos',
      unit: 'u',
      package_cost: 3600, // $3600 por maple de 30 -> $120/u
      package_size: 30,
      stock_qty: 60,
    },
  ]

  test('Calcula el costo exacto con unidades directas (g, ml, u)', () => {
    const recipe: Recipe = {
      id: 'rec-1',
      title: 'Bizcochuelo Clásico',
      category: 'Tortas',
      base_servings: 1,
      ingredients: [
        { name: 'Harina 0000', quantity: '500g' }, // 500 * $1.2 = $600
        { name: 'Manteca', quantity: '100g' },     // 100 * $12 = $1200
        { name: 'Huevos', quantity: '4 u' },       // 4 * $120 = $480
      ],
    }

    const { totalCost, unitCost, servings } = calculateRecipeCost(recipe, mockMasterIngredients)

    // Costo esperado: 600 + 1200 + 480 = 2280
    expect(totalCost).toBe(2280)
    expect(unitCost).toBe(2280)
    expect(servings).toBe(1)
  })

  test('Convierte correctamente unidades de gran escala (kg a g, l a ml)', () => {
    const recipe: Recipe = {
      id: 'rec-2',
      title: 'Lote Mayorista de Crema',
      category: 'Bases',
      base_servings: 1,
      ingredients: [
        { name: 'Harina 0000', quantity: '1.5 kg' }, // 1500g * $1.2 = $1800
        { name: 'Leche Entera', quantity: '2 l' },   // 2000ml * $1.5 = $3000
      ],
    }

    const { totalCost } = calculateRecipeCost(recipe, mockMasterIngredients)

    // Costo esperado: 1800 + 3000 = 4800
    expect(totalCost).toBe(4800)
  })

  test('Soporta números decimales con coma (estilo argentino "1,5 kg")', () => {
    const recipe: Recipe = {
      id: 'rec-3',
      title: 'Prueba Comas',
      category: 'Tortas',
      base_servings: 1,
      ingredients: [
        { name: 'Harina 0000', quantity: '0,5 kg' }, // 500g * $1.2 = $600
      ],
    }

    const { totalCost } = calculateRecipeCost(recipe, mockMasterIngredients)
    expect(totalCost).toBe(600)
  })

  test('Suma adecuadamente costos de empaque y mano de obra', () => {
    const recipe: Recipe = {
      id: 'rec-4',
      title: 'Torta con Packaging y Mano de Obra',
      category: 'Tortas',
      base_servings: 1,
      ingredients: [
        { name: 'Harina 0000', quantity: '200g' }, // 200 * $1.2 = $240
      ],
      packaging_cost: 850, // Caja + base dorada + moño
      labor_hours: 1.5,
      labor_rate: 4000,    // 1.5 * 4000 = 6000
    }

    const { totalCost } = calculateRecipeCost(recipe, mockMasterIngredients)

    // Total: 240 + 850 + 6000 = 7090
    expect(totalCost).toBe(7090)
  })

  test('Calcula el costo unitario por porción dividiendo por el rendimiento', () => {
    const recipe: Recipe = {
      id: 'rec-5',
      title: 'Tarta Cabsha 8 Porciones',
      category: 'Tartas',
      yield: '8 porciones',
      ingredients: [
        { name: 'Harina 0000', quantity: '1000g' }, // 1000 * $1.2 = $1200
        { name: 'Manteca', quantity: '300g' },      // 300 * $12 = $3600
      ],
    }

    const { totalCost, unitCost, servings } = calculateRecipeCost(recipe, mockMasterIngredients)

    // Total: 1200 + 3600 = 4800
    // Servings extraídas del texto "8 porciones": 8
    // Costo unitario: 4800 / 8 = 600
    expect(totalCost).toBe(4800)
    expect(servings).toBe(8)
    expect(unitCost).toBe(600)
  })
})

test.describe('Consolidador de Producción (Mise en Place)', () => {
  const mockMasterIngredients: IngredientMaster[] = [
    {
      id: 'ing-1',
      name: 'Harina 0000',
      category: 'Secos',
      unit: 'g',
      package_cost: 1500,
      package_size: 1000,
      stock_qty: 500, // Solo quedan 500g
    },
    {
      id: 'ing-2',
      name: 'Huevos',
      category: 'Frescos',
      unit: 'u',
      package_cost: 3600,
      package_size: 30,
      stock_qty: 50, // Hay 50 huevos
    },
  ]

  const mockRecipes: Recipe[] = [
    {
      id: 'rec-1',
      title: 'Torta de Vainilla',
      category: 'Tortas',
      base_servings: 1,
      ingredients: [
        { name: 'Harina 0000', quantity: '400g' },
        { name: 'Huevos', quantity: '4 u' },
      ],
    },
  ]

  const mockProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Torta de Vainilla',
      category: 'Tortas',
      price: 15000,
      cost: 4500,
      emoji: '🍰',
      recipe_id: 'rec-1',
      active: true,
    },
  ]

  test('Suma insumos de múltiples pedidos pendientes y detecta faltantes de stock', () => {
    const mockOrders: Order[] = [
      {
        id: 'ord-1',
        customer_name: 'Cliente A',
        product_id: 'prod-1',
        product_name: 'Torta de Vainilla',
        quantity: 2, // Requiere 800g harina, 8 huevos
        total_price: 30000,
        status: 'Pendiente',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ord-2',
        customer_name: 'Cliente B',
        product_id: 'prod-1',
        product_name: 'Torta de Vainilla',
        quantity: 1, // Requiere 400g harina, 4 huevos
        total_price: 15000,
        status: 'Pendiente',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ord-3',
        customer_name: 'Cliente C',
        product_id: 'prod-1',
        product_name: 'Torta de Vainilla',
        quantity: 5,
        total_price: 75000,
        status: 'Entregado', // Ya entregado -> NO debe sumar al mise en place
        created_at: new Date().toISOString(),
      },
    ]

    const result = calculateProductionRequirements(mockOrders, mockProducts, mockRecipes, mockMasterIngredients)

    // Total de pedidos pendientes: 2
    expect(result.totalOrdersCount).toBe(2)
    // Total de tortas a producir: 3
    expect(result.totalItemsCount).toBe(3)

    // Harina requerida: 3 * 400g = 1200g
    // Stock actual: 500g -> Faltante: 700g -> Paquetes a comprar de 1000g: 1 paquete -> Costo estimado: $1500
    const harinaReq = result.requirements.find(r => r.ingredientName.toLowerCase().includes('harina'))
    expect(harinaReq).toBeDefined()
    expect(harinaReq?.requiredQty).toBe(1200)
    expect(harinaReq?.isLowStock).toBe(true)
    expect(harinaReq?.toBuyQty).toBe(1000)
    expect(harinaReq?.estimatedCost).toBe(1500)

    // Huevos requeridos: 3 * 4 = 12 u
    // Stock actual: 50 u -> Faltante: 0 -> isLowStock: false
    const huevosReq = result.requirements.find(r => r.ingredientName.toLowerCase().includes('huevo'))
    expect(huevosReq).toBeDefined()
    expect(huevosReq?.requiredQty).toBe(12)
    expect(huevosReq?.isLowStock).toBe(false)
    expect(huevosReq?.estimatedCost).toBe(0)

    // Costo estimado total de compras de insumos para la jornada
    expect(result.totalEstimatedShoppingCost).toBe(1500)
  })
})
