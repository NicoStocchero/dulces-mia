'use client'

import React, { useState, useMemo, useRef } from 'react'
import { Product, Sale, Order, Customer, Recipe, IngredientMaster } from '@/lib/types'
import { NumericStepper } from '@/components/ui/NumericStepper'
import { DessertScannerModal } from '@/components/ui/DessertScannerModal'
import { calculateProductionRequirements } from '@/lib/production'
import { deductRecipeStock } from '@/lib/supabase'
import {
  ShoppingBag, Calendar, DollarSign, TrendingUp, PlusCircle, User, UserPlus,
  Clock, CheckCircle2, Tag, Filter, Sparkles, Trash2, Camera, ClipboardList,
  Store, X, MessageCircle, AlertCircle, Wallet, ListFilter, Search, Package,
  ChevronRight, ArrowRight, HelpCircle
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface ComercialTabProps {
  products: Product[]
  sales: Sale[]
  orders: Order[]
  customers: Customer[]
  recipes?: Recipe[]
  ingredients?: IngredientMaster[]
  initialMode?: 'ventas' | 'pedidos'
  onRecordSale: (sale: Omit<Sale, 'id'>) => Promise<void>
  onToggleSalePaid?: (id: string, paid: boolean, paid_at?: string) => Promise<void>
  onDeleteSale: (id: string) => Promise<void>
  onSaveOrder: (order: Omit<Order, 'id'> & { id?: string }) => Promise<void>
  onDeleteOrder: (id: string) => Promise<void>
  onSaveCustomer?: (customer: Omit<Customer, 'id'> & { id?: string }) => Promise<Customer | null | void>
  showToast: (msg: string) => void
}

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function ComercialTab({
  products,
  sales,
  orders,
  customers,
  recipes = [],
  ingredients: propIngredients = [],
  initialMode = 'ventas',
  onRecordSale,
  onToggleSalePaid,
  onDeleteSale,
  onSaveOrder,
  onDeleteOrder,
  onSaveCustomer,
  showToast
}: ComercialTabProps) {
  // Form Type: 'directa' (Venta Mostrador) vs 'pedido' (Pedido Anticipado)
  const [formType, setFormType] = useState<'directa' | 'pedido'>(initialMode === 'pedidos' ? 'pedido' : 'directa')

  // Shared Form Fields
  const [customerId, setCustomerId] = useState<string>('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [customProductName, setCustomProductName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customCost, setCustomCost] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().split('T')[0])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deposit, setDeposit] = useState('')
  const [notes, setNotes] = useState('')
  const [isDirectPaid, setIsDirectPaid] = useState(true)
  const [loading, setLoading] = useState(false)

  // Quick Customer Creation Modal State
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false)
  const [quickCustName, setQuickCustName] = useState('')
  const [quickCustPhone, setQuickCustPhone] = useState('')
  const [quickCustAddress, setQuickCustAddress] = useState('')
  const [quickCustBirthday, setQuickCustBirthday] = useState('')
  const [quickCustNotes, setQuickCustNotes] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([])

  // Filter & View State
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendientes' | 'En Local' | 'Cobradas' | 'Por Cobrar'>('Todos')
  const [viewMode, setViewMode] = useState<'tabla' | 'tarjetas' | 'agenda'>('tabla')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  // Modals
  const [isAIDessertModalOpen, setIsAIDessertModalOpen] = useState(false)
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false)
  const [payingSaleModal, setPayingSaleModal] = useState<Sale | null>(null)
  const [modalPaidAtDate, setModalPaidAtDate] = useState(() => new Date().toISOString().split('T')[0])

  const activeProducts = useMemo(() => products.filter(p => p.active !== false), [products])
  const selectedProduct = activeProducts.find(p => p.id === selectedProductId)

  // Combined customers (props + local immediate cache)
  const allCustomers = useMemo(() => {
    const map = new Map<string, Customer>()
    customers.forEach(c => map.set(c.id, c))
    recentCustomers.forEach(c => map.set(c.id, c))
    return Array.from(map.values())
  }, [customers, recentCustomers])

  // Get selected customer object
  const selectedCustomer = useMemo(() => {
    if (!customerId) return null
    return allCustomers.find(c => c.id === customerId || c.name === customerId)
  }, [customerId, allCustomers])

  // Calculated values
  const parsedCustomPrice = parseFloat(String(customPrice).replace(',', '.')) || 0
  const parsedCustomCost = parseFloat(String(customCost).replace(',', '.')) || 0

  const unitPrice = selectedProduct ? selectedProduct.price : parsedCustomPrice
  const unitCost = selectedProduct ? (selectedProduct.cost || 0) : parsedCustomCost
  const totalPrice = unitPrice * quantity
  const totalCost = unitCost * quantity
  const totalProfit = totalPrice - totalCost

  const handleSetDepositPercentage = (pct: number) => {
    const amount = Math.round(totalPrice * (pct / 100))
    setDeposit(amount.toString())
  }

  // Quick Customer Submit
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCustName.trim()) {
      showToast('⚠️ Ingresá el nombre del cliente')
      return
    }

    setSavingCustomer(true)
    try {
      const created = await onSaveCustomer?.({
        name: quickCustName.trim(),
        phone: quickCustPhone.trim() || undefined,
        address: quickCustAddress.trim() || undefined,
        birthday: quickCustBirthday || undefined,
        notes: quickCustNotes.trim() || undefined
      })

      showToast(`✨ Cliente "${quickCustName.trim()}" guardado en el CRM!`)
      // Auto select newly created customer immediately
      if (created && (created as Customer).id) {
        setRecentCustomers(prev => [created as Customer, ...prev])
        setCustomerId((created as Customer).id)
      } else {
        setCustomerId(quickCustName.trim())
      }

      // Reset quick form
      setQuickCustName('')
      setQuickCustPhone('')
      setQuickCustAddress('')
      setQuickCustBirthday('')
      setQuickCustNotes('')
      setIsQuickCustomerOpen(false)
    } catch (err) {
      showToast('⚠️ Error guardando el cliente')
    } finally {
      setSavingCustomer(false)
    }
  }

  const isSubmittingRef = useRef(false)

  // Handle Submit Form (either Direct Sale or Pre-Order)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || isSubmittingRef.current) return

    const pName = selectedProduct ? selectedProduct.name : customProductName.trim()
    if (!pName) {
      showToast('⚠️ Seleccioná un postre o ingresá el nombre del encargo')
      return
    }

    if (!selectedProduct && parsedCustomPrice <= 0) {
      showToast('⚠️ Ingresá el precio acordado para este encargo a medida')
      return
    }

    if (totalPrice <= 0) {
      showToast('⚠️ El monto total debe ser mayor a $0')
      return
    }

    // Customer resolution
    let finalCustName = 'Consumidor Final'
    let finalCustId: string | undefined = undefined

    if (selectedCustomer) {
      finalCustName = selectedCustomer.name
      finalCustId = selectedCustomer.id
    } else if (customerId && customerId !== '__consumidor_final__') {
      finalCustName = customerId
    }

    if (formType === 'pedido' && (!finalCustId || finalCustName === 'Consumidor Final')) {
      showToast('⚠️ Para un pedido anticipado seleccioná o creá el cliente en el CRM')
      return
    }

    if (formType === 'pedido' && !deliveryDate) {
      showToast('⚠️ Ingresá la fecha de entrega del pedido')
      return
    }

    const parsedDeposit = parseFloat(String(deposit).replace(',', '.')) || 0
    if (formType === 'pedido' && parsedDeposit > totalPrice) {
      showToast('⚠️ La seña no puede ser mayor al precio total del pedido')
      return
    }

    isSubmittingRef.current = true
    setLoading(true)

    try {
      if (formType === 'directa') {
        // Direct counter sale
        const revenue = totalPrice
        const cost = totalCost
        const profit = revenue - cost
        const dateISO = recordDate ? new Date(recordDate + 'T12:00:00').toISOString() : new Date().toISOString()

        await onRecordSale({
          product_id: selectedProduct?.id,
          product_name: pName,
          customer_id: finalCustId,
          customer_name: finalCustName,
          quantity,
          revenue,
          cost,
          profit,
          paid: isDirectPaid,
          paid_at: isDirectPaid ? dateISO : undefined,
          date: dateISO
        })

        // Auto deduct recipe stock if linked
        if (selectedProduct?.recipe_id) {
          await deductRecipeStock(selectedProduct.recipe_id, quantity, recipes, propIngredients)
        }

        if (isDirectPaid) {
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#ec4899', '#10b981', '#f59e0b', '#ffffff']
          })
          showToast(`✨ Venta de ${quantity}x ${pName} a ${finalCustName} registrada y cobrada!`)
        } else {
          showToast(`📌 Venta a ${finalCustName} registrada como PENDIENTE DE COBRO`)
        }
      } else {
        // Advance pre-order
        const pendingBalance = Math.max(0, totalPrice - parsedDeposit)
        const creationDate = recordDate ? new Date(recordDate + 'T12:00:00').toISOString() : new Date().toISOString()

        await onSaveOrder({
          customer_id: finalCustId,
          customer_name: finalCustName,
          product_id: selectedProduct?.id,
          product_name: pName,
          quantity,
          total_price: totalPrice,
          cost: totalCost,
          deposit: parsedDeposit,
          pending_balance: pendingBalance,
          delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
          status: 'Pendiente',
          notes: notes.trim(),
          created_at: creationDate
        })

        showToast(`📅 Pedido agendado a nombre de ${finalCustName}!`)
      }

      // Reset input fields
      setSelectedProductId('')
      setCustomProductName('')
      setCustomPrice('')
      setCustomCost('')
      setQuantity(1)
      setDeposit('')
      setDeliveryDate('')
      setNotes('')
      setIsDirectPaid(true)
    } catch (err) {
      console.error(err)
      showToast('⚠️ Error al registrar la operación')
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }

  // Deliver and Sell an order in one click
  const handleDeliverAndSellOrder = async (order: Order, isPaid: boolean) => {
    const p = products.find(prod => prod.id === order.product_id || prod.name === order.product_name)
    const cost = order.cost || ((p?.cost || 0) * order.quantity)
    const revenue = order.total_price || ((p?.price || 0) * order.quantity)
    const profit = revenue - cost

    // 1. Record Sale with customer details
    await onRecordSale({
      product_id: p?.id,
      product_name: order.product_name,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      quantity: order.quantity,
      revenue,
      cost,
      profit,
      paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : undefined,
      date: new Date().toISOString()
    })

    // 2. Mark order as Entregado
    await onSaveOrder({
      ...order,
      status: 'Entregado'
    })

    // 3. Deduct ingredient stock if linked
    if (p?.recipe_id) {
      await deductRecipeStock(p.recipe_id, order.quantity, recipes, propIngredients)
    }

    if (isPaid) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ec4899', '#10b981', '#ffffff']
      })
      showToast(`✨ Pedido de ${order.customer_name} entregado y registrado como VENTA COBRADA!`)
    } else {
      showToast(`📌 Pedido entregado y registrado como VENTA PENDIENTE DE COBRO`)
    }
  }

  // Send Order to Family Store (Consignment)
  const handleSendToFamilyStore = async (order: Order) => {
    const p = products.find(prod => prod.id === order.product_id || prod.name === order.product_name)
    if (p?.recipe_id) {
      await deductRecipeStock(p.recipe_id, order.quantity, recipes, propIngredients)
    }
    await onSaveOrder({ ...order, status: 'En Local' })
    showToast(`🏪 Postre "${order.product_name}" exhibido en el Local Familiar!`)
  }

  // Settle Family Store Order (Cash received)
  const handleSettleFamilyStore = async (order: Order) => {
    const p = products.find(prod => prod.id === order.product_id || prod.name === order.product_name)
    const cost = order.cost || ((p?.cost || 0) * order.quantity)
    const revenue = order.total_price || ((p?.price || 0) * order.quantity)
    const profit = revenue - cost

    await onRecordSale({
      product_id: p?.id,
      product_name: order.product_name,
      customer_name: 'Local Familiar (Rendición)',
      quantity: order.quantity,
      revenue,
      cost,
      profit,
      paid: true,
      paid_at: new Date().toISOString(),
      date: new Date().toISOString()
    })

    await onSaveOrder({ ...order, status: 'Entregado' })

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10b981', '#ec4899', '#ffffff']
    })
    showToast(`💰 Rendición del Local cobrada! +${fmt(revenue)} registrados en ventas.`)
  }

  // Share WhatsApp Budget for an Order
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

    // Customer phone lookup
    let cleanPhone = ''
    if (order.customer_id) {
      const cust = allCustomers.find(c => c.id === order.customer_id)
      if (cust?.phone) {
        cleanPhone = cust.phone.replace(/\D/g, '')
        if (cleanPhone) {
          cleanPhone = cleanPhone.replace(/^0+/, '').replace(/^15/, '')
          if (!cleanPhone.startsWith('54')) {
            cleanPhone = '549' + cleanPhone
          }
        }
      }
    }

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    showToast('💬 Abriendo WhatsApp con el presupuesto...')
  }

  // Production Requirements
  const productionData = useMemo(() => {
    return calculateProductionRequirements(orders, products, recipes, propIngredients)
  }, [orders, products, recipes, propIngredients])

  // Filter Sales list with date, query and status
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.date).getTime()
      const start = dateStart ? new Date(dateStart).setHours(0,0,0,0) : null
      const end = dateEnd ? new Date(dateEnd).setHours(23,59,59,999) : null
      const matchesDate = (!start || d >= start) && (!end || d <= end)
      if (!matchesDate) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = s.product_name.toLowerCase().includes(q)
        const matchesCust = (s.customer_name || '').toLowerCase().includes(q)
        if (!matchesName && !matchesCust) return false
      }

      if (statusFilter === 'Cobradas') return s.paid !== false
      if (statusFilter === 'Por Cobrar') return s.paid === false
      return true
    })
  }, [sales, dateStart, dateEnd, searchQuery, statusFilter])

  // Pending Orders
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status === 'Pendiente')
  }, [orders])

  const familyStoreOrders = useMemo(() => {
    return orders.filter(o => o.status === 'En Local')
  }, [orders])

  // Aggregate Metrics
  const totalRevenueCobradas = useMemo(() => {
    return sales.filter(s => s.paid !== false).reduce((acc, s) => acc + s.revenue, 0)
  }, [sales])

  const totalCostCobradas = useMemo(() => {
    return sales.filter(s => s.paid !== false).reduce((acc, s) => {
      const c = s.cost || 0
      if (c > 0) return acc + c
      const p = products.find(prod => prod.id === s.product_id || prod.name === s.product_name)
      return acc + ((p?.cost || 0) * s.quantity)
    }, 0)
  }, [sales, products])

  const totalProfitCobradas = totalRevenueCobradas - totalCostCobradas
  const totalPendingMoney = useMemo(() => {
    return sales.filter(s => s.paid === false).reduce((acc, s) => acc + s.revenue, 0)
  }, [sales])

  return (
    <div className="space-y-6">
      {/* Top Banner / Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Unified Commercial Entry Form */}
        <div className="lg:col-span-7 glass-panel-glow p-6 rounded-3xl border border-pink-200/60 bg-white/85">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-playfair text-xl font-bold text-gradient-pink">Módulo Comercial Unificado</h2>
                <p className="text-xs text-slate-500">Cargá ventas directas o agendá pedidos con cliente y costo trazable</p>
              </div>
            </div>

            {/* Mode Toggle Switcher */}
            <div className="flex items-center p-1 bg-pink-50/80 rounded-2xl border border-pink-200/60">
              <button
                type="button"
                onClick={() => setFormType('directa')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  formType === 'directa'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Venta Mostrador</span>
              </button>

              <button
                type="button"
                onClick={() => setFormType('pedido')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  formType === 'pedido'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Pedido Anticipado</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* 1. Client Dropdown + Quick "+ Nuevo Cliente" Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-pink-500" />
                  <span>Cliente asociado {formType === 'pedido' ? '*' : '(Opcional / Mostrador)'}</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(true)}
                  className="text-xs font-extrabold text-pink-600 hover:text-pink-700 flex items-center gap-1 underline transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Agregar nuevo cliente</span>
                </button>
              </div>

              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border-pink-200"
              >
                <option value="">-- Consumidor Final / Mostrador (Venta Rápida) --</option>
                {allCustomers.map(c => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name} {c.phone ? `(${c.phone})` : ''} {c.favorite_dessert ? `• Le gusta: ${c.favorite_dessert}` : ''}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="mt-1.5 p-2 rounded-xl bg-pink-50/60 border border-pink-100 flex items-center justify-between text-[11px] text-pink-800">
                  <span className="font-semibold">Cliente CRM: <strong>{selectedCustomer.name}</strong></span>
                  {selectedCustomer.phone && (
                    <span className="text-slate-500">Tel: {selectedCustomer.phone}</span>
                  )}
                  {selectedCustomer.address && (
                    <span className="text-slate-500 truncate max-w-[150px]">{selectedCustomer.address}</span>
                  )}
                </div>
              )}
            </div>

            {/* 2. Product selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-pink-500" />
                <span>Postre o Elaboración *</span>
              </label>

              <select
                value={selectedProductId}
                onChange={e => {
                  setSelectedProductId(e.target.value)
                  if (e.target.value) setCustomProductName('')
                }}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 bg-white border-pink-200"
              >
                <option value="">-- Seleccionar producto del catálogo --</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.emoji || '🍰'} {p.name} [{p.category || 'General'}] — Venta: {fmt(p.price)} | Costo: {fmt(p.cost)}
                  </option>
                ))}
              </select>

              {!selectedProductId && (
                <div className="space-y-2 mt-2">
                  <input
                    type="text"
                    data-testid="custom-product-name"
                    placeholder="O escribí un encargo a medida (Ej: Torta Temática Sirenita)..."
                    value={customProductName}
                    onChange={e => setCustomProductName(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                  {customProductName.trim().length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-pink-50/50 border border-pink-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Precio Unitario Acordado ($) *
                        </label>
                        <input
                          type="text"
                          data-testid="custom-product-price"
                          inputMode="decimal"
                          placeholder="Ej: 35000"
                          value={customPrice}
                          onChange={e => setCustomPrice(e.target.value)}
                          className="w-full glass-input rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border-pink-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Costo Insumos Estimado ($ Opcional)
                        </label>
                        <input
                          type="text"
                          data-testid="custom-product-cost"
                          inputMode="decimal"
                          placeholder="Ej: 14000"
                          value={customCost}
                          onChange={e => setCustomCost(e.target.value)}
                          className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Quantity & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <NumericStepper value={quantity} onChange={setQuantity} label="Cantidad" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <span>Fecha de Registro</span>
                </label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={e => setRecordDate(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              {formType === 'pedido' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-pink-500" />
                    <span>Fecha de Entrega</span>
                  </label>
                  <input
                    type="date"
                    data-testid="delivery-date-input"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de Cobro</label>
                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsDirectPaid(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isDirectPaid
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Cobrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDirectPaid(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        !isDirectPaid
                          ? 'bg-amber-500 text-white border-amber-400 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Pendiente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Deposit Section (for Pre-orders) */}
            {formType === 'pedido' && (
              <div className="p-3.5 rounded-2xl bg-pink-50/60 border border-pink-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Seña / Anticipo Recibido ($)</span>
                  </label>
                  {totalPrice > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetDepositPercentage(0)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200"
                      >
                        0%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDepositPercentage(50)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                      >
                        50% ({fmt(totalPrice * 0.5)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDepositPercentage(100)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-500 text-white"
                      >
                        100%
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <input
                    type="number"
                    data-testid="deposit-input"
                    placeholder="0"
                    value={deposit}
                    onChange={e => setDeposit(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white border-pink-200"
                  />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Resta Cobrar al Entregar</span>
                    <span className="text-sm font-black text-emerald-600">
                      {fmt(Math.max(0, totalPrice - (parseFloat(deposit) || 0)))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Cost, Price & Profit Preview Box */}
            {(selectedProduct || (customProductName.trim().length > 0 && totalPrice > 0)) && (
              <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-pink-700">
                  <span>Desglose Financiero de la Operación</span>
                  <span>Fórmula: Monto Venta - Costo = Ganancia</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-pink-200/60">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Monto Venta</span>
                    <span className="text-sm font-black text-slate-800">{fmt(totalPrice)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Costo de Producción</span>
                    <span className="text-sm font-black text-rose-500">{fmt(totalCost)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Ganancia Neta</span>
                    <span className="text-sm font-black text-emerald-600">{fmt(totalProfit)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {formType === 'pedido' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Detalles del Encargo</label>
                <input
                  type="text"
                  placeholder="Ej: Con velita, entrega después de las 18hs, sin nueces..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!selectedProductId && !customProductName.trim())}
              className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] ${
                formType === 'directa'
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 shadow-pink-500/25'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {loading
                  ? 'Registrando...'
                  : formType === 'directa'
                  ? 'Registrar Venta Directa'
                  : 'Agendar Pedido'}
              </span>
            </button>
          </form>
        </div>

        {/* Right: Quick Commercial Metrics & Production Tools */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Main Sales Metrics Summary Cards */}
          <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Balance Comercial</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Ventas Cobradas
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white border border-pink-100 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block font-semibold">Total Venta</span>
                <span className="text-sm font-black text-slate-900">{fmt(totalRevenueCobradas)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-semibold">Costo Total</span>
                <span className="text-sm font-black text-rose-500">{fmt(totalCostCobradas)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-semibold">Ganancia</span>
                <span className="text-sm font-black text-emerald-600">{fmt(totalProfitCobradas)}</span>
              </div>
            </div>

            {totalPendingMoney > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Pendiente por Cobrar</span>
                </span>
                <span className="font-black text-amber-900">{fmt(totalPendingMoney)}</span>
              </div>
            )}
          </div>

          {/* Quick Production & Camera Tools */}
          <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Taller & Producción</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-pink-100 text-pink-700">
                {pendingOrders.length} Encargos
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsAIDessertModalOpen(true)}
                className="py-2.5 px-3 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
              >
                <Camera className="w-4 h-4" />
                <span>Reconocer Postres</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProductionModalOpen(true)}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
              >
                <ClipboardList className="w-4 h-4 text-pink-300" />
                <span>Mise en Place</span>
              </button>
            </div>
          </div>

          {/* Pending Orders Live Queue preview */}
          {pendingOrders.length > 0 && (
            <div className="glass-panel p-4 rounded-3xl border border-pink-200/50 bg-white/70 space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-pink-500" />
                <span>Próximas Entregas ({pendingOrders.length})</span>
              </span>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {pendingOrders.slice(0, 4).map(o => (
                  <div key={o.id} className="p-2.5 rounded-xl bg-pink-50/50 border border-pink-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{o.customer_name}</span>
                      <span className="text-[10px] text-pink-600 font-semibold">{o.quantity}x {o.product_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleShareWhatsAppBudget(o)}
                        className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                        title="Enviar presupuesto por WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeliverAndSellOrder(o, true)}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs"
                      >
                        ✓ Entregar & Cobrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unified Filter & Navigation Switcher */}
      <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-pink-50/80 rounded-2xl border border-pink-200/60 overflow-x-auto">
            {(['Todos', 'Pendientes', 'En Local', 'Cobradas', 'Por Cobrar'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'Pendientes' ? `Pendientes (${pendingOrders.length})` :
                 st === 'En Local' ? `En Local (${familyStoreOrders.length})` : st}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('tabla')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'tabla' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Tabla de Ventas</span>
            </button>

            <button
              onClick={() => setViewMode('tarjetas')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'tarjetas' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Tarjetas Pedidos</span>
            </button>
          </div>
        </div>

        {/* Search & Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1 border-t border-pink-100/60">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente o postre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
            />
          </div>

          <div className="md:col-span-3">
            <input
              type="date"
              placeholder="Desde"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
            />
          </div>

          <div className="md:col-span-3">
            <input
              type="date"
              placeholder="Hasta"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area: Table vs Cards */}
      {viewMode === 'tabla' ? (
        /* ── TABLA DE VENTAS CON COLUMNA COSTO (Requerimiento 2.1) ── */
        <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/85">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-playfair text-lg font-bold text-slate-800">
                Historial de Ventas & Balance Comercial
              </h3>
              <p className="text-xs text-pink-600 font-semibold flex items-center gap-1 mt-0.5">
                <span>Fórmula: Monto Venta ($) - Costo ($) = Ganancia ($)</span>
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium">{filteredSales.length} registros</span>
          </div>

          {filteredSales.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-2" />
              <p>No se encontraron registros de ventas con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pink-100 text-slate-500 font-semibold bg-pink-50/40">
                    <th className="py-3 px-3">Fecha & Hora</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3">Producto</th>
                    <th className="py-3 px-3 text-center">Cant.</th>
                    <th className="py-3 px-3 text-right">Monto Venta</th>
                    <th className="py-3 px-3 text-right text-rose-600 font-bold bg-rose-50/50">Costo Producción</th>
                    <th className="py-3 px-3 text-right text-emerald-700 font-bold bg-emerald-50/50">Ganancia</th>
                    <th className="py-3 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {filteredSales.map(s => {
                    const p = products.find(prod => prod.id === s.product_id || prod.name === s.product_name)
                    const isPaidSale = s.paid !== false
                    const rowCost = s.cost || ((p?.cost || 0) * s.quantity)
                    const rowProfit = s.profit || (s.revenue - rowCost)
                    const dateFormatted = new Date(s.date).toLocaleDateString('es-AR', {
                      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                    })

                    return (
                      <tr key={s.id} className="hover:bg-pink-50/50 transition-colors">
                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                          <div>{dateFormatted}</div>
                        </td>

                        {/* Customer Column */}
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 block flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                            <span className="truncate max-w-[140px]">{s.customer_name || 'Consumidor Final'}</span>
                          </span>
                        </td>

                        {/* Payment Status Column */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col items-start gap-1">
                            <button
                              onClick={() => {
                                if (!isPaidSale) {
                                  setPayingSaleModal(s)
                                  setModalPaidAtDate(new Date().toISOString().split('T')[0])
                                } else {
                                  onToggleSalePaid?.(s.id, false)
                                }
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                                isPaidSale
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200/60'
                                  : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200/60'
                              }`}
                              title="Tocar para alternar estado de pago"
                            >
                              {isPaidSale ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                              <span>{isPaidSale ? 'Cobrado' : 'Por Cobrar'}</span>
                            </button>
                          </div>
                        </td>

                        {/* Product */}
                        <td className="py-3.5 px-3 font-semibold text-slate-800">
                          <span className="mr-1">{p?.emoji || '🍰'}</span>
                          {s.product_name}
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-3 text-center font-bold text-pink-600">{s.quantity}</td>

                        {/* Monto Venta */}
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900">{fmt(s.revenue)}</td>

                        {/* Columna Explícita: Costo de Producción */}
                        <td className="py-3.5 px-3 text-right font-semibold text-rose-600 bg-rose-50/30">
                          {fmt(rowCost)}
                        </td>

                        {/* Ganancia Neta */}
                        <td className="py-3.5 px-3 text-right font-black text-emerald-600 bg-emerald-50/30">
                          {fmt(rowProfit)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => onDeleteSale(s.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── VISTA TARJETAS DE PEDIDOS ── */
        <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/85">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-playfair text-lg font-bold text-slate-800">
              Seguimiento de Pedidos ({statusFilter})
            </h3>
            <span className="text-xs text-slate-500 font-medium">{orders.length} pedidos</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map(o => {
              const isPending = o.status === 'Pendiente'
              const isEnLocal = o.status === 'En Local'
              const isDelivered = o.status === 'Entregado'

              return (
                <div
                  key={o.id}
                  data-testid="order-card"
                  className={`p-5 rounded-3xl border transition-all bg-white flex flex-col justify-between ${
                    isPending ? 'border-pink-200 shadow-sm' : isEnLocal ? 'border-purple-200 bg-purple-50/20' : 'border-slate-200 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-pink-500" />
                        {o.customer_name}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isPending ? 'bg-amber-100 text-amber-700' : isEnLocal ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {o.status}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-pink-50/50 border border-pink-100 mb-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{o.quantity}x {o.product_name}</span>
                        <span className="text-xs font-black text-pink-600">{fmt(o.total_price)}</span>
                      </div>
                      {o.deposit ? (
                        <div className="flex items-center justify-between text-[11px] text-emerald-700">
                          <span>Seña abonada: {fmt(o.deposit)}</span>
                          <span>Saldo pendiente: {fmt(o.pending_balance || 0)}</span>
                        </div>
                      ) : null}
                      {o.delivery_date && (
                        <span className="text-[10px] text-slate-500 block pt-0.5">
                          Entrega: {new Date(o.delivery_date).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleDeliverAndSellOrder(o, true)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Entregar & Cobrar</span>
                        </button>
                        <button
                          onClick={() => handleShareWhatsAppBudget(o)}
                          data-testid="order-card-wa-btn"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                          title="Enviar presupuesto por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {isEnLocal && (
                      <button
                        onClick={() => handleSettleFamilyStore(o)}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Cobrar Rendición Local</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteOrder(o.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      title="Eliminar pedido"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-md w-full border border-pink-300 bg-white shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-pink-500" />
                <h3 className="font-playfair text-lg font-bold text-slate-900">Agregar Cliente al CRM</h3>
              </div>
              <button onClick={() => setIsQuickCustomerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Registrá el cliente ahora sin perder los datos de la venta o pedido en curso.
            </p>

            <form onSubmit={handleQuickCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  data-testid="quick-cust-name"
                  placeholder="Ej: Carolina Gómez"
                  value={quickCustName}
                  onChange={e => setQuickCustName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    data-testid="quick-cust-phone"
                    placeholder="Ej: 11 2345-6789 o 3514433221"
                    value={quickCustPhone}
                    onChange={e => setQuickCustPhone(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cumpleaños</label>
                  <input
                    type="date"
                    value={quickCustBirthday}
                    onChange={e => setQuickCustBirthday(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección / Barrio</label>
                <input
                  type="text"
                  placeholder="Ej: B° Centro, Av. Colón 500"
                  value={quickCustAddress}
                  onChange={e => setQuickCustAddress(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Preferencias</label>
                <input
                  type="text"
                  placeholder="Ej: Le gusta la Cabsha, alérgica a frutos secos..."
                  value={quickCustNotes}
                  onChange={e => setQuickCustNotes(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs shadow-sm"
                >
                  {savingCustomer ? 'Guardando...' : 'Guardar y Vincular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation of Payment Date Modal */}
      {payingSaleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-sm w-full border border-pink-300 bg-white shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-playfair text-lg font-bold text-slate-900">Confirmar Cobro</h3>
              </div>
              <button onClick={() => setPayingSaleModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Vas a registrar como cobrada la venta de <strong>{payingSaleModal.quantity}x {payingSaleModal.product_name}</strong> ({fmt(payingSaleModal.revenue)}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-500" />
                <span>Fecha de cobro</span>
              </label>
              <input
                type="date"
                value={modalPaidAtDate}
                onChange={e => setModalPaidAtDate(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setPayingSaleModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const paidAtISO = modalPaidAtDate ? new Date(modalPaidAtDate + 'T12:00:00').toISOString() : new Date().toISOString()
                  await onToggleSalePaid?.(payingSaleModal.id, true, paidAtISO)
                  setPayingSaleModal(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
              >
                Confirmar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Consolidation Modal (Mise en place) */}
      {isProductionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow p-6 rounded-3xl border border-purple-200 bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                <h3 className="font-playfair text-lg font-bold text-slate-900">Consolidado de Producción (Mise en Place)</h3>
              </div>
              <button onClick={() => setIsProductionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-center text-xs">
              <div>
                <span className="text-slate-500 block">Pedidos Pendientes</span>
                <span className="text-sm font-black text-purple-700">{productionData.totalOrdersCount}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Postres a Hornear</span>
                <span className="text-sm font-black text-pink-600">{productionData.totalItemsCount}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Costo Est. Compras</span>
                <span className="text-sm font-black text-emerald-600">{fmt(productionData.totalEstimatedShoppingCost)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Insumos Requeridos en Cocina</span>
              {productionData.requirements.map(req => (
                <div key={req.ingredientName} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{req.ingredientName}</span>
                  <span className="font-black text-pink-600">{req.requiredQty} {req.unit}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsProductionModalOpen(false)}
                className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Dessert Camera Scanner Modal */}
      <DessertScannerModal
        isOpen={isAIDessertModalOpen}
        onClose={() => setIsAIDessertModalOpen(false)}
        products={products}
        onConfirmBatch={async (detected) => {
          for (const item of detected) {
            await handleSendToFamilyStore({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
              customer_name: 'Local Familiar (Lote Escaneado)',
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.qty,
              total_price: ((products.find(p => p.id === item.productId || p.name === item.productName)?.price) || 4500) * item.qty,
              status: 'En Local',
              created_at: new Date().toISOString()
            })
          }
          showToast(`🎉 ¡${detected.length} postres registrados en Local Familiar!`)
        }}
        showToast={showToast}
      />
    </div>
  )
}
