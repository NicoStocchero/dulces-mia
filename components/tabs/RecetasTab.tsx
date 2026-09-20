'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Recipe, IngredientMaster, RecipeCostSnapshot, Product } from '@/lib/types'
import { fetchMasterIngredients, saveMasterIngredient, deleteMasterIngredient, saveRecipeCostSnapshot } from '@/lib/supabase'
import { calculateRecipeCost } from '@/components/tabs/CatalogoTab'
import { BookOpen, PlusCircle, Trash2, Edit3, Sparkles, ChefHat, Tag, Plus, X, AlertCircle, Scale, DollarSign, RefreshCw, Package, History, Lock, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

interface RecetasTabProps {
  recipes: Recipe[]
  ingredients?: IngredientMaster[]
  products?: Product[]
  onSaveRecipe: (recipe: Omit<Recipe, 'id'> & { id?: string }) => Promise<void>
  onDeleteRecipe: (id: string) => Promise<void>
  showToast: (msg: string) => void
  onNavigateTab?: (tab: any) => void
}

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

// Helper to format quantity numbers with smart unit conversion (e.g. 1500g -> 1.5 kg)
function formatScaledQuantity(originalStr: string, multiplier: number): string {
  if (!originalStr) return ''
  
  // Try matching number + unit (e.g., "350g", "1.5 kg", "500 ml", "2 paquetes")
  const match = originalStr.match(/^([\d.,]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ\s]*)$/)
  if (!match) {
    // Fallback: if no unit prefix, just multiply numbers found in string
    return originalStr.replace(/([\d.,]+)/g, (m) => {
      const num = parseFloat(m.replace(',', '.'))
      if (isNaN(num)) return m
      const scaled = num * multiplier
      return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1).replace('.', ',')
    })
  }

  const num = parseFloat(match[1].replace(',', '.'))
  const unit = match[2].trim()

  if (isNaN(num)) return originalStr

  const total = num * multiplier

  // Convert grams to kg if total >= 1000g
  if (unit.toLowerCase() === 'g' && total >= 1000) {
    const kg = total / 1000
    return `${Number.isInteger(kg) ? kg : kg.toFixed(2).replace('.', ',')} kg`
  }

  // Convert ml to L if total >= 1000ml
  if (unit.toLowerCase() === 'ml' && total >= 1000) {
    const l = total / 1000
    return `${Number.isInteger(l) ? l : l.toFixed(2).replace('.', ',')} L`
  }

  const formattedNum = Number.isInteger(total) ? total.toString() : total.toFixed(1).replace('.', ',')
  return `${formattedNum} ${unit}`.trim()
}

