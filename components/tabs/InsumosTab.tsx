'use client'

import React, { useState, useMemo } from 'react'
import { IngredientMaster, InsumoHistoryItem } from '@/lib/types'
import { ReceiptScannerModal } from '@/components/ui/ReceiptScannerModal'
import {
  Search, PlusCircle, Package, Calendar, History, ShoppingCart, Tag, Filter,
  Trash2, Edit3, X, Check, ArrowUpRight, TrendingUp, AlertCircle, Scale, DollarSign, Sparkles
} from 'lucide-react'

interface InsumosTabProps {
  ingredients: IngredientMaster[]
  onSaveIngredient: (ingredient: Omit<IngredientMaster, 'id'> & { id?: string }) => Promise<void>
  onRecordPurchase: (insumoId: string, purchase: Omit<InsumoHistoryItem, 'id'>) => Promise<void>
  onDeleteIngredient: (id: string) => Promise<void>
  showToast: (msg: string) => void
}

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const fmtDec = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const CATEGORIES = ['Todas', 'Harinas', 'Azúcares', 'Lácteos', 'Chocolates', 'Frutas', 'Frutos Secos', 'Decoración', 'Varios']

export function InsumosTab({ ingredients, onSaveIngredient, onRecordPurchase, onDeleteIngredient, showToast }: InsumosTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [filterMode, setFilterMode] = useState<'todos' | 'comprar' | 'usar'>('todos')

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<Partial<IngredientMaster> | null>(null)

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [selectedInsumoForPurchase, setSelectedInsumoForPurchase] = useState<IngredientMaster | null>(null)

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedInsumoForHistory, setSelectedInsumoForHistory] = useState<IngredientMaster | null>(null)
  const [isAIReceiptModalOpen, setIsAIReceiptModalOpen] = useState(false)

  // Edit / Add Insumo Form State
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Varios')
  const [unit, setUnit] = useState('g')
  const [packageSize, setPackageSize] = useState('1000')
  const [packageCost, setPackageCost] = useState('')
  const [stockQty, setStockQty] = useState('1000')
  const [minStock, setMinStock] = useState('200')

  // Purchase Form State
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [purchaseCost, setPurchaseCostState] = useState('')
  const [purchaseSize, setPurchaseSizeState] = useState('')
  const [purchaseUnit, setPurchaseUnitState] = useState('g')
  const [purchaseSupplier, setPurchaseSupplier] = useState('')
  const [purchaseNotes, setPurchaseNotes] = useState('')

  const [loading, setLoading] = useState(false)

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(item => {
      // Search
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      if (!matchesSearch) return false

      // Category
      const matchesCategory = selectedCategory === 'Todas' || (item.category || 'Varios') === selectedCategory
      if (!matchesCategory) return false

      // Filter mode (comprar vs usar)
      if (filterMode === 'comprar') {
        return (item.stock_qty || 0) <= (item.min_stock || 0)
      }
      if (filterMode === 'usar') {
        return (item.stock_qty || 0) > (item.min_stock || 0)
      }

      return true
    })
  }, [ingredients, searchQuery, selectedCategory, filterMode])

  // Count to buy
  const countToBuy = useMemo(() => {
    return ingredients.filter(i => (i.stock_qty || 0) <= (i.min_stock || 0)).length
  }, [ingredients])

  const openNewInsumoModal = () => {
    setEditingInsumo(null)
    setName('')
    setCategory('Varios')
    setUnit('g')
    setPackageSize('1000')
    setPackageCost('')
    setStockQty('1000')
    setMinStock('200')
    setIsEditModalOpen(true)
  }

  const openEditInsumoModal = (item: IngredientMaster) => {
    setEditingInsumo(item)
    setName(item.name)
    setCategory(item.category || 'Varios')
    setUnit(item.unit || 'g')
    setPackageSize(item.package_size.toString())
    setPackageCost(item.package_cost.toString())
    setStockQty((item.stock_qty ?? 1000).toString())
    setMinStock((item.min_stock ?? 200).toString())
    setIsEditModalOpen(true)
  }

  const openPurchaseModal = (item: IngredientMaster) => {
    setSelectedInsumoForPurchase(item)
    setPurchaseDate(new Date().toISOString().split('T')[0])
    setPurchaseCostState(item.package_cost.toString())
    setPurchaseSizeState(item.package_size.toString())
    setPurchaseUnitState(item.unit || 'g')
    setPurchaseSupplier('')
    setPurchaseNotes('')
    setIsPurchaseModalOpen(true)
  }

  const openHistoryModal = (item: IngredientMaster) => {
    setSelectedInsumoForHistory(item)
    setIsHistoryModalOpen(true)
  }

  const handleSaveInsumoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('⚠️ Ingresá el nombre del insumo')
      return
    }

    const costNum = parseFloat(packageCost) || 0
    const sizeNum = parseFloat(packageSize) || 1000
    const stockNum = parseFloat(stockQty) || 0
    const minStockNum = parseFloat(minStock) || 0

    setLoading(true)
    await onSaveIngredient({
      id: editingInsumo?.id,
      name: name.trim(),
      category,
      unit,
      package_size: sizeNum,
      package_cost: costNum,
      stock_qty: stockNum,
      min_stock: minStockNum,
      history: editingInsumo?.history || [
        {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          package_cost: costNum,
          package_size: sizeNum,
          unit,
          notes: 'Registro inicial de insumo'
        }
      ]
    })

    showToast(editingInsumo ? '✓ Insumo actualizado' : '✨ Nuevo insumo agregado al catálogo!')
    setIsEditModalOpen(false)
    setLoading(false)
  }

  const handleRegisterPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInsumoForPurchase) return

    const costNum = parseFloat(purchaseCost) || 0
    const sizeNum = parseFloat(purchaseSize) || 1000

    if (costNum <= 0 || sizeNum <= 0) {
      showToast('⚠️ Ingresá precio y cantidad válidos para la compra')
      return
    }

    setLoading(true)
    await onRecordPurchase(selectedInsumoForPurchase.id, {
      date: purchaseDate,
      package_cost: costNum,
      package_size: sizeNum,
      unit: purchaseUnit,
      supplier: purchaseSupplier.trim(),
      notes: purchaseNotes.trim()
    })

    showToast(`✓ Compra de ${selectedInsumoForPurchase.name} registrada correctamente!`)
    setIsPurchaseModalOpen(false)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pink-100 text-pink-600 border border-pink-200">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-playfair text-2xl font-black text-gradient-pink">Control de Insumos & Costos</h2>
            <p className="text-xs text-slate-500">Materia prima, precios por unidad para recetas y stock disponible</p>
          </div>
        </div>

        {/* Guía Explicativa: Gastos vs Insumos */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs max-w-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-950">¿Cómo funciona Insumos vs. Gastos?</span>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Acá definís los precios de tus ingredientes para calcular los costos de tus recetas. Cuando registrás una compra en <strong>Gastos</strong> o escaneás un ticket, el sistema actualiza tus insumos <strong>automáticamente</strong> sin duplicar trabajo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAIReceiptModalOpen(true)}
            className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-all duration-200 flex items-center gap-2 border border-slate-700 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>Escanear Ticket</span>
          </button>

          <button
            onClick={openNewInsumoModal}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all duration-200 flex items-center gap-2 border border-pink-300/40 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Agregar Insumo</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-pink-200/60 bg-white/80 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-pink-100/70 text-pink-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Insumos Registrados</span>
            <span className="text-xl font-black text-slate-800">{ingredients.length} items</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-amber-900 block">Insumos para Comprar</span>
              <span className="text-xl font-black text-amber-800">{countToBuy} insumos</span>
            </div>
          </div>
          {countToBuy > 0 && (
            <button
              onClick={() => setFilterMode('comprar')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
            >
              Ver Lista
            </button>
          )}
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-900 block">Unidades & Rendimiento</span>
            <span className="text-xs font-bold text-emerald-700">Costo $/g & $/ml calculados en tiempo real</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/80 space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar insumo por nombre (ej: Azúcar, Harina, Oreo...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 bg-white border-pink-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mode Selector (Todos, Comprar, Usar) */}
          <div className="md:col-span-6 flex items-center gap-1 bg-pink-50/80 p-1 rounded-2xl border border-pink-200/60">
            <button
              onClick={() => setFilterMode('todos')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterMode === 'todos' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({ingredients.length})
            </button>

            <button
              onClick={() => setFilterMode('comprar')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                filterMode === 'comprar' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-100/50'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Para Comprar ({countToBuy})</span>
            </button>

            <button
              onClick={() => setFilterMode('usar')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterMode === 'usar' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              En Uso ({ingredients.length - countToBuy})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-pink-500 text-white border-pink-400 shadow-sm font-bold'
                  : 'bg-white text-slate-600 hover:bg-pink-50 border-pink-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Insumos Cards Grid */}
      {filteredIngredients.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-pink-200/50 bg-white/80 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 text-pink-300 mx-auto mb-2" />
          <p className="text-sm font-medium">No se encontraron insumos con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIngredients.map(item => {
            const costPerUnit = item.package_size > 0 ? item.package_cost / item.package_size : 0
            const isLowStock = (item.stock_qty || 0) <= (item.min_stock || 0)
            const historyCount = item.history?.length || 0

            return (
              <div
                key={item.id}
                className={`glass-panel p-5 rounded-3xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between relative bg-white/90 ${
                  isLowStock ? 'border-amber-300 bg-amber-50/20' : 'border-pink-200/60'
                }`}
              >
                <div>
                  {/* Category Pill & Low Stock Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-pink-100/80 text-pink-700 border border-pink-200 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>{item.category || 'Varios'}</span>
                    </span>

                    {isLowStock ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-white border border-amber-400 shadow-sm animate-pulse flex items-center gap-1">
                        <ShoppingCart className="w-3.5 h-3.5 fill-white" />
                        <span>⚠️ Recompra Urgente</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        En Stock ({item.stock_qty ?? item.package_size} {item.unit})
                      </span>
                    )}
                  </div>

                  {/* Insumo Title */}
                  <h3 className="font-playfair text-lg font-bold text-slate-900 mb-3">{item.name}</h3>

                  {/* Purchase format & calculated Unit Cost Card (Dolchere Pro style) */}
                  <div className="p-3.5 rounded-2xl bg-pink-50/60 border border-pink-200/70 space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Compra</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Costo por {item.unit}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-sm">
                        {fmt(item.package_cost)} <span className="text-xs text-slate-500 font-normal">- {item.package_size} {item.unit}</span>
                      </div>

                      <div className="font-black text-pink-600 text-base">
                        {fmtDec(costPerUnit)} <span className="text-[10px] text-pink-500 font-bold">/ {item.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price History summary link */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
                    <span className="flex items-center gap-1 text-[11px]">
                      <History className="w-3.5 h-3.5 text-pink-500" />
                      <span>Historico: <strong>{historyCount} registros</strong></span>
                    </span>
                    <button
                      onClick={() => openHistoryModal(item)}
                      className="text-[11px] font-bold text-pink-600 hover:text-pink-700 underline flex items-center gap-0.5"
                    >
                      <span>Ver Precios</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-pink-100">
                  <button
                    onClick={() => openPurchaseModal(item)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Registrar Compra</span>
                  </button>

                  <button
                    onClick={() => openEditInsumoModal(item)}
                    className="p-2 rounded-xl bg-white hover:bg-pink-50 text-slate-600 hover:text-slate-900 border border-pink-200/80 shadow-sm"
                    title="Editar insumo"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-pink-500" />
                  </button>

                  <button
                    onClick={() => onDeleteIngredient(item.id)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-pink-200/80 shadow-sm"
                    title="Eliminar insumo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / Add Insumo Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-md w-full border border-pink-300 bg-white shadow-2xl my-8 relative animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-playfair text-xl font-bold text-gradient-pink">
                {editingInsumo ? 'Editar Insumo' : 'Nuevo Insumo (Materia Prima)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-full hover:bg-pink-50 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInsumoSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Insumo</label>
                <input
                  type="text"
                  placeholder="Ej: Azúcar, Harina 0000, Oreos 1kg..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white border-pink-200"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2 text-xs text-slate-800 bg-white border-pink-200"
                >
                  {CATEGORIES.filter(c => c !== 'Todas').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Package Format */}
              <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200/70 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">Formato de Compra</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Unidad</span>
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="w-full glass-input rounded-xl px-2 py-2 text-xs text-slate-800 bg-white border-pink-200"
                    >
                      <option value="g">Gramos (g)</option>
                      <option value="kg">Kilos (kg)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="L">Litros (L)</option>
                      <option value="u">Unidades (u)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Cant. Paquete</span>
                    <input
                      type="number"
                      placeholder="1000"
                      value={packageSize}
                      onChange={e => setPackageSize(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Costo Paquete ($)</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="1800"
                      value={packageCost}
                      onChange={e => setPackageCost(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white border-pink-200"
                    />
                  </div>
                </div>

                {parseFloat(packageCost) > 0 && parseFloat(packageSize) > 0 && (
                  <div className="p-2 rounded-xl bg-white border border-pink-200 text-center">
                    <span className="text-[10px] text-slate-500 block">Costo Resultante Prorrateado</span>
                    <span className="text-sm font-black text-pink-600">
                      {fmtDec(parseFloat(packageCost) / parseFloat(packageSize))} / {unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/20"
                >
                  {loading ? 'Guardando...' : 'Guardar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Purchase Modal */}
      {isPurchaseModalOpen && selectedInsumoForPurchase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-md w-full border border-pink-300 bg-white shadow-2xl my-8 relative animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">Registrar Nueva Compra</span>
                <h3 className="font-playfair text-xl font-bold text-slate-900">{selectedInsumoForPurchase.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-2 rounded-full hover:bg-pink-50 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPurchaseSubmit} className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <span>Fecha de la Compra</span>
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              {/* Cost & Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Precio Total Pagado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1800"
                    value={purchaseCost}
                    onChange={e => setPurchaseCostState(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white border-pink-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad Comprada ({purchaseUnit})</label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={purchaseSize}
                    onChange={e => setPurchaseSizeState(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white border-pink-200"
                  />
                </div>
              </div>

              {/* Supplier & Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proveedor / Comercio (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Distribuidora Central, Coto, ChangoMás..."
                  value={purchaseSupplier}
                  onChange={e => setPurchaseSupplier(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              {/* Live Preview */}
              {parseFloat(purchaseCost) > 0 && parseFloat(purchaseSize) > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-800 block">Nuevo Costo por {purchaseUnit}</span>
                  <span className="text-base font-black text-emerald-600">
                    {fmtDec(parseFloat(purchaseCost) / parseFloat(purchaseSize))} / {purchaseUnit}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md shadow-pink-500/20"
                >
                  {loading ? 'Guardando...' : 'Guardar y Actualizar Precio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {isHistoryModalOpen && selectedInsumoForHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-md w-full border border-pink-300 bg-white shadow-2xl my-8 relative animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-pink-500" />
                <div>
                  <h3 className="font-playfair text-lg font-bold text-slate-900">Histórico de Precios</h3>
                  <span className="text-xs text-pink-600 font-semibold">{selectedInsumoForHistory.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 rounded-full hover:bg-pink-50 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(!selectedInsumoForHistory.history || selectedInsumoForHistory.history.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No hay compras históricas registradas aún para este insumo.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto p-1">
                {selectedInsumoForHistory.history.map(item => {
                  const unitCost = item.package_size > 0 ? item.package_cost / item.package_size : 0
                  return (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-pink-500" />
                          <span>{item.date}</span>
                        </span>
                        <span className="text-xs font-black text-pink-600">
                          {fmtDec(unitCost)} / {item.unit}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Pagado: <strong>{fmt(item.package_cost)}</strong> ({item.package_size} {item.unit})</span>
                        {item.supplier && <span className="italic text-slate-500">vía {item.supplier}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-pink-100 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isAIReceiptModalOpen}
        onClose={() => setIsAIReceiptModalOpen(false)}
        masterIngredients={ingredients}
        onConfirmReceipt={async (data) => {
          for (const item of data.items) {
            if (item.ingredientId) {
              const ing = ingredients.find(i => i.id === item.ingredientId)
              if (ing) {
                let sizeNum = item.qty || 1
                if (item.unit === 'kg' && ing.unit === 'g') sizeNum = sizeNum * 1000
                if (item.unit === 'l' && ing.unit === 'ml') sizeNum = sizeNum * 1000

                await onRecordPurchase(ing.id, {
                  date: data.date,
                  package_cost: item.price,
                  package_size: sizeNum,
                  unit: ing.unit,
                  supplier: data.merchantName,
                  notes: 'Cargado vía Escáner Gemini AI'
                })
              }
            } else {
              // Create new ingredient
              let sizeNum = item.qty || 1000
              let u = item.unit || 'g'
              if (u === 'kg') { u = 'g'; sizeNum = sizeNum * 1000 }
              if (u === 'l') { u = 'ml'; sizeNum = sizeNum * 1000 }

              await onSaveIngredient({
                name: item.name,
                category: 'Varios',
                unit: u,
                package_size: sizeNum,
                package_cost: item.price || 0,
                stock_qty: sizeNum,
                min_stock: 200,
                history: [{
                  id: Date.now().toString(),
                  date: data.date,
                  package_cost: item.price || 0,
                  package_size: sizeNum,
                  unit: u,
                  supplier: data.merchantName,
                  notes: 'Ingrediente creado por Gemini AI'
                }]
              })
            }
          }
          showToast(`🎉 ¡${data.items.length} insumos acreditados a tu inventario!`)
        }}
        showToast={showToast}
      />
    </div>
  )
}
