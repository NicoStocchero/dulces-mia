import { Sale, Expense, Product, Recipe, Order, Customer, IngredientMaster } from '@/lib/types'

function convertToCSV(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const csvRows = [headers.join(',')]

  for (const row of rows) {
    const values = headers.map(header => {
      const val = row[header] === undefined || row[header] === null ? '' : row[header]
      const escaped = ('' + val).replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(','))
  }
  return csvRows.join('\n')
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportAllDataPackage(data: {
  sales: Sale[]
  expenses: Expense[]
  products: Product[]
  orders: Order[]
  ingredients: IngredientMaster[]
  customers: Customer[]
  recipes: Recipe[]
}) {
  const dateStr = new Date().toISOString().split('T')[0]

  // 1. Export Sales CSV
  if (data.sales && data.sales.length > 0) {
    const salesData = data.sales.map(s => ({
      ID: s.id,
      Fecha: s.date,
      Producto: s.product_name,
      Cantidad: s.quantity,
      Ingreso_Total: s.revenue,
      Costo_Insumos: s.cost,
      Ganancia_Neta: s.profit,
      Estado_Pago: s.paid ? 'Cobrado' : 'Pendiente'
    }))
    downloadFile(convertToCSV(salesData), `ventas_dulces_mia_${dateStr}.csv`, 'text/csv;charset=utf-8;')
  }

  // 2. Export Expenses CSV
  if (data.expenses && data.expenses.length > 0) {
    const expensesData = data.expenses.map(e => ({
      ID: e.id,
      Fecha: e.date,
      Descripcion: e.description,
      Monto: e.amount,
      Tipo_Gasto: e.type || e.expense_type || 'Variable',
      Producto_Relacionado: e.related_product || ''
    }))
    downloadFile(convertToCSV(expensesData), `gastos_dulces_mia_${dateStr}.csv`, 'text/csv;charset=utf-8;')
  }

  // 3. Export Orders CSV
  if (data.orders && data.orders.length > 0) {
    const ordersData = data.orders.map(o => ({
      ID: o.id,
      Cliente: o.customer_name,
      Producto: o.product_name,
      Cantidad: o.quantity,
      Precio_Total: o.total_price,
      Estado: o.status,
      Moldes: o.mold_size || '',
      Fecha_Entrega: o.delivery_date || ''
    }))
    downloadFile(convertToCSV(ordersData), `pedidos_dulces_mia_${dateStr}.csv`, 'text/csv;charset=utf-8;')
  }

  // 4. Export Desserts Catalog CSV
  if (data.products && data.products.length > 0) {
    const productsData = data.products.map(p => {
      const cost = p.cost || 0
      const profit = p.price - cost
      const marginPct = Math.round((profit / (cost || 1)) * 100)
      return {
        ID: p.id,
        Nombre: p.name,
        Categoria: p.category || 'General',
        Precio_Venta: p.price,
        Costo_Insumos: cost,
        Ganancia_Unitaria: profit,
        Margen_Porcentaje: `${marginPct}%`,
        Estado: p.active !== false ? 'Activo' : 'Pausado'
      }
    })
    downloadFile(convertToCSV(productsData), `catalogo_postres_${dateStr}.csv`, 'text/csv;charset=utf-8;')
  }

  // 5. Export Ingredients Stock CSV
  if (data.ingredients && data.ingredients.length > 0) {
    const ingredientsData = data.ingredients.map(i => {
      const unitCost = i.package_size > 0 ? i.package_cost / i.package_size : 0
      return {
        ID: i.id,
        Insumo: i.name,
        Categoria: i.category || 'General',
        Stock_Actual: i.stock_qty || 0,
        Unidad: i.unit,
        Costo_Paquete: i.package_cost,
        Tamaño_Paquete: i.package_size,
        Costo_Por_Unidad: unitCost,
        Nivel_Minimo: i.min_stock || 0
      }
    })
    downloadFile(convertToCSV(ingredientsData), `stock_insumos_${dateStr}.csv`, 'text/csv;charset=utf-8;')
  }

  // 6. Export Customers CSV
  if (data.customers && data.customers.length > 0) {
    const customersData = data.customers.map(c => ({
      ID: c.id,
      Nombre: c.name,
      Telefono: c.phone || '',
      Cumpleanos: c.birthday || '',
      Notas: c.notes || ''
    }))
    downloadFile(convertToCSV(customersData), `clientes_crm_${dateStr}.csv`, 'text/csv;charset=utf-8;')
  }
}