export function RecetasTab({ recipes, ingredients: propIngredients, products = [], onSaveRecipe, onDeleteRecipe, showToast, onNavigateTab }: RecetasTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isInsumosModalOpen, setIsInsumosModalOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todas')

  // Master ingredients state
  const [masterIngredients, setMasterIngredients] = useState<IngredientMaster[]>(propIngredients || [])
  const [insumoName, setInsumoName] = useState('')
  const [insumoUnit, setInsumoUnit] = useState('g')
  const [insumoSize, setInsumoSize] = useState('1000')
  const [insumoCost, setInsumoCost] = useState('')

  // Recipe form state
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState(false)
  const [category, setCategory] = useState('Tartas')
  const [recipeYield, setRecipeYield] = useState('')
  const [packagingCost, setPackagingCost] = useState('')
  const [laborHours, setLaborHours] = useState('')
  const [steps, setSteps] = useState('')
  const [notes, setNotes] = useState('')
  const [ingredients, setIngredients] = useState<{ name: string; quantity: string }[]>([
    { name: '', quantity: '' }
  ])
  const [loading, setLoading] = useState(false)

  // Batch scaler multipliers per recipe ID
  const [multipliers, setMultipliers] = useState<Record<string, number>>({})
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [savingVersionId, setSavingVersionId] = useState<string | null>(null)

  const handleSaveCostVersion = async (r: Recipe) => {
    setSavingVersionId(r.id)
    try {
      const costData = calculateRecipeCost(r, masterIngredients)
      const suggested = Math.round((costData.unitCost * 2) / 100) * 100 // 100% markup
      const snapshot: Omit<RecipeCostSnapshot, 'id'> = {
        date: new Date().toISOString(),
        total_cost: costData.totalCost,
        unit_cost: costData.unitCost,
        profit_margin: 100,
        suggested_price: suggested,
        note: `Costo calculado con precios actuales de insumos`
      }

      await saveRecipeCostSnapshot(r.id, snapshot)
      const currentHist = r.cost_history || []
      const updated: Recipe = {
        ...r,
        cost_history: [{ id: Date.now().toString(), ...snapshot }, ...currentHist]
      }
      await onSaveRecipe(updated)
      showToast(`✓ Versión de costo congelada guardada (${fmt(costData.unitCost)}/u)`)
    } catch (err) {
      console.error(err)
      showToast('⚠️ Error al congelar versión de costo')
    } finally {
      setSavingVersionId(null)
    }
  }

  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (propIngredients && propIngredients.length > 0) {
      setMasterIngredients(propIngredients)
    } else {
      fetchMasterIngredients().then(setMasterIngredients)
    }
  }, [propIngredients])

  const categories = useMemo(() => {
    const set = new Set<string>(['Tartas', 'Postres en Pote', 'Tortas', 'Boxes & Varios'])
    recipes.forEach(r => {
      if (r.category) set.add(r.category)
    })
    return ['Todas', ...Array.from(set)]
  }, [recipes])

  const filteredRecipes = useMemo(() => {
    if (selectedCategoryFilter === 'Todas') return recipes
    return recipes.filter(r => (r.category || 'General') === selectedCategoryFilter)
  }, [recipes, selectedCategoryFilter])

  const openNewModal = () => {
    setEditingRecipe(null)
    setTitle('')
    setTitleError(false)
    setCategory('Tartas')
    setRecipeYield('')
    setPackagingCost('')
    setLaborHours('')
    setSteps('')
    setNotes('')
    setIngredients([{ name: '', quantity: '' }])
    setIsModalOpen(true)
  }

  const openEditModal = (r: Recipe) => {
    setEditingRecipe(r)
    setTitle(r.title)
    setTitleError(false)
    setCategory(r.category || 'Tartas')
    setRecipeYield(r.yield || '')
    setPackagingCost(r.packaging_cost ? r.packaging_cost.toString() : '')
    setLaborHours(r.labor_hours ? r.labor_hours.toString() : '')
    setSteps(r.steps || '')
    setNotes(r.notes || '')
    setIngredients(r.ingredients.length > 0 ? r.ingredients : [{ name: '', quantity: '' }])
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTitleError(false)
  }

  const handleAddIngredientRow = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }])
  }

  const handleRemoveIngredientRow = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx))
  }

  const handleIngredientChange = (idx: number, field: 'name' | 'quantity', val: string) => {
    const next = [...ingredients]
    next[idx][field] = val
    setIngredients(next)
  }

  const handleSelectMasterIngredient = (idx: number, master: IngredientMaster) => {
    const next = [...ingredients]
    next[idx].name = master.name
    setIngredients(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(true)
      titleInputRef.current?.focus()
      showToast('⚠️ Debés ingresar el nombre obligatorio de la receta')
      return
    }

    const cleanIngredients = ingredients.filter(i => i.name.trim() !== '')

    setLoading(true)
    await onSaveRecipe({
      id: editingRecipe?.id,
      title: title.trim(),
      category,
      yield: recipeYield.trim(),
      packaging_cost: parseFloat(packagingCost) || 0,
      labor_hours: parseFloat(laborHours) || 0,
      labor_rate: 3500,
      ingredients: cleanIngredients,
      steps: steps.trim(),
      notes: notes.trim(),
      created_at: new Date().toISOString()
    })

    showToast(editingRecipe ? '✓ Receta actualizada con éxito' : '✨ Receta guardada en tu recetario!')
    setIsModalOpen(false)
    setTitleError(false)
    setLoading(false)
  }

  const handleAddMasterInsumo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!insumoName.trim()) {
      showToast('⚠️ Ingresá el nombre del insumo')
      return
    }
    const cost = parseFloat(insumoCost) || 0
    const size = parseFloat(insumoSize) || 1000

    const saved = await saveMasterIngredient({
      name: insumoName.trim(),
      unit: insumoUnit,
      package_size: size,
      package_cost: cost
    })

    if (saved) {
      setMasterIngredients(prev => [...prev.filter(i => i.id !== saved.id), saved])
      showToast(`✓ Insumo "${saved.name}" actualizado en catálogo master`)
      setInsumoName('')
      setInsumoCost('')
    }
  }

  const handleDeleteMasterInsumo = async (id: string) => {
    await deleteMasterIngredient(id)
    setMasterIngredients(prev => prev.filter(i => i.id !== id))
    showToast('✓ Insumo eliminado del catálogo')
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pink-100 text-pink-600 border border-pink-200">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-playfair text-2xl font-black text-gradient-pink">Libro de Recetas & Escalado</h2>
            <p className="text-xs text-slate-500">Ajustá cantidades para tandas grandes, calculá insumos y organizá tus pasos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInsumosModalOpen(true)}
            className="py-3 px-4 rounded-2xl bg-white hover:bg-pink-50 text-slate-700 font-bold text-xs border border-pink-200 shadow-sm transition-all flex items-center gap-2"
          >
            <Package className="w-4 h-4 text-pink-500" />
            <span>Precios Insumos ({masterIngredients.length})</span>
          </button>

          <button
            onClick={openNewModal}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all duration-200 flex items-center gap-2 border border-pink-300/40 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Receta</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategoryFilter(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategoryFilter === cat
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-300 shadow-md shadow-pink-500/20 font-bold'
                : 'bg-white/80 text-slate-600 hover:bg-pink-50 border-pink-200/70'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recipes Cards Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-pink-200/50 bg-white/80 text-center text-slate-400">
          <Sparkles className="w-10 h-10 text-pink-300 mx-auto mb-2" />
          <p className="text-sm font-medium">No hay recetas guardadas en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecipes.map(r => {
            const mult = multipliers[r.id] || 1

            return (
              <div
                key={r.id}
                className="glass-panel p-6 rounded-3xl border border-pink-200/60 bg-white/80 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Category & Cost Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-pink-100/70 text-pink-700 border border-pink-200 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>{r.category || 'General'}</span>
                    </span>

                    {/* Total Recipe Cost Badge */}
                    {(() => {
                      const costData = calculateRecipeCost(r, masterIngredients)
                      return (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Costo Insumos</span>
                          <span className="text-sm font-black text-rose-600">
                            {fmt(costData.totalCost * mult)}
                            {costData.servings > 1 && <span className="text-[10px] text-slate-500 font-normal"> ({fmt(costData.unitCost)}/un)</span>}
                          </span>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Title */}
                  <h3 className="font-playfair text-xl font-bold text-slate-900 mb-1">{r.title}</h3>
                  {r.yield && (
                    <span className="text-[11px] font-medium text-slate-500 block mb-2">
                      Base: <strong className="text-slate-700">{r.yield}</strong>
                    </span>
                  )}

                  {/* Linked Catalog Product Banner */}
                  {(() => {
                    const linkedProduct = products.find(p => p.recipe_id === r.id || p.name.toLowerCase().trim() === r.title.toLowerCase().trim())
                    const costData = calculateRecipeCost(r, masterIngredients)
                    if (linkedProduct) {
                      const marginPercent = linkedProduct.price > 0 ? (((linkedProduct.price - costData.unitCost) / linkedProduct.price) * 100).toFixed(0) : '0'
                      return (
                        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-pink-50/70 border border-pink-200/80 text-xs mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base flex-shrink-0">{linkedProduct.emoji || '🍰'}</span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 block truncate">Postre: {linkedProduct.name}</span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Venta: <strong>{fmt(linkedProduct.price)}</strong> — Margen: <strong className="text-emerald-600 font-bold">{marginPercent}%</strong>
                              </span>
                            </div>
                          </div>
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('catalogo')}
                              className="text-[11px] font-bold text-pink-600 hover:text-pink-700 underline flex items-center gap-0.5 flex-shrink-0 ml-2"
                              title="Ver y editar en el catálogo de postres"
                            >
                              Catálogo →
                            </button>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 mb-3">
                        <span className="text-[11px] italic">⚠️ Sin postre vinculado en catálogo</span>
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('catalogo')}
                            className="text-[10px] font-bold text-pink-600 hover:text-pink-700 underline ml-2"
                          >
                            + Vincular
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  {/* Batch Scaler Bar */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-200 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-pink-500" />
                        <span>Escalar Receta (Multiplicador)</span>
                      </span>
                      <span className="text-xs font-black text-pink-600 bg-white px-2 py-0.5 rounded-lg border border-pink-200 shadow-sm">
                        {mult}x {mult > 1 ? `(${mult} tandas)` : ' (Base)'}
                      </span>
                    </div>

                    {/* Quick Multiplier Buttons & Stepper */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1 w-full">
                        {[1, 2, 3, 5, 10].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMultipliers(prev => ({ ...prev, [r.id]: m }))}
                            className={`flex-1 py-1 px-2 rounded-xl text-xs font-bold transition-all border ${
                              mult === m
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-300 shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-pink-50 border-pink-200'
                            }`}
                          >
                            {m}x
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setMultipliers(prev => ({ ...prev, [r.id]: Math.max(1, mult - 1) }))}
                          className="w-7 h-7 rounded-xl bg-white border border-pink-200 font-bold text-pink-600 hover:bg-pink-50 flex items-center justify-center text-xs shadow-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={mult}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value) || 1)
                            setMultipliers(prev => ({ ...prev, [r.id]: val }))
                          }}
                          className="w-10 h-7 rounded-xl bg-white border border-pink-200 text-center font-black text-xs text-pink-700"
                        />
                        <button
                          type="button"
                          onClick={() => setMultipliers(prev => ({ ...prev, [r.id]: mult + 1 }))}
                          className="w-7 h-7 rounded-xl bg-pink-500 text-white font-bold hover:bg-pink-600 flex items-center justify-center text-xs shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients List (with scaled amounts) */}
                  {r.ingredients && r.ingredients.length > 0 && (
                    <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100 mb-4 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Ingredientes {mult > 1 ? `(Escalados x${mult})` : ''}
                        </h4>
                        <span className="text-[10px] text-slate-500">{r.ingredients.length} items</span>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-700">
                        {r.ingredients.map((ing, i) => {
                          const scaledQty = formatScaledQuantity(ing.quantity, mult)
                          return (
                            <li key={i} className="flex items-center justify-between border-b border-pink-100/60 pb-1.5 last:border-0 last:pb-0">
                              <span className="font-medium text-slate-800">{ing.name}</span>
                              <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                                mult > 1
                                  ? 'bg-pink-500 text-white shadow-sm'
                                  : 'bg-white text-pink-600 border border-pink-200/60'
                              }`}>
                                {scaledQty || '-'}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Steps */}
                  {r.steps && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Paso a Paso</h4>
                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed pl-1">
                        {r.steps}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {r.notes && (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 italic mb-4">
                      💡 &quot;{r.notes}&quot;
                    </div>
                  )}

                  {/* Cost Breakdown & Historical Versioning (Requirement 5) */}
                  {(() => {
                    const costData = calculateRecipeCost(r, masterIngredients)
                    const suggestedPrice = Math.round((costData.unitCost * 2) / 100) * 100
                    const history = r.cost_history || []
                    const isExpanded = expandedHistoryId === r.id
                    const isSaving = savingVersionId === r.id

                    return (
                      <div className="p-3.5 rounded-2xl bg-white border border-pink-200/80 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-slate-800">Costo Actual & Precio Sugerido</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveCostVersion(r)}
                            disabled={isSaving}
                            className="py-1 px-2.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold border border-pink-200 transition-all flex items-center gap-1 disabled:opacity-50"
                            title="Congelar versión del costo actual con los precios de insumos de hoy"
                          >
                            <History className="w-3 h-3 text-pink-600" />
                            <span>{isSaving ? 'Guardando...' : '📸 Congelar Versión'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200/60">
                            <span className="text-[10px] text-slate-500 block">Costo Producción</span>
                            <span className="text-xs font-black text-rose-600">{fmt(costData.unitCost)} /un</span>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                            <span className="text-[10px] text-slate-500 block">Precio Sugerido (100%)</span>
                            <span className="text-xs font-black text-emerald-700">{fmt(suggestedPrice)}</span>
                          </div>
                        </div>

                        {/* Inviolability explanation banner */}
                        <div className="flex items-start gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 leading-snug">
                          <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Inmutabilidad garantizada:</strong> Las ventas pasadas mantienen su costo congelado. Actualizar insumos solo recalcula este costo actual y sugerencias futuras.
                          </span>
                        </div>

                        {/* History Toggle and Expandable List */}
                        {history.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setExpandedHistoryId(isExpanded ? null : r.id)}
                              className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-pink-600 py-1"
                            >
                              <span className="flex items-center gap-1">
                                <History className="w-3.5 h-3.5 text-pink-500" />
                                <span>Historial de Costos ({history.length} {history.length === 1 ? 'versión' : 'versiones'})</span>
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 space-y-1.5 border-t border-pink-100 pt-2 max-h-40 overflow-y-auto">
                                {history.map((h, idx) => {
                                  const dateStr = new Date(h.date).toLocaleDateString('es-AR', {
                                    day: '2-digit', month: '2-digit', year: '2-digit'
                                  })
                                  return (
                                    <div key={h.id || idx} className="p-2 rounded-lg bg-pink-50/50 border border-pink-100 text-[10px] flex items-center justify-between">
                                      <div>
                                        <span className="font-mono text-slate-500 block">{dateStr}</span>
                                        <span className="text-slate-700 font-semibold">{h.note || 'Versión guardada'}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-bold text-rose-600 block">{fmt(h.unit_cost)} /u</span>
                                        <span className="text-emerald-700 font-semibold">Sugerido: {fmt(h.suggested_price)}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-pink-100">
                  <button
                    onClick={() => openEditModal(r)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-pink-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-pink-200/80 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-pink-500" />
                    <span>Editar Receta</span>
                  </button>
                  <button
                    onClick={() => onDeleteRecipe(r.id)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border border-pink-200/80 shadow-sm"
                    title="Eliminar receta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Master Ingredients Price List Drawer/Modal */}
      {isInsumosModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-pink-300 bg-white shadow-2xl my-8 relative animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-pink-500" />
                <h3 className="font-playfair text-xl font-bold text-gradient-pink">Catálogo de Insumos & Precios</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInsumosModalOpen(false)}
                className="p-2 rounded-full hover:bg-pink-50 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Actualizá aquí el precio de compra de tu materia prima para elegirla rápidamente en tus recetas.
            </p>

            {/* Add/Edit Insumo Form */}
            <form onSubmit={handleAddMasterInsumo} className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200/80 mb-4 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Agregar o Modificar Insumo</span>
              <input
                type="text"
                placeholder="Nombre (ej: Dulce de Leche Repostero 5kg)"
                value={insumoName}
                onChange={e => setInsumoName(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
              />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Unidad</span>
                  <select
                    value={insumoUnit}
                    onChange={e => setInsumoUnit(e.target.value)}
                    className="w-full glass-input rounded-xl px-2 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
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
                    value={insumoSize}
                    onChange={e => setInsumoSize(e.target.value)}
                    className="w-full glass-input rounded-xl px-2 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Costo ($)</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={insumoCost}
                    onChange={e => setInsumoCost(e.target.value)}
                    className="w-full glass-input rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 bg-white border-pink-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Guardar Insumo en Catálogo</span>
              </button>
            </form>

            {/* List of master ingredients */}
            <div className="space-y-2 max-h-56 overflow-y-auto p-1">
              {masterIngredients.map(item => {
                const costPerUnit = item.package_size > 0 ? item.package_cost / item.package_size : 0
                return (
                  <div key={item.id} className="p-3 rounded-xl bg-white border border-pink-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{item.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {item.package_size} {item.unit} = <strong className="text-pink-600">{fmt(item.package_cost)}</strong> ({fmt(costPerUnit)}/{item.unit})
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteMasterInsumo(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Eliminar insumo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Recipe Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-pink-300 bg-white shadow-2xl my-8 relative animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-playfair text-xl font-bold text-gradient-pink">
                {editingRecipe ? 'Editar Receta' : 'Nueva Receta'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-full hover:bg-pink-50 text-slate-400 hover:text-slate-600"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Nombre de la Receta</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    placeholder="Ej: Tarta Cabsha..."
                    value={title}
                    onChange={e => {
                      setTitle(e.target.value)
                      if (e.target.value.trim()) setTitleError(false)
                    }}
                    className={`w-full glass-input rounded-xl px-4 py-2 text-sm text-slate-800 bg-white ${
                      titleError ? 'border-rose-500 ring-2 ring-rose-200' : 'border-pink-200'
                    }`}
                  />
                  {titleError && (
                    <p className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Campo obligatorio</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2 text-sm text-slate-800 bg-white border-pink-200"
                  >
                    <option value="Tartas">Tartas</option>
                    <option value="Postres en Pote">Postres en Pote</option>
                    <option value="Tortas">Tortas</option>
                    <option value="Boxes & Varios">Boxes & Varios</option>
                    <option value="Masa & Rellenos">Masa & Rellenos</option>
                  </select>
                </div>
              </div>

              {/* Yield, Packaging & Labor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rendimiento / Porciones</label>
                  <input
                    type="text"
                    placeholder="Ej: 1 tarta 24cm"
                    value={recipeYield}
                    onChange={e => setRecipeYield(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Empaque ($)</label>
                  <input
                    type="number"
                    placeholder="Ej: 450 (caja/faja)"
                    value={packagingCost}
                    onChange={e => setPackagingCost(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white border-pink-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mano Obra (hs)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 0.5 hs"
                    value={laborHours}
                    onChange={e => setLaborHours(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white border-pink-200"
                  />
                </div>
              </div>

              {/* Ingredients List Builder with Master Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Ingredientes & Cantidades</label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-xs text-pink-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir ingrediente</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto p-1">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="space-y-1 p-2 rounded-xl bg-pink-50/40 border border-pink-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ingrediente (ej: Galletitas Oreo)"
                          value={ing.name}
                          onChange={e => handleIngredientChange(idx, 'name', e.target.value)}
                          className="flex-1 glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                        />
                        <input
                          type="text"
                          placeholder="Cant. (ej: 350g, 2 u)"
                          value={ing.quantity}
                          onChange={e => handleIngredientChange(idx, 'quantity', e.target.value)}
                          className="w-28 glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white border-pink-200"
                        />
                        {ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredientRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Master Insumos Quick Selector Pills & Prorated Cost Preview */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        {masterIngredients.length > 0 && !ing.name ? (
                          <div className="flex items-center gap-1 overflow-x-auto">
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">Sugerencias:</span>
                            {masterIngredients.slice(0, 4).map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleSelectMasterIngredient(idx, m)}
                                className="px-2 py-0.5 rounded-md bg-white hover:bg-pink-100 text-[10px] text-pink-700 border border-pink-200 whitespace-nowrap"
                              >
                                + {m.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {ing.name && masterIngredients.find(m => m.name.toLowerCase() === ing.name.toLowerCase())
                              ? `Insumo vinculado: ${masterIngredients.find(m => m.name.toLowerCase() === ing.name.toLowerCase())?.name}`
                              : 'Ingrediente personalizado'}
                          </span>
                        )}
                        {ing.name && ing.quantity && (
                          <span className="font-bold text-pink-600 ml-auto">
                            Costo estimado: {fmt(calculateRecipeCost({ id: 'tmp', title: '', ingredients: [{ name: ing.name, quantity: ing.quantity }] }, masterIngredients).totalCost)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Paso a Paso</label>
                <textarea
                  rows={4}
                  placeholder="1. Mezclar la harina con la manteca fría...&#10;2. Hornear a 180°C durante 15 minutos..."
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                  className="w-full glass-input rounded-2xl p-3 text-xs text-slate-800 bg-white resize-y border-pink-200"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Secretos / Tips de Cocina</label>
                <input
                  type="text"
                  placeholder="Ej: Dejar enfriar bien antes de colocar el dulce de leche..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              {/* Submit / Cancel */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/20"
                >
                  {loading ? 'Guardando...' : 'Guardar Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
