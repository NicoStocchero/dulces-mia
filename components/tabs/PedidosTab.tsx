'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Product, Order, Sale, Recipe, IngredientMaster } from '@/lib/types'
import { fetchMasterIngredients, deductRecipeStock } from '@/lib/supabase'
import { calculateProductionRequirements } from '@/lib/production'
import { NumericStepper } from '@/components/ui/NumericStepper'
import { DessertScannerModal } from '@/components/ui/DessertScannerModal'
import { Calendar, PlusCircle, CheckCircle2, Clock, Trash2, User, Package, Sparkles, AlertCircle, MessageCircle, DollarSign, Wallet, ClipboardList, ListFilter, AlertTriangle, X, Store, Scale, Camera } from 'lucide-react'
import confetti from 'canvas-confetti'

interface PedidosTabProps {
  products: Product[]
  orders: Order[]
  recipes?: Recipe[]
  ingredients?: IngredientMaster[]
  onSaveOrder: (order: Omit<Order, 'id'> & { id?: string }) => Promise<void>
  onDeleteOrder: (id: string) => Promise<void>
  onRecordSale: (sale: Omit<Sale, 'id'>) => Promise<void>
  showToast: (msg: string) => void
}

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function PedidosTab({ products, orders, recipes = [], ingredients: propIngredients, onSaveOrder, onDeleteOrder, onRecordSale, showToast }: PedidosTabProps) {
  const [customerName, setCustomerName] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [customProductName, setCustomProductName] = useState('')
  const [moldSize, setMoldSize] = useState('18cm')
  const [quantity, setQuantity] = useState(1)
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deposit, setDeposit] = useState('')
  const [notes, setNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendiente' | 'En Local' | 'Entregado' | 'Cancelado'>('Pendiente')
  const [viewMode, setViewMode] = useState<'lista' | 'agenda'>('lista')
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false)
  const [isAIDessertModalOpen, setIsAIDessertModalOpen] = useState(false)
  const [masterIngredients, setMasterIngredients] = useState<IngredientMaster[]>(propIngredients || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (propIngredients && propIngredients.length > 0) {
      setMasterIngredients(propIngredients)
    } else {
      fetchMasterIngredients().then(setMasterIngredients)
    }
  }, [propIngredients])

  const activeProducts = useMemo(() => products.filter(p => p.active !== false), [products])
  const selectedProduct = activeProducts.find(p => p.id === selectedProductId)

  const calculatedUnitPrice = selectedProduct ? selectedProduct.price : 0
  const calculatedTotalPrice = calculatedUnitPrice * quantity

  const handleSetDepositPercentage = (pct: number) => {
    const amount = Math.round(calculatedTotalPrice * (pct / 100))
    setDeposit(amount.toString())
  }

  const productionData = useMemo(() => {
    return calculateProductionRequirements(orders, products, recipes, masterIngredients)
  }, [orders, products, recipes, masterIngredients])

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    const pName = selectedProduct ? selectedProduct.name : customProductName.trim()
    if (!customerName.trim()) {
      showToast('⚠️ Ingresá el nombre del cliente')
      return
    }
    if (!pName) {
      showToast('⚠️ Seleccioná o ingresá un producto para el pedido')
      return
    }

    setLoading(true)
    const unitPrice = selectedProduct ? selectedProduct.price : 0
    const totalPrice = unitPrice * quantity
    const parsedDeposit = parseFloat(deposit) || 0
    const pendingBalance = Math.max(0, totalPrice - parsedDeposit)
    const creationDateTime = orderDate ? new Date(orderDate + 'T12:00:00').toISOString() : new Date().toISOString()

    await onSaveOrder({
      customer_name: customerName.trim(),
      product_id: selectedProduct?.id,
      product_name: pName,
      quantity,
      total_price: totalPrice,
      deposit: parsedDeposit,
      pending_balance: pendingBalance,
      delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
      status: 'Pendiente',
      mold_size: moldSize,
      notes: notes.trim(),
      created_at: creationDateTime
    })

    showToast(`✨ Pedido agendado a nombre de ${customerName.trim()}!`)
    setCustomerName('')
    setSelectedProductId('')
    setCustomProductName('')
    setQuantity(1)
    setDeposit('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setDeliveryDate('')
    setNotes('')
    setLoading(false)
  }

  // Share WhatsApp budget
  const handleShareWhatsAppBudget = (order: Order) => {
    const dateFormatted = order.delivery_date
      ? new Date(order.delivery_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'A coordinar'

    const depositAmount = order.deposit || 0
    const pendingAmount = order.pending_balance ?? (order.total_price - depositAmount)

    const text = `✨ *DULCES MÍA - Presupuesto & Encargo* ✨\n\n` +
      `👤 *Cliente:* ${order.customer_name}\n` +
      `🍰 *Producto:* ${order.quantity}x ${order.product_name}\n` +
      `💰 *Total:* ${fmt(order.total_price)}\n` +
      (depositAmount > 0 ? `💚 *Seña Recibida:* ${fmt(depositAmount)}\n` : `📌 *Seña sugerida (50%):* ${fmt(order.total_price * 0.5)}\n`) +
      `⏳ *Saldo a abonar al retirar:* ${fmt(pendingAmount)}\n` +
      `📅 *Fecha de entrega:* ${dateFormatted}\n` +
      (order.notes ? `💡 *Detalles:* ${order.notes}\n` : '') +
      `\n¡Muchas gracias por elegirnos! 💕`

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    showToast('💬 Abriendo WhatsApp con el presupuesto...')
  }

  // Share Production Shopping List on WhatsApp
  const handleShareShoppingListWhatsApp = () => {
    if (productionData.requirements.length === 0) {
      showToast('⚠️ No hay requerimientos de producción activos')
      return
    }

    let text = `🛒 *DULCES MÍA - Lista de Compras para Producción* 🛒\n\n`
    text += `📋 *${productionData.totalOrdersCount} Pedidos Pendientes* (${productionData.totalItemsCount} postres a elaborar)\n\n`

    productionData.requirements.forEach(req => {
      const isMissing = req.isLowStock
      text += `${isMissing ? '🔴' : '🟢'} *${req.ingredientName}:* Requerido: ${req.requiredQty}${req.unit} | Stock: ${req.currentStock}${req.unit}\n`
    })

    if (productionData.totalEstimatedShoppingCost > 0) {
      text += `\n💰 *Presupuesto Estimado de Compras:* ${fmt(productionData.totalEstimatedShoppingCost)}\n`
    }

    text += `\n¡A hornear! 🧁✨`

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    showToast('💬 Abriendo WhatsApp con la lista de compras...')
  }

  // Convert order to Sale with chosen payment status (Paid vs Pending)
  const handleDeliverAndSell = async (order: Order, isPaid: boolean) => {
    const p = products.find(prod => prod.id === order.product_id || prod.name === order.product_name)
    const cost = (p?.cost || 0) * order.quantity
    const revenue = order.total_price || ((p?.price || 0) * order.quantity)
    const profit = revenue - cost

    // 1. Record Sale (app/page.tsx will automatically deduct ingredient stock!)
    await onRecordSale({
      product_id: p?.id,
      product_name: order.product_name,
      quantity: order.quantity,
      revenue,
      cost,
      profit,
      paid: isPaid,
      date: new Date().toISOString()
    })

    // 2. Update order status to Entregado
    await onSaveOrder({
      ...order,
      status: 'Entregado'
    })

    // Automatic ingredient stock deduction if recipe linked
    if (p?.recipe_id) {
      const updated = await deductRecipeStock(p.recipe_id, order.quantity, recipes, masterIngredients)
      setMasterIngredients(updated)
    }

    if (isPaid) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ec4899', '#10b981', '#ffffff']
      })
      showToast(`✨ Pedido de ${order.customer_name} entregado y registrado como VENTA COBRADA! Stock descontado.`)
    } else {
      showToast(`📌 Pedido entregado y registrado como VENTA PENDIENTE DE COBRO. Stock descontado.`)
    }
  }

  // Deliver dessert to Family Store (Consignment)
  const handleSendToFamilyStore = async (order: Order) => {
    const p = products.find(prod => prod.id === order.product_id || prod.name === order.product_name)

    if (p?.recipe_id) {
      const updated = await deductRecipeStock(p.recipe_id, order.quantity, recipes, masterIngredients)
      setMasterIngredients(updated)
    }

    await onSaveOrder({
      ...order,
      status: 'En Local'
    })

    showToast(`🏪 Postre "${order.product_name}" exhibido en el Local Familiar! Stock descontado.`)
  }

  // Settle Family Store Order (Family hands over cash to Sol)
  const handleSettleFamilyStoreOrder = async (order: Order) => {
    const p = products.find(prod => prod.id === order.product_id || prod.name === order.product_name)
    const cost = (p?.cost || 0) * order.quantity
    const revenue = order.total_price || ((p?.price || 0) * order.quantity)
    const profit = revenue - cost

    await onRecordSale({
      product_id: p?.id,
      product_name: order.product_name,
      quantity: order.quantity,
      revenue,
      cost,
      profit,
      paid: true,
      date: new Date().toISOString()
    })

    await onSaveOrder({
      ...order,
      status: 'Entregado'
    })

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10b981', '#ec4899', '#ffffff']
    })

    showToast(`💰 Rendición del Local Familiar cobrada! +${fmt(revenue)} registrados en ganancias.`)
  }

  const handleCancelOrder = async (order: Order) => {
    await onSaveOrder({
      ...order,
      status: 'Cancelado'
    })
    showToast(`✓ Pedido cancelado`)
  }

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'Todos') return true
    return o.status === statusFilter
  })

  const pendingCount = orders.filter(o => o.status === 'Pendiente').length

  // Group pending orders by date for Agenda view
  const ordersGroupedByDate = useMemo(() => {
    const groups: Record<string, Order[]> = {}
    filteredOrders.forEach(o => {
      const key = o.delivery_date
        ? new Date(o.delivery_date).toISOString().split('T')[0]
        : 'sin-fecha'
      if (!groups[key]) groups[key] = []
      groups[key].push(o)
    })
    return groups
  }, [filteredOrders])

  return (
    <div className="space-y-6">
      {/* Top Banner / Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Create Order Form */}
        <div className="lg:col-span-7 glass-panel-glow p-6 rounded-3xl border border-pink-200/60 bg-white/80">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2.5 rounded-xl bg-pink-100 text-pink-600 border border-pink-200">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-playfair text-xl font-bold text-gradient-pink">Cargar Nuevo Pedido</h2>
              <p className="text-xs text-slate-500">Agendá encargos con señas del 50% y cotizaciones rápidas</p>
            </div>
          </div>

          <form onSubmit={handleAddOrder} className="space-y-4">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-pink-500" />
                <span>Cliente / A nombre de quién</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Laura Rossi, Cumple de Santi..."
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white"
              />
            </div>

            {/* Product selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-pink-500" />
                <span>Postre / Encargo</span>
              </label>
              <select
                value={selectedProductId}
                onChange={e => {
                  setSelectedProductId(e.target.value)
                  if (e.target.value) setCustomProductName('')
                }}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white border-pink-200"
              >
                <option value="" className="text-slate-400">-- Seleccionar del catálogo --</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji || '🍰'} {p.name} [{p.category || 'General'}] ({fmt(p.price)})</option>
                ))}
              </select>

              {!selectedProductId && (
                <input
                  type="text"
                  placeholder="O escribí un encargo personalizado (Ej: Torta Temática Barbie)..."
                  value={customProductName}
                  onChange={e => setCustomProductName(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-800 bg-white mt-2 border-pink-200"
                />
              )}


            </div>

            {/* Quantity, Order Date & Delivery Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <NumericStepper value={quantity} onChange={setQuantity} label="Cantidad" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <span>Fecha del Pedido</span>
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-pink-500" />
                  <span>Entrega Deseada</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>
            </div>

            {/* Seña / Anticipo Section */}
            <div className="p-3.5 rounded-2xl bg-pink-50/60 border border-pink-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Seña / Anticipo Abonado ($)</span>
                </label>
                
                {calculatedTotalPrice > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSetDepositPercentage(0)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    >
                      Sin Seña
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDepositPercentage(50)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200"
                    >
                      50% ({fmt(calculatedTotalPrice * 0.5)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDepositPercentage(100)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-500 text-white hover:bg-pink-600"
                    >
                      100%
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <input
                  type="number"
                  placeholder="0"
                  value={deposit}
                  onChange={e => setDeposit(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white border-pink-200"
                />

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Resta Cobrar al Entregar</span>
                  <span className="text-sm font-black text-emerald-600">
                    {fmt(Math.max(0, calculatedTotalPrice - (parseFloat(deposit) || 0)))}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Detalles / Notas del Encargo</label>
              <input
                type="text"
                placeholder="Ej: Con velita, entrega a las 18hs, cel de contacto..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2 text-xs text-slate-800 bg-white"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !customerName.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-sm shadow-md shadow-pink-500/25 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 border border-pink-300/40 active:scale-[0.99]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{loading ? 'Agendando...' : 'Agendar Pedido'}</span>
            </button>
          </form>
        </div>

        {/* Right: Quick Overview & Production Button */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/70 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Control de Producción</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-pink-100 text-pink-700">
                {pendingCount} Pendientes
              </span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setIsAIDessertModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Camera className="w-4 h-4 text-white" />
                <span>Reconocer Postres con Cámara</span>
              </button>

              <button
                onClick={() => setIsProductionModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <ClipboardList className="w-4 h-4 text-pink-300" />
                <span>Resumen de Producción Semanal</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Fotografiá la mesada para registrar lote o calculá insumos para el fin de semana.
            </p>

            {/* Status Filter Buttons */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-pink-50/70 rounded-xl border border-pink-200/60">
              {(['Pendiente', 'En Local', 'Entregado', 'Cancelado', 'Todos'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    statusFilter === st
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'En Local' ? 'Local' : st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Orders List & Agenda Switcher */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-500" />
            <h3 className="font-playfair text-lg font-bold text-slate-800">
              Pedidos Agendados ({statusFilter})
            </h3>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'lista' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Vista Tarjetas</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'agenda' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agenda de Fechas</span>
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-2" />
            <p>No hay pedidos con el estado &quot;{statusFilter}&quot;.</p>
          </div>
        ) : viewMode === 'lista' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map(o => {
              const isPending = o.status === 'Pendiente'
              const isDelivered = o.status === 'Entregado'
              const dateFormatted = o.delivery_date
                ? new Date(o.delivery_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'Sin fecha fijada'
              const orderDateFormatted = o.created_at
                ? new Date(o.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : ''

              const depositAmt = o.deposit || 0
              const pendingAmt = o.pending_balance ?? Math.max(0, o.total_price - depositAmt)

              return (
                <div
                  key={o.id}
                  className={`p-5 rounded-3xl border transition-all bg-white flex flex-col justify-between ${
                    isPending ? 'border-pink-200 shadow-sm' : isDelivered ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-pink-500" />
                        {o.customer_name}
                      </span>
                      
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        isPending ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        isDelivered ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                        {isDelivered && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {o.status}
                      </span>
                    </div>

                    {/* Product & details */}
                    <div className="p-3 rounded-2xl bg-pink-50/50 border border-pink-100 mb-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-800">
                          {o.quantity}x {o.product_name}
                        </p>
                        {o.total_price > 0 && (
                          <p className="text-xs font-black text-pink-600">{fmt(o.total_price)}</p>
                        )}
                      </div>

                      {/* Deposit & Pending Badges */}
                      <div className="flex items-center gap-2 pt-1 border-t border-pink-100/60 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 font-bold border border-emerald-200">
                          💚 Señado: {fmt(depositAmt)}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-pink-100/80 text-pink-800 font-bold border border-pink-200">
                          ⏳ Resta: {fmt(pendingAmt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        {orderDateFormatted && (
                          <span>Pedido: <strong className="text-slate-700">{orderDateFormatted}</strong></span>
                        )}
                        <span>Entrega: <strong className="text-slate-700">{dateFormatted}</strong></span>
                      </div>
                      {o.notes && (
                        <p className="text-[11px] text-slate-600 italic pt-1 border-t border-pink-100/60 mt-1">
                          &quot;{o.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {isPending && (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => handleDeliverAndSell(o, true)}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
                          title="Registra el pedido como entregado, cobrado y suma las ganancias al resumen"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>🚀 Entregar y Registrar Venta Cobrada</span>
                        </button>

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            onClick={() => handleSendToFamilyStore(o)}
                            className="py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[11px] flex items-center justify-center gap-1"
                            title="Descuenta stock de insumos y lo deja exhibido en el local familiar por rendir"
                          >
                            <Store className="w-3.5 h-3.5 text-purple-600" />
                            <span>🏪 Dejar en Local</span>
                          </button>

                          <button
                            onClick={() => handleDeliverAndSell(o, false)}
                            className="py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] flex items-center justify-center gap-1"
                            title="Registra como entregado pero con saldo pendiente"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pendiente Cobro</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {o.status === 'En Local' && (
                      <div className="p-2 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-purple-900 font-bold">
                          <span className="flex items-center gap-1"><Store className="w-3.5 h-3.5 text-purple-600" /> Exhibido en Local</span>
                          <span>Pendiente de Rendición</span>
                        </div>
                        <button
                          onClick={() => handleSettleFamilyStoreOrder(o)}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>💰 Cobrar Rendición de Local ({fmt(o.total_price)})</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {isPending && (
                        <button
                          onClick={() => handleCancelOrder(o)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1"
                          title="Cancelar pedido"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteOrder(o.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Agenda / Date Grouped View */
          <div className="space-y-6">
            {Object.keys(ordersGroupedByDate).sort().map(dateKey => {
              const items = ordersGroupedByDate[dateKey]
              const titleDate = dateKey === 'sin-fecha'
                ? '📅 A Coordinar / Sin Fecha Específica'
                : `🗓️ Entregas para el ${new Date(dateKey + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`

              return (
                <div key={dateKey} className="p-4 rounded-2xl bg-pink-50/30 border border-pink-100 space-y-3">
                  <div className="flex items-center justify-between border-b border-pink-100 pb-2">
                    <h4 className="font-bold text-sm text-slate-800 capitalize flex items-center gap-1.5">
                      {titleDate}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-100 text-pink-700">
                      {items.length} encargos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(o => (
                      <div key={o.id} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs text-slate-900">{o.customer_name}</p>
                          <p className="text-[11px] text-pink-600 font-semibold">{o.quantity}x {o.product_name}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800">{fmt(o.total_price)}</span>
                          <span className="block text-[10px] text-emerald-600 font-bold">Seña: {fmt(o.deposit || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Production Consolidation Modal (Mise en Place) */}
      {isProductionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow p-6 rounded-3xl border border-purple-200 bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-playfair text-lg font-bold text-slate-900">Consolidado de Producción</h3>
                  <p className="text-xs text-slate-500">Mise en Place total para tus pedidos pendientes</p>
                </div>
              </div>

              <button
                onClick={() => setIsProductionModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badges Overview */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-center">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Pedidos Pendientes</span>
                <span className="text-sm font-black text-purple-700">{productionData.totalOrdersCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Postres a Elaborar</span>
                <span className="text-sm font-black text-pink-600">{productionData.totalItemsCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Est. Compras</span>
                <span className="text-sm font-black text-emerald-600">{fmt(productionData.totalEstimatedShoppingCost)}</span>
              </div>
            </div>

            {/* Ingredients Requirements List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block mb-2">Ingredientes Requeridos en Stock</span>
              {productionData.requirements.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">No hay pedidos pendientes con recetas vinculadas.</p>
              ) : (
                productionData.requirements.map(req => (
                  <div
                    key={req.ingredientName}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      req.isLowStock ? 'bg-rose-50/60 border-rose-200 text-rose-900' : 'bg-slate-50/70 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {req.isLowStock ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                      <div>
                        <span className="font-bold">{req.ingredientName}</span>
                        <span className="text-[10px] text-slate-500 block">Stock actual: {req.currentStock} {req.unit}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm">{req.requiredQty} {req.unit}</span>
                      {req.isLowStock && (
                        <span className="text-[10px] font-bold text-rose-600 block">Faltan {Math.round(req.requiredQty - req.currentStock)} {req.unit}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={handleShareShoppingListWhatsApp}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Lista de Compras a WhatsApp</span>
              </button>

              <button
                onClick={() => setIsProductionModalOpen(false)}
                className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Dessert Visual Recognition Scanner Modal */}
      <DessertScannerModal
        isOpen={isAIDessertModalOpen}
        onClose={() => setIsAIDessertModalOpen(false)}
        products={products}
        onConfirmBatch={async (detectedDesserts) => {
          for (const item of detectedDesserts) {
            await handleSendToFamilyStore({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
              customer_name: 'Local Familiar (Producción Lote IA)',
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.qty,
              total_price: ((products.find(p => p.id === item.productId || p.name === item.productName)?.price) || 4500) * item.qty,
              status: 'En Local',
              created_at: new Date().toISOString()
            })
          }
          showToast(`🎉 ¡${detectedDesserts.length} postres detectados por IA y entregados al Local Familiar!`)
        }}
        showToast={showToast}
      />
    </div>
  )
}


