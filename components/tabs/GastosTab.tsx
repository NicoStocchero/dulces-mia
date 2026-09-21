'use client'

import React, { useState, useMemo } from 'react'
import { Product, Expense, IngredientMaster } from '@/lib/types'
import {
  Receipt, PlusCircle, Trash2, Package, Tag, Filter, Search,
  Calendar, Layers, TrendingDown, TrendingUp, Info, Scale, DollarSign,
  Edit3, X, Check
} from 'lucide-react'

interface GastosTabProps {
  products: Product[]
  expenses: Expense[]
  ingredients?: IngredientMaster[]
  onRecordExpense: (expense: Omit<Expense, 'id'>) => Promise<void>
  onUpdateExpense?: (expense: Expense) => Promise<void>
  onDeleteExpense: (id: string) => Promise<void>
  showToast: (msg: string) => void
}

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function GastosTab({
  products,
  expenses,
  ingredients = [],
  onRecordExpense,
  onUpdateExpense,
  onDeleteExpense,
  showToast
}: GastosTabProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'Fijo' | 'Variable' | 'Insumo' | 'General'>('Insumo')
  const [relatedProduct, setRelatedProduct] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [brand, setBrand] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  
  // Structured Insumo Fields
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('')
  const [packageSize, setPackageSize] = useState<string>('1000')
  const [unit, setUnit] = useState<string>('g')
  const [quantityBought, setQuantityBought] = useState<string>('1')
  const [unitPrice, setUnitPrice] = useState<string>('')

  // Non-Insumo Fields (Packaging, Fixed, General with Quantity support)
  const [nonInsumoQuantity, setNonInsumoQuantity] = useState<string>('1')
  const [nonInsumoUnitPrice, setNonInsumoUnitPrice] = useState<string>('')

  // Edit Expense Modal State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editType, setEditType] = useState<Expense['type']>('Insumo')
  const [editBrand, setEditBrand] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editQuantityBought, setEditQuantityBought] = useState('1')
  const [editUnitPrice, setEditUnitPrice] = useState('')
  const [editPackageSize, setEditPackageSize] = useState('1000')
  const [editUnit, setEditUnit] = useState('g')
  const [editSelectedIngredientId, setEditSelectedIngredientId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editRelatedProduct, setEditRelatedProduct] = useState('')

  // Filter and Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInsumoFilter, setSelectedInsumoFilter] = useState<string>('Todos')
  const [typeFilter, setTypeFilter] = useState<string>('Todos')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [loading, setLoading] = useState(false)

  // Handle Insumo selection from master catalog
  const handleSelectInsumoMaster = (masterId: string) => {
    setSelectedIngredientId(masterId)
    if (!masterId) return

    const ing = ingredients.find(i => i.id === masterId)
    if (ing) {
      setDescription(ing.name)
      if (ing.brand) setBrand(ing.brand)
      setUnit(ing.unit || 'g')
      const pSize = ing.package_size ? ing.package_size.toString() : '1000'
      setPackageSize(pSize)

      if (ing.package_cost) {
        setUnitPrice(ing.package_cost.toString())
        const qty = parseFloat(quantityBought) || 1
        setAmount((ing.package_cost * qty).toString())
      }
    }
  }

  // Bidirectional calculation for Insumos: quantity & unit price -> total amount
  const handleQuantityChange = (qtyStr: string) => {
    setQuantityBought(qtyStr)
    const qty = parseFloat(qtyStr)
    const uPrice = parseFloat(unitPrice)
    if (!isNaN(qty) && qty > 0 && !isNaN(uPrice) && uPrice > 0) {
      setAmount((qty * uPrice).toFixed(2))
    }
  }

  const handleUnitPriceChange = (priceStr: string) => {
    setUnitPrice(priceStr)
    const uPrice = parseFloat(priceStr)
    const qty = parseFloat(quantityBought) || 1
    if (!isNaN(uPrice) && !isNaN(qty) && qty > 0) {
      setAmount((uPrice * qty).toFixed(2))
    }
  }

  const handleTotalAmountChange = (totalStr: string) => {
    setAmount(totalStr)
    const tot = parseFloat(totalStr)
    const qty = parseFloat(quantityBought) || 1
    if (!isNaN(tot) && tot > 0 && !isNaN(qty) && qty > 0) {
      setUnitPrice((tot / qty).toFixed(2))
    }
  }

  // Bidirectional calculation for Non-Insumos (Packaging, Fixed, General)
  const handleNonInsumoQtyChange = (qStr: string) => {
    setNonInsumoQuantity(qStr)
    const q = parseFloat(qStr)
    const u = parseFloat(nonInsumoUnitPrice)
    if (!isNaN(q) && q > 0 && !isNaN(u) && u > 0) {
      setAmount((q * u).toFixed(2))
    }
  }

  const handleNonInsumoUnitPriceChange = (uStr: string) => {
    setNonInsumoUnitPrice(uStr)
    const u = parseFloat(uStr)
    const q = parseFloat(nonInsumoQuantity) || 1
    if (!isNaN(u) && !isNaN(q) && q > 0) {
      setAmount((u * q).toFixed(2))
    }
  }

  const handleNonInsumoAmountChange = (totStr: string) => {
    setAmount(totStr)
    const tot = parseFloat(totStr)
    const q = parseFloat(nonInsumoQuantity) || 1
    if (!isNaN(tot) && tot > 0 && !isNaN(q) && q > 0) {
      setNonInsumoUnitPrice((tot / q).toFixed(2))
    }
  }

  // Edit Expense Handlers
  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp)
    setEditDesc(exp.description || '')
    setEditAmount(exp.amount ? exp.amount.toString() : '')
    setEditType(exp.type || 'Insumo')
    setEditBrand(exp.brand || '')
    setEditNotes(exp.notes || '')
    setEditQuantityBought(exp.quantity_bought ? exp.quantity_bought.toString() : '1')
    setEditUnitPrice(exp.unit_price ? exp.unit_price.toString() : (exp.quantity_bought && exp.amount ? (exp.amount / exp.quantity_bought).toFixed(2) : ''))
    setEditPackageSize(exp.package_size ? exp.package_size.toString() : '1000')
    setEditUnit(exp.unit || 'g')
    setEditSelectedIngredientId(exp.ingredient_id || '')
    setEditDate(exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0])
    setEditRelatedProduct(exp.related_product || '')
  }

  const handleEditSelectInsumoMaster = (masterId: string) => {
    setEditSelectedIngredientId(masterId)
    if (!masterId) return
    const ing = ingredients.find(i => i.id === masterId)
    if (ing) {
      setEditDesc(ing.name)
      if (ing.brand) setEditBrand(ing.brand)
      setEditUnit(ing.unit || 'g')
      const pSize = ing.package_size ? ing.package_size.toString() : '1000'
      setEditPackageSize(pSize)
      if (ing.package_cost) {
        setEditUnitPrice(ing.package_cost.toString())
        const qty = parseFloat(editQuantityBought) || 1
        setEditAmount((ing.package_cost * qty).toFixed(2))
      }
    }
  }

  const handleEditQuantityChange = (qtyStr: string) => {
    setEditQuantityBought(qtyStr)
    const qty = parseFloat(qtyStr)
    const uPrice = parseFloat(editUnitPrice)
    if (!isNaN(qty) && qty > 0 && !isNaN(uPrice) && uPrice > 0) {
      setEditAmount((qty * uPrice).toFixed(2))
    }
  }

  const handleEditUnitPriceChange = (priceStr: string) => {
    setEditUnitPrice(priceStr)
    const uPrice = parseFloat(priceStr)
    const qty = parseFloat(editQuantityBought) || 1
    if (!isNaN(uPrice) && !isNaN(qty) && qty > 0) {
      setEditAmount((uPrice * qty).toFixed(2))
    }
  }

  const handleEditTotalAmountChange = (totalStr: string) => {
    setEditAmount(totalStr)
    const tot = parseFloat(totalStr)
    const qty = parseFloat(editQuantityBought) || 1
    if (!isNaN(tot) && tot > 0 && !isNaN(qty) && qty > 0) {
      setEditUnitPrice((tot / qty).toFixed(2))
    }
  }

  const handleSaveEditExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    const parsedAmount = parseFloat(editAmount) || 0
    const parsedQty = parseFloat(editQuantityBought) || 1
    const parsedUPrice = parseFloat(editUnitPrice) || (parsedAmount / parsedQty)
    const selectedDateTime = editDate ? new Date(editDate + 'T12:00:00').toISOString() : editingExpense.date

    const updatedExpense: Expense = {
      ...editingExpense,
      description: editDesc.trim(),
      amount: parsedAmount,
      type: editType,
      brand: editType === 'Insumo' ? (editBrand.trim() || undefined) : undefined,
      notes: editNotes.trim() || undefined,
      package_size: editType === 'Insumo' ? (parseFloat(editPackageSize) || undefined) : undefined,
      unit: editType === 'Insumo' ? editUnit : undefined,
      quantity_bought: parsedQty,
      unit_price: parsedUPrice,
      ingredient_id: editType === 'Insumo' && editSelectedIngredientId ? editSelectedIngredientId : undefined,
      related_product: editType === 'Insumo' ? '' : (editRelatedProduct || ''),
      date: selectedDateTime
    }

    if (onUpdateExpense) {
      await onUpdateExpense(updatedExpense)
    } else {
      await onDeleteExpense(editingExpense.id)
      await onRecordExpense(updatedExpense)
      showToast('✓ Gasto actualizado')
    }

    setEditingExpense(null)
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    const finalDesc = description.trim()

    if (!finalDesc) {
      showToast('⚠️ Ingresá el nombre o descripción del gasto')
      return
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('⚠️ Ingresá un monto o precio válido')
      return
    }

    setLoading(true)
    const selectedDateTime = expenseDate ? new Date(expenseDate + 'T12:00:00').toISOString() : new Date().toISOString()

    const parsedQty = type === 'Insumo' ? (parseFloat(quantityBought) || 1) : (parseFloat(nonInsumoQuantity) || 1)
    const parsedPkgSize = type === 'Insumo' ? (parseFloat(packageSize) || undefined) : undefined
    const parsedUPrice = type === 'Insumo'
      ? (parseFloat(unitPrice) || (parsedAmount / parsedQty))
      : (parseFloat(nonInsumoUnitPrice) || (parsedAmount / parsedQty))

    await onRecordExpense({
      description: finalDesc,
      amount: parsedAmount,
      type,
      related_product: type === 'Insumo' ? '' : (relatedProduct || ''),
      date: selectedDateTime,
      ingredient_id: type === 'Insumo' && selectedIngredientId ? selectedIngredientId : undefined,
      brand: type === 'Insumo' ? (brand.trim() || undefined) : undefined,
      notes: expenseNotes.trim() || undefined,
      package_size: parsedPkgSize,
      unit: type === 'Insumo' ? unit : undefined,
      quantity_bought: parsedQty,
      unit_price: parsedUPrice
    })

    if (type === 'Insumo') {
      showToast(`✓ Compra de ${finalDesc} registrada por ${fmt(parsedAmount)} (Stock general actualizado)`)
    } else {
      showToast(`✓ Gasto de ${fmt(parsedAmount)} registrado (${type})`)
    }

    // Reset Form
    setDescription('')
    setAmount('')
    setUnitPrice('')
    setQuantityBought('1')
    setNonInsumoQuantity('1')
    setNonInsumoUnitPrice('')
    setBrand('')
    setExpenseNotes('')
    setSelectedIngredientId('')
    setRelatedProduct('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setLoading(false)
  }

  // Unique list of Insumos for price auditing filter
  const uniqueInsumosList = useMemo(() => {
    const set = new Set<string>()
    ingredients.forEach(i => set.add(i.name.trim()))
    expenses.filter(e => e.type === 'Insumo').forEach(e => set.add(e.description.trim()))
    return ['Todos', ...Array.from(set).sort()]
  }, [ingredients, expenses])

  // Filter expenses by date, text query, category, and insumo
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date).getTime()
      const start = dateStart ? new Date(dateStart).setHours(0, 0, 0, 0) : null
      const end = dateEnd ? new Date(dateEnd).setHours(23, 59, 59, 999) : null
      const dateMatches = (!start || d >= start) && (!end || d <= end)
      if (!dateMatches) return false

      if (typeFilter !== 'Todos' && e.type !== typeFilter) return false

      if (selectedInsumoFilter !== 'Todos') {
        const desc = e.description.toLowerCase().trim()
        const target = selectedInsumoFilter.toLowerCase().trim()
        if (!desc.includes(target)) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const descMatch = e.description.toLowerCase().includes(q)
        const relMatch = (e.related_product || '').toLowerCase().includes(q)
        const typeMatch = e.type.toLowerCase().includes(q)
        return descMatch || relMatch || typeMatch
      }

      return true
    })
  }, [expenses, dateStart, dateEnd, typeFilter, selectedInsumoFilter, searchQuery])

  // Price auditing metrics for selected insumo
  const insumoAuditStats = useMemo(() => {
    if (selectedInsumoFilter === 'Todos') return null
    const insumoPurchases = expenses.filter(e => 
      e.type === 'Insumo' && e.description.toLowerCase().includes(selectedInsumoFilter.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (insumoPurchases.length === 0) return null

    const prices = insumoPurchases.map(p => p.unit_price || (p.quantity_bought ? p.amount / p.quantity_bought : p.amount))
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const latestPrice = prices[0]
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

    return {
      totalPurchases: insumoPurchases.length,
      latestPrice,
      minPrice,
      maxPrice,
      avgPrice,
      lastDate: insumoPurchases[0].date
    }
  }, [expenses, selectedInsumoFilter])

  const totalInsumos = filteredExpenses.filter(e => e.type === 'Insumo').reduce((a, b) => a + b.amount, 0)
  const totalFijos = filteredExpenses.filter(e => e.type === 'Fijo').reduce((a, b) => a + b.amount, 0)
  const totalVariables = filteredExpenses.filter(e => e.type === 'Variable').reduce((a, b) => a + b.amount, 0)
  const totalGeneral = filteredExpenses.filter(e => e.type === 'General').reduce((a, b) => a + b.amount, 0)
  const totalExpenses = filteredExpenses.reduce((a, b) => a + b.amount, 0)

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Register Expense Form */}
        <div className="lg:col-span-7 glass-panel-glow p-6 rounded-3xl border border-pink-200/60 bg-white/80">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 border border-rose-200">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-playfair text-xl font-bold text-gradient-pink">Registrar Compra o Gasto</h2>
              <p className="text-xs text-slate-500">Materia prima para stock general, packaging o costos operativos</p>
            </div>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoría de Gasto</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setType('Insumo')}
                  className={`py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                    type === 'Insumo'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-rose-50 border-pink-200'
                  }`}
                  title="Harina, manteca, dulce de leche, azúcar, oreo..."
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Insumo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('Variable')}
                  className={`py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                    type === 'Variable'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-purple-50 border-pink-200'
                  }`}
                  title="Packaging, Cajas, Cintas, Envases descartables"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Variable / Envase</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('Fijo')}
                  className={`py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                    type === 'Fijo'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-indigo-50 border-pink-200'
                  }`}
                  title="Alquiler taller, Gas, Luz, Internet"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Gasto Fijo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('General')}
                  className={`py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                    type === 'General'
                      ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-amber-50 border-pink-200'
                  }`}
                  title="Limpieza, mantenimiento, viáticos"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>General</span>
                </button>
              </div>
            </div>

            {/* INSUMO MODE: Structured Inputs & General Stock Explainer */}
            {type === 'Insumo' ? (
              <div className="space-y-4 p-4 rounded-2xl bg-rose-50/50 border border-rose-200/70">
                {/* Information banner explaining unlinking */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-rose-200 text-slate-700 text-[11px] leading-relaxed">
                  <Info className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Stock General de Materia Prima:</strong> Los insumos no se atan a un postre puntual. Se incorporan al inventario común y se prorratean automáticamente mediante las recetas.
                  </span>
                </div>

                {/* Insumo Master Dropdown & Manual Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Insumo Catálogo <span className="text-slate-400 font-normal">(Rápido)</span>
                    </label>
                    <select
                      value={selectedIngredientId}
                      onChange={e => handleSelectInsumoMaster(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                    >
                      <option value="">-- Seleccionar o escribir nuevo --</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.package_size || 1000}{ing.unit || 'g'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre del Insumo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="input-expense-description"
                      placeholder="Ej: Harina 0000, Dulce de Leche Repostero..."
                      value={description}
                      onChange={e => {
                        setDescription(e.target.value)
                        setSelectedIngredientId('')
                      }}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Brand & Optional Notes for Insumo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Marca <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Vacalin, La Serenísima, Pureza, Chango..."
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descripción / Notas <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Comprado en Coto, oferta x2, pote plástico..."
                      value={expenseNotes}
                      onChange={e => setExpenseNotes(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>

                {/* Presentation & Units */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Presentación (Tamaño)
                    </label>
                    <input
                      type="number"
                      step="any"
                      data-testid="input-expense-package-size"
                      placeholder="Ej: 1000, 25, 1"
                      value={packageSize}
                      onChange={e => setPackageSize(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Unidad de Medida
                    </label>
                    <select
                      value={unit}
                      data-testid="select-expense-unit"
                      onChange={e => setUnit(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
                    >
                      <option value="g">Gramos (g)</option>
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="l">Litros (L)</option>
                      <option value="unidad">Unidades (u)</option>
                      <option value="paquete">Paquetes</option>
                      <option value="caja">Cajas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cantidad Comprada
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="1"
                      value={quantityBought}
                      onChange={e => handleQuantityChange(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>
                </div>

                {/* Unit Price & Total Price with auto calculation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Precio Unitario ($)</span>
                      <span className="text-[10px] text-slate-400 font-normal">por unidad/paquete</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={unitPrice}
                      onChange={e => handleUnitPriceChange(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="text-rose-600 font-bold">Monto Total ($)</span>
                      <span className="text-[10px] text-rose-500 font-medium">Calculado auto</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      data-testid="input-expense-amount"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => handleTotalAmountChange(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-sm font-black text-rose-600 bg-white border-rose-300"
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* NON-INSUMO FORM (Variable, Fijo, General with Quantity & Unit Price) */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descripción / Concepto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cajas para tartas 26cm, Luz del taller, Cinta de embalar..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cantidad <span className="text-slate-400 font-normal">(Unidades/Lotes)</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="1"
                      value={nonInsumoQuantity}
                      onChange={e => handleNonInsumoQtyChange(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Precio Unitario ($) <span className="text-slate-400 font-normal">(c/u)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={nonInsumoUnitPrice}
                      onChange={e => handleNonInsumoUnitPriceChange(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="font-bold text-slate-800">Monto Total ($)</span>
                      <span className="text-[10px] text-pink-600 font-medium">Auto</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => handleNonInsumoAmountChange(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2 text-base font-bold text-slate-800 bg-white border-pink-300"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Related Product (Optional only for packaging / specific variables) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Postre Relacionado <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <select
                      value={relatedProduct}
                      onChange={e => setRelatedProduct(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-800 appearance-none cursor-pointer bg-white border-pink-200"
                    >
                      <option value="">-- Ninguno (Gasto Global) --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.name}>
                          {p.emoji || '🍰'} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notas / Proveedor <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Comprado en distribuidora packaging..."
                      value={expenseNotes}
                      onChange={e => setExpenseNotes(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Expense Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-500" />
                <span>Fecha de Compra / Pago</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              data-testid="submit-expense-btn"
              disabled={loading || !description.trim() || !amount}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 to-pink-600 text-white font-bold text-sm shadow-md shadow-rose-500/25 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 border border-rose-300/40 active:scale-[0.99]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{loading ? 'Registrando...' : `Guardar ${type === 'Insumo' ? 'Compra de Insumo' : 'Gasto'}`}</span>
            </button>
          </form>
        </div>

        {/* Right: Metrics, Price Auditing & Search Filters */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Summary Breakdown Cards */}
          <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/70 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Desglose Financiero</h3>
            
            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60 flex items-center justify-between">
              <span className="text-xs text-slate-700 flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Insumos / Materia Prima
              </span>
              <span className="text-sm font-bold text-rose-600">{fmt(totalInsumos)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/60 flex items-center justify-between">
              <span className="text-xs text-slate-700 flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                Variables / Packaging
              </span>
              <span className="text-sm font-bold text-purple-600">{fmt(totalVariables)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
              <span className="text-xs text-slate-700 flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Fijos & Generales
              </span>
              <span className="text-sm font-bold text-amber-600">{fmt(totalFijos + totalGeneral)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-100/70 border border-rose-200 flex items-center justify-between pt-3">
              <span className="text-xs font-bold text-slate-800">Total Gastado Filtrado</span>
              <span className="text-xl font-black text-rose-600">{fmt(totalExpenses)}</span>
            </div>
          </div>

          {/* INSUMO AUDIT CARD: Evolución de Precios */}
          {insumoAuditStats && (
            <div className="glass-panel-glow p-5 rounded-3xl border border-rose-300 bg-white/95 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-rose-500" />
                  <h4 className="text-xs font-bold text-slate-800">
                    Auditoría de Precios: <span className="text-rose-600">{selectedInsumoFilter}</span>
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">
                  {insumoAuditStats.totalPurchases} compras registradas
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Último Precio</span>
                  <span className="text-xs font-black text-slate-800">{fmt(insumoAuditStats.latestPrice)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-600 block">Mínimo Histórico</span>
                  <span className="text-xs font-black text-emerald-700">{fmt(insumoAuditStats.minPrice)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-600 block">Máximo Histórico</span>
                  <span className="text-xs font-black text-rose-700">{fmt(insumoAuditStats.maxPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Search & Insumo Auditing Filters */}
          <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Filter className="w-4 h-4 text-pink-500" />
              <span>Filtros y Auditoría</span>
            </div>

            {/* Filter by Insumo Base (Requirement 4.3) */}
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">
                Auditar por Insumo Base
              </label>
              <select
                value={selectedInsumoFilter}
                onChange={e => setSelectedInsumoFilter(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white border-pink-200 cursor-pointer"
              >
                {uniqueInsumosList.map(item => (
                  <option key={item} value={item}>
                    {item === 'Todos' ? '📦 Todos los Insumos' : `🔍 ${item}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Category */}
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">
                Filtrar por Categoría
              </label>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {['Todos', 'Insumo', 'Variable', 'Fijo'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTypeFilter(cat)}
                    className={`py-1.5 px-1 rounded-lg font-bold transition-all border text-center ${
                      typeFilter === cat
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'bg-white text-slate-600 hover:bg-rose-50 border-pink-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en descripción..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Desde</span>
                <input
                  type="date"
                  value={dateStart}
                  onChange={e => setDateStart(e.target.value)}
                  className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Hasta</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={e => setDateEnd(e.target.value)}
                  className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
            </div>

            {(dateStart || dateEnd || searchQuery || selectedInsumoFilter !== 'Todos' || typeFilter !== 'Todos') && (
              <button
                onClick={() => {
                  setDateStart('')
                  setDateEnd('')
                  setSearchQuery('')
                  setSelectedInsumoFilter('Todos')
                  setTypeFilter('Todos')
                }}
                className="text-[11px] text-pink-600 underline hover:text-pink-700 block text-right font-medium pt-1"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expenses History Table */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-playfair text-lg font-bold text-slate-800">
              Registro Histórico de Compras y Gastos
            </h3>
            <p className="text-xs text-slate-500">
              {selectedInsumoFilter !== 'Todos' ? `Filtrando por insumo: ${selectedInsumoFilter}` : 'Historial ordenado cronológicamente'}
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">{filteredExpenses.length} registros</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <p>No se encontraron gastos con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-pink-100 text-slate-500 font-medium">
                  <th className="pb-3 px-3">Fecha</th>
                  <th className="pb-3 px-3">Categoría</th>
                  <th className="pb-3 px-3">Descripción / Insumo</th>
                  <th className="pb-3 px-3">Presentación / Formato</th>
                  <th className="pb-3 px-3">Cantidad</th>
                  <th className="pb-3 px-3 text-right">Precio Unit.</th>
                  <th className="pb-3 px-3 text-right">Total</th>
                  <th className="pb-3 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filteredExpenses.map(e => {
                  const dateFormatted = new Date(e.date).toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: '2-digit'
                  })
                  const isInsumo = e.type === 'Insumo'

                  return (
                    <tr key={e.id} className="hover:bg-pink-50/50 transition-colors">
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">{dateFormatted}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isInsumo
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : e.type === 'Variable'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : e.type === 'Fijo'
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {e.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{e.description}</span>
                          {e.brand && (
                            <span className="px-1.5 py-0.5 rounded-md bg-pink-100/70 text-pink-700 text-[10px] font-bold border border-pink-200">
                              {e.brand}
                            </span>
                          )}
                        </div>
                        {e.notes && (
                          <span className="block text-[10px] text-slate-500 italic pt-0.5">
                            {e.notes}
                          </span>
                        )}
                        {!isInsumo && e.related_product && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Para: {e.related_product}
                          </span>
                        )}
                        {isInsumo && (
                          <span className="block text-[10px] text-emerald-600 font-medium">
                            Stock Compartido
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {isInsumo ? (
                          e.package_size ? `${e.package_size} ${e.unit || 'g'}` : '-'
                        ) : (
                          e.related_product || '-'
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-700">
                        {e.quantity_bought ? `${e.quantity_bought} un` : '1 un'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                        {e.unit_price ? fmt(e.unit_price) : '-'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-rose-600">
                        {fmt(e.amount)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditExpense(e)}
                            data-testid="edit-expense-btn"
                            className="p-1.5 rounded-lg hover:bg-pink-100 text-slate-400 hover:text-pink-600 transition-colors"
                            title="Editar gasto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteExpense(e.id)}
                            data-testid="delete-expense-btn"
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Editar Gasto */}
      {editingExpense && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-pink-300 bg-white shadow-2xl space-y-4 animate-scale-up my-6">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-500" />
                <h3 className="font-playfair text-lg font-bold text-slate-900">Editar Gasto o Compra</h3>
              </div>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="space-y-4">
              {/* Category Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoría de Gasto</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('Insumo')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                      editType === 'Insumo'
                        ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-rose-50 border-pink-200'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Insumo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType('Variable')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                      editType === 'Variable'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-purple-50 border-pink-200'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Variable / Envase</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType('Fijo')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                      editType === 'Fijo'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-indigo-50 border-pink-200'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Gasto Fijo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType('General')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                      editType === 'General'
                        ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-amber-50 border-pink-200'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>General</span>
                  </button>
                </div>
              </div>

              {/* INSUMO MODE */}
              {editType === 'Insumo' ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/70">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Insumo Catálogo
                      </label>
                      <select
                        value={editSelectedIngredientId}
                        onChange={e => handleEditSelectInsumoMaster(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                      >
                        <option value="">-- Personalizado / Sin catálogo --</option>
                        {ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.package_size || 1000}{ing.unit || 'g'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre del Insumo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Marca</label>
                      <input
                        type="text"
                        placeholder="Ej: Vacalin..."
                        value={editBrand}
                        onChange={e => setEditBrand(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Presentación</label>
                      <input
                        type="number"
                        step="any"
                        value={editPackageSize}
                        onChange={e => setEditPackageSize(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Unidad</label>
                      <select
                        value={editUnit}
                        onChange={e => setEditUnit(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                      >
                        <option value="g">Gramos (g)</option>
                        <option value="kg">Kilogramos (kg)</option>
                        <option value="ml">Mililitros (ml)</option>
                        <option value="l">Litros (L)</option>
                        <option value="unidad">Unidades (u)</option>
                        <option value="paquete">Paquetes</option>
                        <option value="caja">Cajas</option>
                      </select>
                    </div>
                  </div>

                  {/* Calculations */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value={editQuantityBought}
                        onChange={e => handleEditQuantityChange(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border-pink-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Precio Unit. ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editUnitPrice}
                        onChange={e => handleEditUnitPriceChange(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border-pink-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-rose-600 mb-1">Total ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editAmount}
                        onChange={e => handleEditTotalAmountChange(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-black text-rose-600 bg-white border-rose-300"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* NON-INSUMO MODE: Variable, Fijo, General */
                <div className="space-y-3 p-3.5 rounded-2xl bg-purple-50/40 border border-purple-200/70">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descripción / Concepto <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Cajas para tarta, Luz, Cinta de embalar..."
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white border-pink-200"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value={editQuantityBought}
                        onChange={e => handleEditQuantityChange(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border-pink-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Precio Unit. ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editUnitPrice}
                        onChange={e => handleEditUnitPriceChange(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border-pink-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-purple-700 mb-1">Total ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editAmount}
                        onChange={e => handleEditTotalAmountChange(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-black text-purple-700 bg-white border-purple-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Postre Relacionado <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <select
                      value={editRelatedProduct}
                      onChange={e => setEditRelatedProduct(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200 cursor-pointer"
                    >
                      <option value="">-- Ninguno (Gasto Global) --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.name}>
                          {p.emoji || '🍰'} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Date & Notes (Common) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-pink-500" />
                    <span>Fecha</span>
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Proveedor</label>
                  <input
                    type="text"
                    placeholder="Ej: Distribuidora packaging, oferta..."
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
