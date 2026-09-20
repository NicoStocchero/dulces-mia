'use client'

import React, { useState, useMemo } from 'react'
import { Product, Sale } from '@/lib/types'
import { NumericStepper } from '@/components/ui/NumericStepper'
import { PlusCircle, ShoppingBag, Trash2, Calendar, Filter, DollarSign, TrendingUp, Sparkles, Tag, CheckCircle2, Clock, X } from 'lucide-react'
import confetti from 'canvas-confetti'

interface VentasTabProps {
  products: Product[]
  sales: Sale[]
  onRecordSale: (sale: Omit<Sale, 'id'>) => Promise<void>
  onToggleSalePaid?: (id: string, paid: boolean, paid_at?: string) => Promise<void>
  onDeleteSale: (id: string) => Promise<void>
  showToast: (msg: string) => void
}

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function VentasTab({ products, sales, onRecordSale, onToggleSalePaid, onDeleteSale, showToast }: VentasTabProps) {
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todas')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'Todas' | 'Cobradas' | 'Pendientes'>('Todas')
  const [quantity, setQuantity] = useState(1)
  const [isPaid, setIsPaid] = useState(true)
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paidAtDate, setPaidAtDate] = useState(() => new Date().toISOString().split('T')[0])

  // Payment date modal state for table action
  const [payingSaleModal, setPayingSaleModal] = useState<Sale | null>(null)
  const [modalPaidAtDate, setModalPaidAtDate] = useState(() => new Date().toISOString().split('T')[0])

  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [loading, setLoading] = useState(false)

  const activeProducts = useMemo(() => products.filter(p => p.active !== false), [products])

  // Get unique list of categories from products
  const categories = useMemo(() => {
    const set = new Set<string>()
    activeProducts.forEach(p => {
      if (p.category) set.add(p.category)
      else set.add('General')
    })
    return ['Todas', ...Array.from(set)]
  }, [activeProducts])

  // Filtered products for dropdown and quick cards
  const categoryFilteredProducts = useMemo(() => {
    if (selectedCategoryFilter === 'Todas') return activeProducts
    return activeProducts.filter(p => (p.category || 'General') === selectedCategoryFilter)
  }, [activeProducts, selectedCategoryFilter])

  const selectedProduct = activeProducts.find(p => p.id === selectedProductId)

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) {
      showToast('⚠️ Seleccioná un postre del catálogo')
      return
    }
    if (quantity < 1) {
      showToast('⚠️ La cantidad debe ser al menos 1')
      return
    }

    setLoading(true)
    const revenue = selectedProduct.price * quantity
    const cost = selectedProduct.cost * quantity
    const profit = revenue - cost

    const selectedDateTime = saleDate ? new Date(saleDate + 'T12:00:00').toISOString() : new Date().toISOString()
    const selectedPaidAtTime = isPaid ? (paidAtDate ? new Date(paidAtDate + 'T12:00:00').toISOString() : new Date().toISOString()) : undefined

    await onRecordSale({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      revenue,
      cost,
      profit,
      paid: isPaid,
      paid_at: selectedPaidAtTime,
      date: selectedDateTime
    })

    if (isPaid) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ec4899', '#f472b6', '#fcd34d', '#ffffff']
      })
      showToast(`✨ Venta de ${quantity}x ${selectedProduct.name} registrada (Cobrada)!`)
    } else {
      showToast(`📌 Venta registrada como PENDIENTE DE COBRO`)
    }

    setSelectedProductId('')
    setQuantity(1)
    setIsPaid(true)
    setSaleDate(new Date().toISOString().split('T')[0])
    setPaidAtDate(new Date().toISOString().split('T')[0])
    setLoading(false)
  }

  // Filter sales by date & payment status
  const filteredSales = sales.filter(s => {
    const d = new Date(s.date).getTime()
    const start = dateStart ? new Date(dateStart).setHours(0,0,0,0) : null
    const end = dateEnd ? new Date(dateEnd).setHours(23,59,59,999) : null
    const dateMatches = (!start || d >= start) && (!end || d <= end)
    
    if (!dateMatches) return false
    if (paymentStatusFilter === 'Cobradas') return s.paid !== false
    if (paymentStatusFilter === 'Pendientes') return s.paid === false
    return true
  })

  const totalFilteredRevenue = filteredSales.reduce((acc, s) => acc + (s.paid !== false ? s.revenue : 0), 0)
  const totalFilteredProfit = filteredSales.reduce((acc, s) => acc + (s.paid !== false ? s.profit : 0), 0)
  const totalPendingMoney = sales.filter(s => s.paid === false).reduce((acc, s) => acc + s.revenue, 0)

  return (
    <div className="space-y-6">
      {/* Top Banner / Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Register Sale Card */}
        <div className="lg:col-span-7 glass-panel-glow p-6 rounded-3xl border border-pink-200/60 relative overflow-hidden bg-white/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-pink-100/70 text-pink-600 border border-pink-200">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-playfair text-xl font-bold text-gradient-pink">Nueva Venta</h2>
                <p className="text-xs text-slate-500">Filtrá por categoría, fecha y seleccioná el postre</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddSale} className="space-y-4">
            
            {/* Category Selector Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-pink-500" />
                <span>Filtrar Categoría</span>
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      selectedCategoryFilter === cat
                        ? 'bg-pink-500 text-white border-pink-400 shadow-sm'
                        : 'bg-pink-50/60 text-slate-600 hover:bg-pink-100/60 border-pink-200/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Tap Product Cards */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Selección Rápida
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {categoryFilteredProducts.map(p => {
                  const isSelected = selectedProductId === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProductId(p.id)}
                      className={`p-2.5 rounded-2xl text-left transition-all border flex items-center gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-300 shadow-md ring-2 ring-pink-400/50'
                          : 'bg-white hover:bg-pink-50/70 border-pink-200/80 text-slate-800'
                      }`}
                    >
                      <span className="text-2xl">{p.emoji || '🍰'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate leading-tight">{p.name}</p>
                        <p className={`text-[11px] font-semibold ${isSelected ? 'text-pink-100' : 'text-pink-600'}`}>
                          {fmt(p.price)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Product selection dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                O Elegir de la lista ({selectedCategoryFilter})
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 appearance-none cursor-pointer bg-white border-pink-200 focus:border-pink-500"
              >
                <option value="" className="text-slate-400">-- Seleccionar postre --</option>
                {categoryFilteredProducts.map(p => (
                  <option key={p.id} value={p.id} className="text-slate-800">
                    {p.emoji || '🍰'} {p.name} [{p.category || 'General'}] - {fmt(p.price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date, Quantity & Payment status toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <span>Fecha de la Venta</span>
                </label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              {/* Quantity */}
              <div>
                <NumericStepper value={quantity} onChange={setQuantity} label="Cantidad" />
              </div>

              {/* Payment status toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado del Pago</label>
                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                      isPaid
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cobrado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                      !isPaid
                        ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pendiente</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Price Preview Card */}
            {selectedProduct && (
              <div className="p-4 rounded-2xl bg-pink-50/80 border border-pink-200/80 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Precio Total</span>
                  <span className="text-base font-black text-pink-600">{fmt(selectedProduct.price * quantity)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Costo Base</span>
                  <span className="text-sm font-semibold text-rose-500">{fmt(selectedProduct.cost * quantity)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Ganancia Neta</span>
                  <span className="text-base font-black text-emerald-600">
                    {fmt((selectedProduct.price - selectedProduct.cost) * quantity)}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedProductId}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-sm shadow-md shadow-pink-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-pink-300/40 active:scale-[0.99]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{loading ? 'Registrando...' : 'Registrar Venta'}</span>
            </button>
          </form>
        </div>

        {/* Right: Quick Stats & Filter Card */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Quick Metrics */}
          <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 grid grid-cols-2 gap-4 bg-white/70">
            <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-200/60">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-xs font-semibold">Ventas Cobradas</span>
                <DollarSign className="w-4 h-4 text-pink-500" />
              </div>
              <p className="text-xl font-black text-slate-800">{fmt(totalFilteredRevenue)}</p>
              <span className="text-[10px] text-slate-500">{filteredSales.length} registros</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-xs font-semibold">Ganancia Neta</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-emerald-600">{fmt(totalFilteredProfit)}</p>
              <span className="text-[10px] text-slate-500">
                {totalFilteredRevenue > 0 ? `${((totalFilteredProfit / totalFilteredRevenue) * 100).toFixed(1)}% margen` : '0%'}
              </span>
            </div>
          </div>

          {/* Pending Payments Alert Card */}
          {totalPendingMoney > 0 && (
            <div className="glass-panel p-4 rounded-3xl border border-amber-300 bg-amber-50/80 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-800 block">Pendiente por Cobrar</span>
                  <span className="text-lg font-black text-amber-900">{fmt(totalPendingMoney)}</span>
                </div>
              </div>
              <button
                onClick={() => setPaymentStatusFilter('Pendientes')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
              >
                Ver Pendientes
              </button>
            </div>
          )}

          {/* Date & Payment Status Filter */}
          <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Filter className="w-4 h-4 text-pink-500" />
              <span>Filtrar Historial</span>
            </div>

            {/* Payment status filter pills */}
            <div className="flex items-center gap-1.5 p-1 bg-pink-50/70 rounded-xl border border-pink-200/60">
              {(['Todas', 'Cobradas', 'Pendientes'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setPaymentStatusFilter(st)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    paymentStatusFilter === st
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Desde</span>
                <input
                  type="date"
                  value={dateStart}
                  onChange={e => setDateStart(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Hasta</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={e => setDateEnd(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800"
                />
              </div>
            </div>
            {(dateStart || dateEnd || paymentStatusFilter !== 'Todas') && (
              <button
                onClick={() => { setDateStart(''); setDateEnd(''); setPaymentStatusFilter('Todas') }}
                className="text-[11px] text-pink-600 underline hover:text-pink-700 block text-right font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-pink-500" />
            <h3 className="font-playfair text-lg font-bold text-slate-800">
              Historial de Ventas {paymentStatusFilter !== 'Todas' ? `(${paymentStatusFilter})` : ''}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{filteredSales.length} registros</span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-2" />
            <p>No hay ventas registradas en este período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-pink-100 text-slate-500 font-medium">
                  <th className="pb-3 px-3">Fecha & Hora</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3">Producto</th>
                  <th className="pb-3 px-3 text-center">Cant.</th>
                  <th className="pb-3 px-3 text-right">Ingreso</th>
                  <th className="pb-3 px-3 text-right">Ganancia</th>
                  <th className="pb-3 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filteredSales.map(s => {
                  const p = products.find(prod => prod.id === s.product_id)
                  const isPaidSale = s.paid !== false
                  const dateFormatted = new Date(s.date).toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                  })
                  return (
                    <tr key={s.id} className="hover:bg-pink-50/50 transition-colors">
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        <div>{dateFormatted}</div>
                      </td>
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
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                              isPaidSale
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200/60'
                                : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200/60'
                            }`}
                            title="Tocar para cambiar estado o fecha de cobro"
                          >
                            {isPaidSale ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                            <span>{isPaidSale ? 'Cobrado' : 'Marcar Cobrado'}</span>
                          </button>

                          {isPaidSale && (
                            <span className="text-[9px] text-emerald-700 font-mono pl-1">
                              Cobrado: {new Date(s.paid_at || s.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        <span className="mr-1.5">{p?.emoji || '🍰'}</span>
                        {s.product_name}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-pink-600">{s.quantity}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-800">{fmt(s.revenue)}</td>
                      <td className="py-3.5 px-3 text-right font-black text-emerald-600">{fmt(s.profit)}</td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => onDeleteSale(s.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Eliminar venta"
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

      {/* Payment Date Confirmation Modal */}
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
              Vas a marcar como cobrada la venta de <strong>{payingSaleModal.quantity}x {payingSaleModal.product_name}</strong> ({fmt(payingSaleModal.revenue)}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-500" />
                <span>¿Cuándo se cobró este pedido?</span>
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
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                Guardar Cobrado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
