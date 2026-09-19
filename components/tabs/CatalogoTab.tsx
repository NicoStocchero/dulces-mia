'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Product, Recipe, IngredientMaster } from '@/lib/types'
import { fetchMasterIngredients } from '@/lib/supabase'
import { BookOpen, PlusCircle, Edit3, Trash2, CheckCircle2, XCircle, Tag, Sparkles, ChefHat, Calculator, Lock, Unlock, MessageCircle, Plus, Minus, X, DollarSign, Wallet, Filter, Camera } from 'lucide-react'

interface CatalogoTabProps {
  products: Product[]
  recipes?: Recipe[]
  ingredients?: IngredientMaster[]
  onSaveProduct: (product: Omit<Product, 'id'> & { id?: string }) => Promise<void>
  onDeleteProduct: (id: string) => Promise<void>
  showToast: (msg: string) => void
  onNavigateTab?: (tab: any) => void
}

const EMOJIS = ['🍰', '🧁', '🍩', '🍪', '🎂', '🍫', '🍮', '🥐', '🍬', '🍭', '🍓', '🍋', '🍒', '🍯']
const DEFAULT_CATEGORIES = ['Tartas', 'Postres', 'Tortas', 'Boxes & Varios', 'General']
const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

import { calculateRecipeCost } from '@/lib/costCalculations'
export { calculateRecipeCost }

export function CatalogoTab({ products, recipes = [], ingredients: propIngredients, onSaveProduct, onDeleteProduct, showToast, onNavigateTab }: CatalogoTabProps) {
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todas')
  const [masterIngredients, setMasterIngredients] = useState<IngredientMaster[]>(propIngredients || [])
  
  // Quote Builder State (Armador de Presupuestos Múltiples)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [quoteItems, setQuoteItems] = useState<{ product: Product; quantity: number }[]>([])
  const [quoteClientName, setQuoteClientName] = useState('')
  const [quoteDeliveryCost, setQuoteDeliveryCost] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')

  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [emoji, setEmoji] = useState('🍰')
  const [category, setCategory] = useState('Tartas')
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('')
  const [isAutoCost, setIsAutoCost] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (propIngredients && propIngredients.length > 0) {
      setMasterIngredients(propIngredients)
    } else {
      fetchMasterIngredients().then(setMasterIngredients)
    }
  }, [propIngredients])

  // Upload & compress photo from iPhone / Camera Roll
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 800

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        setImageUrl(compressedBase64)
        showToast('📸 Foto procesada e integrada con éxito!')
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleDirectPhotoUpload = (product: Product, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 800

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        await onSaveProduct({
          ...product,
          image_url: compressedBase64
        })
        showToast(`📸 Foto actualizada para ${product.name}!`)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Quote Builder Operations
  const handleAddQuoteItem = (prod: Product) => {
    setQuoteItems(prev => {
      const existing = prev.find(i => i.product.id === prod.id)
      if (existing) {
        return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product: prod, quantity: 1 }]
    })
  }

  const handleUpdateQuoteQty = (prodId: string, delta: number) => {
    setQuoteItems(prev => {
      return prev.map(i => {
        if (i.product.id === prodId) {
          const nq = i.quantity + delta
          return nq > 0 ? { ...i, quantity: nq } : null
        }
        return i
      }).filter(Boolean) as { product: Product; quantity: number }[]
    })
  }

  const quoteSubtotal = useMemo(() => {
    return quoteItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }, [quoteItems])

  const totalQuoteWithDelivery = quoteSubtotal + (parseFloat(quoteDeliveryCost) || 0)
  const deposit50 = Math.round(totalQuoteWithDelivery * 0.5)

  const handleSendCustomQuoteWhatsApp = () => {
    if (quoteItems.length === 0) {
      showToast('⚠️ Agregá al menos 1 postre al presupuesto')
      return
    }

    let text = `✨ *DULCES MÍA - Presupuesto* ✨\n`
    if (quoteClientName.trim()) text += `👤 *Para:* ${quoteClientName.trim()}\n`
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`
    text += `📝 *DETALLE DE PRODUCTOS:*\n`

    quoteItems.forEach(item => {
      text += `• ${item.quantity}x ${item.product.emoji || '🍰'} ${item.product.name} — ${fmt(item.product.price * item.quantity)}\n`
    })

    if (parseFloat(quoteDeliveryCost) > 0) {
      text += `• 🛵 Envío a Domicilio — ${fmt(parseFloat(quoteDeliveryCost))}\n`
    }

    text += `\n💰 *TOTAL PRESUPUESTO: ${fmt(totalQuoteWithDelivery)}*\n`
    text += `💚 *Seña 50% para agendar:* ${fmt(deposit50)}\n`
    text += `⏳ *Saldo a abonar al retirar:* ${fmt(totalQuoteWithDelivery - deposit50)}\n`

    if (quoteNotes.trim()) {
      text += `\n💡 *Notas:* ${quoteNotes.trim()}\n`
    }

    text += `\n¡Muchas gracias por tu consulta! 💕`

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    showToast('💬 Presupuesto generado para enviar por WhatsApp!')
  }

  // Extract all existing categories dynamically
  const categoriesList = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES)
    products.forEach(p => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [products])

  const filterTabCategories = useMemo(() => ['Todas', ...categoriesList], [categoriesList])

  const filteredProducts = useMemo(() => {
    if (selectedCategoryFilter === 'Todas') return products
    return products.filter(p => (p.category || 'General') === selectedCategoryFilter)
  }, [products, selectedCategoryFilter])

  const selectedRecipe = useMemo(() => {
    return recipes.find(r => r.id === selectedRecipeId)
  }, [recipes, selectedRecipeId])

  const calculatedRecipeCost = useMemo(() => {
    if (!selectedRecipe) return null
    return calculateRecipeCost(selectedRecipe, masterIngredients)
  }, [selectedRecipe, masterIngredients])

  // Automatically update cost field whenever selected recipe changes and auto cost is active
  useEffect(() => {
    if (selectedRecipe && calculatedRecipeCost && isAutoCost) {
      setCost(calculatedRecipeCost.unitCost.toString())
    }
  }, [selectedRecipe, calculatedRecipeCost, isAutoCost])

  const [savedManualCost, setSavedManualCost] = useState<number | null>(null)

  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')

  const openNewModal = () => {
    setEditingProduct(null)
    setName('')
    setCost('')
    setPrice('')
    setEmoji('🍰')
    setCategory('Tartas')
    setCustomCategory('')
    setIsCustomCategory(false)
    setSelectedRecipeId('')
    setImageUrl('')
    setDescription('')
    setIsAutoCost(true)
    setSavedManualCost(null)
    setIsModalOpen(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setName(p.name)
    setPrice(p.price.toString())
    setEmoji(p.emoji || '🍰')
    setSelectedRecipeId(p.recipe_id || '')
    setImageUrl(p.image_url || '')
    setDescription(p.description || '')
    
    const linkedR = recipes.find(r => r.id === p.recipe_id)
    const calcCost = linkedR ? calculateRecipeCost(linkedR, masterIngredients) : null
    
    // Only default to auto cost if recipe yields a valid > 0 cost
    const hasValidAutoCost = Boolean(calcCost && calcCost.unitCost > 0)
    const autoCostSaved = p.is_auto_cost !== undefined ? p.is_auto_cost : hasValidAutoCost
    setIsAutoCost(autoCostSaved)

    const savedManual = p.manual_cost ?? p.cost ?? 0
    setSavedManualCost(savedManual)

    if (autoCostSaved && calcCost && calcCost.unitCost > 0) {
      setCost(calcCost.unitCost.toString())
    } else {
      setCost(savedManual > 0 ? savedManual.toString() : (p.cost > 0 ? p.cost.toString() : ''))
    }

    const catVal = p.category || 'General'
    if (categoriesList.includes(catVal)) {
      setCategory(catVal)
      setIsCustomCategory(false)
    } else {
      setCategory('__CUSTOM__')
      setCustomCategory(catVal)
      setIsCustomCategory(true)
    }
    setIsModalOpen(true)
  }

  const handleToggleAutoCost = (newAutoState: boolean) => {
    setIsAutoCost(newAutoState)
    if (!newAutoState) {
      // Switching to Personalizado: Restore saved manual cost or current cost
      if (savedManualCost !== null) {
        setCost(savedManualCost.toString())
      }
    } else {
      // Switching to Automático: Calculate recipe cost if recipe selected
      if (calculatedRecipeCost) {
        setCost(calculatedRecipeCost.unitCost.toString())
      }
    }
  }

  const handleRevertCost = () => {
    if (savedManualCost !== null) {
      setCost(savedManualCost.toString())
      setIsAutoCost(false)
      showToast('✓ Costo manual restaurado al valor anterior')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let parsedCost = parseFloat(cost) || 0
    const parsedPrice = parseFloat(price) || 0

    // Only override with auto cost if auto cost is enabled AND yields a valid cost > 0
    const validAutoCost = (isAutoCost && calculatedRecipeCost && calculatedRecipeCost.unitCost > 0)
      ? calculatedRecipeCost.unitCost
      : null

    const finalCost = validAutoCost !== null ? validAutoCost : parsedCost

    const finalCategory = isCustomCategory
      ? (customCategory.trim() || 'General')
      : (category === '__CUSTOM__' ? (customCategory.trim() || 'General') : category)

    if (!name.trim()) {
      showToast('⚠️ Ingresá el nombre del postre')
      return
    }
    const safeCost = (isNaN(finalCost) || finalCost < 0) ? 0 : finalCost
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast('⚠️ Ingresá un precio de venta válido')
      return
    }

    const manualCostValue = parsedCost > 0 ? parsedCost : (savedManualCost ?? safeCost)

    setLoading(true)
    await onSaveProduct({
      id: editingProduct?.id,
      name: name.trim(),
      cost: safeCost,
      price: parsedPrice,
      emoji,
      category: finalCategory,
      image_url: imageUrl.trim() || undefined,
      description: description.trim() || undefined,
      recipe_id: selectedRecipeId || undefined,
      active: editingProduct?.active ?? true,
      is_auto_cost: validAutoCost !== null,
      manual_cost: manualCostValue
    })

    showToast(editingProduct ? '✓ Producto actualizado' : '✨ Nuevo producto agregado al catálogo!')
    setIsModalOpen(false)
    setLoading(false)
  }

  const handleToggleActive = async (p: Product) => {
    await onSaveProduct({
      ...p,
      active: !p.active
    })
    showToast(`✓ ${p.name} ${!p.active ? 'activado' : 'desactivado'}`)
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pink-100 text-pink-600 border border-pink-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-playfair text-2xl font-black text-gradient-pink">Catálogo de Postres</h2>
            <p className="text-xs text-slate-500">Costo automático desde la receta de insumos (o costo personalizado)</p>
          </div>
        </div>

        <button
          onClick={openNewModal}
          className="py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all duration-200 flex items-center gap-2 border border-pink-300/40 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Agregar Nuevo Postre</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filterTabCategories.map(cat => {
          const isSel = selectedCategoryFilter === cat
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm flex items-center gap-1.5 ${
                isSel
                  ? 'bg-slate-900 text-white border-slate-800 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-700 hover:bg-pink-100/70 border-pink-300 hover:border-pink-400'
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${isSel ? 'text-pink-400' : 'text-pink-500'}`} />
              <span>{cat}</span>
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-pink-200/50 text-center text-slate-400 text-sm bg-white/70">
          <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-2" />
          <p>No hay postres en la categoría &quot;{selectedCategoryFilter}&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map(p => {
            const linkedRecipe = recipes.find(r => r.id === p.recipe_id)
            const calculatedCost = linkedRecipe ? calculateRecipeCost(linkedRecipe, masterIngredients) : null
            const isAutoSaved = p.is_auto_cost !== undefined ? p.is_auto_cost : Boolean(p.recipe_id)
            const hasRecipeAutoCost = Boolean(isAutoSaved && calculatedCost && calculatedCost.unitCost > 0)
            const activeCost = hasRecipeAutoCost ? calculatedCost!.unitCost : (p.manual_cost && p.manual_cost > 0 ? p.manual_cost : (p.cost || 0))
            const profit = p.price - activeCost
            const margin = p.price > 0 ? ((profit / p.price) * 100).toFixed(0) : '0'

            return (
              <div
                key={p.id}
                className={`glass-panel p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                  p.active !== false
                    ? 'border-pink-200/80 hover:border-pink-300 hover:shadow-lg hover:shadow-pink-500/10 bg-white/90'
                    : 'border-slate-200/80 bg-slate-50/70 opacity-60'
                }`}
              >
                <div>
                  {/* Real Photo or Upload Dropzone Banner */}
                  <div className="relative mb-3 overflow-hidden rounded-2xl border border-pink-200/80 bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 group">
                    <label className="block w-full h-40 cursor-pointer relative overflow-hidden group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleDirectPhotoUpload(p, e)}
                        className="hidden"
                      />

                      {p.image_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-pink-700 text-xs font-bold shadow-md flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-pink-600" />
                              <span>Cambiar Foto</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center hover:bg-pink-100/50 transition-colors border-2 border-dashed border-pink-300 rounded-2xl">
                          <Camera className="w-8 h-8 text-pink-400 mb-1" />
                          <span className="text-xs font-bold text-pink-700 block">Subir Fotografía</span>
                          <span className="text-[10px] text-slate-500 block">Desde iPhone, Cámara o Galería</span>
                        </div>
                      )}
                    </label>

                    {/* Status & Category Overlays */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleActive(p)
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md border shadow-sm flex items-center gap-1 ${
                          p.active !== false
                            ? 'bg-emerald-500/90 text-white border-emerald-400'
                            : 'bg-slate-700/80 text-white border-slate-600'
                        }`}
                        title={p.active !== false ? 'Pausar postre' : 'Activar postre'}
                      >
                        {p.active !== false ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{p.active !== false ? 'Visible' : 'Pausado'}</span>
                      </button>
                    </div>

                    {p.category && (
                      <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/90 text-pink-700 border border-pink-200 shadow-sm backdrop-blur-md">
                          {p.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title & Recipe link badge */}
                  <h3 className="font-playfair font-bold text-slate-800 text-lg mb-1">{p.name}</h3>

                  {linkedRecipe ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-pink-600 font-semibold mb-3">
                      <ChefHat className="w-3.5 h-3.5" />
                      <span className="truncate">Receta: {linkedRecipe.title}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 mb-3 italic">
                      Sin receta vinculada
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-pink-50/50 border border-pink-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block flex items-center gap-1">
                        <span>Costo Insumos</span>
                        {linkedRecipe && <span className="text-[9px] text-pink-600 font-bold">(Auto)</span>}
                      </span>
                      <span className="font-bold text-rose-600">{fmt(activeCost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Precio Venta</span>
                      <span className="font-bold text-pink-600">{fmt(p.price)}</span>
                    </div>
                  </div>

                  {/* Profit bar */}
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-emerald-700">Ganancia un.:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-emerald-600 text-sm">{fmt(profit)}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">
                        +{margin}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-pink-100">
                  <label className="py-2 px-2.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm border border-pink-200">
                    <Camera className="w-3.5 h-3.5 text-pink-600" />
                    <span>Subir Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleDirectPhotoUpload(p, e)}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => openEditModal(p)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-pink-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-pink-200/80 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-pink-500" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => onDeleteProduct(p.id)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border border-pink-200/80 shadow-sm"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / New Product Modal (Responsive with Sticky Header & Sticky Footer) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 pb-20 sm:pb-6 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel-glow rounded-3xl border border-pink-300 bg-white shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Sticky Header */}
            <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between flex-shrink-0 bg-white/95">
              <div>
                <h3 className="font-playfair text-xl font-bold text-gradient-pink">
                  {editingProduct ? 'Editar Postre' : 'Nuevo Postre en Catálogo'}
                </h3>
                <p className="text-[11px] text-slate-500">Completá los datos del postre para la venta</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-pink-50 transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form with scrollable body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                
                {/* Product Name Input (Required) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Nombre del Postre / Producto</span>
                    <span className="text-rose-500 font-bold">* Requerido</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Tarta de Ricota, Tarta Cabsha, Lemon Pie..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 bg-white border-pink-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                {/* Emoji Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Emoji Icono</label>
                  <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-pink-50/60 border border-pink-200/70">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={`text-xl p-1.5 rounded-lg transition-transform ${
                          emoji === e ? 'bg-pink-200/80 border border-pink-400 scale-110 shadow-sm' : 'hover:scale-105'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fotografía del Postre (Para el Menú Público)</label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImageUrl('/images/desserts/sol_pote_oreo.jpg')}
                        className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                          imageUrl === '/images/desserts/sol_pote_oreo.jpg' ? 'bg-pink-100 border-pink-500 text-pink-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>🍧 Potes Oreo (Foto Real)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImageUrl('/images/desserts/sol_tarta_cabsha.png')}
                        className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                          imageUrl === '/images/desserts/sol_tarta_cabsha.png' ? 'bg-pink-100 border-pink-500 text-pink-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>🥧 Tarta Cabsha (Foto Real)</span>
                      </button>
                    </div>

                    <div className="pt-1">
                      <label className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all">
                        <span>📷 Subir Foto desde Celular / Galería</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="O pegá la URL de una foto (https://...)"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                    />
                  </div>
                </div>

                {/* Description for Public Menu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción Comercial (Se muestra en el Menú Público)</label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Tarta artesanal de chocolate cobertura 70% con dulce de leche repostero en masa quebrada suiza..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>

                {/* Linked Recipe Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <ChefHat className="w-3.5 h-3.5 text-pink-500" />
                    <span>Receta Vinculada</span>
                  </label>
                  <select
                    value={selectedRecipeId}
                    onChange={e => {
                      const rId = e.target.value
                      setSelectedRecipeId(rId)
                      if (rId) {
                        setIsAutoCost(true)
                        const foundRecipe = recipes.find(r => r.id === rId)
                        if (foundRecipe) {
                          if (!name.trim()) {
                            setName(foundRecipe.title)
                          }
                          if (foundRecipe.category && (!category || category === 'Tartas')) {
                            setCategory(foundRecipe.category)
                          }
                        }
                      }
                    }}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-800 bg-white border-pink-200 cursor-pointer"
                  >
                    <option value="">-- Sin receta vinculada (Costo manual) --</option>
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>
                        📖 {r.title} ({r.category || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={isCustomCategory ? '__CUSTOM__' : category}
                    onChange={e => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomCategory(true)
                      } else {
                        setIsCustomCategory(false)
                        setCategory(e.target.value)
                      }
                    }}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-800 bg-white border-pink-200 cursor-pointer"
                  >
                    {categoriesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__CUSTOM__">+ Nueva categoría personalizada...</option>
                  </select>

                  {isCustomCategory && (
                    <input
                      type="text"
                      placeholder="Escribí el nombre de la nueva categoría..."
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2 text-xs text-slate-800 bg-white border-pink-300 mt-2"
                      required
                    />
                  )}
                </div>

                {/* Pricing & Cost Box */}
                <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-200/70 space-y-3">
                  {selectedRecipe ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <Calculator className="w-3.5 h-3.5 text-pink-500" />
                          <span>Modo de Costo</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleAutoCost(!isAutoCost)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                            isAutoCost
                              ? 'bg-pink-500 text-white border-pink-400 shadow-sm'
                              : 'bg-amber-500 text-white border-amber-400 shadow-sm'
                          }`}
                        >
                          {isAutoCost ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span>{isAutoCost ? 'Automático (Receta)' : 'Personalizado (Manual)'}</span>
                        </button>
                      </div>

                      {!isAutoCost && savedManualCost !== null && (
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-500">Costo manual guardado: <strong>{fmt(savedManualCost)}</strong></span>
                          <button
                            type="button"
                            onClick={handleRevertCost}
                            className="text-pink-600 hover:text-pink-700 font-bold underline"
                          >
                            Restablecer costo
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-700 block">Precios del Postre</span>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-rose-600 mb-1 flex items-center justify-between">
                        <span>Costo Insumos ($)</span>
                        {selectedRecipe && (
                          <span className={`text-[10px] font-bold ${isAutoCost ? 'text-pink-600' : 'text-amber-600'}`}>
                            {isAutoCost ? '(Auto)' : '(Manual)'}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        disabled={selectedRecipe ? isAutoCost : false}
                        value={cost}
                        onChange={e => setCost(e.target.value)}
                        className={`w-full glass-input rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white border-pink-200 ${
                          selectedRecipe && isAutoCost ? 'opacity-80 bg-pink-100/50 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-emerald-600 mb-1 flex items-center justify-between">
                        <span>Precio Venta ($)</span>
                        <span className="text-rose-500 text-[10px] font-bold">* Requerido</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="Ej: 4500"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white border-pink-300 focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer (Always Visible on all screen sizes) */}
              <div className="px-6 py-4 border-t border-pink-100 flex items-center gap-3 bg-pink-50/60 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !price}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {loading ? 'Guardando...' : (editingProduct ? '✓ Actualizar Postre' : '✨ Guardar Postre')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quote Builder Modal (Cotizador Express Múltiple) */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel-glow p-6 rounded-3xl border border-emerald-200 bg-white max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-playfair text-lg font-bold text-slate-900">Armador de Presupuestos</h3>
                  <p className="text-xs text-slate-500">Seleccioná postres, calculá la seña del 50% y enviá por WhatsApp</p>
                </div>
              </div>

              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Name & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Cliente (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Laura Rossi"
                  value={quoteClientName}
                  onChange={e => setQuoteClientName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-emerald-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Costo de Envío ($ Opcional)</label>
                <input
                  type="number"
                  placeholder="Ej: 1500"
                  value={quoteDeliveryCost}
                  onChange={e => setQuoteDeliveryCost(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-emerald-200"
                />
              </div>
            </div>

            {/* Selector to add product from catalog */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Agregar Postre al Presupuesto</label>
              <select
                onChange={e => {
                  const p = products.find(prod => prod.id === e.target.value)
                  if (p) handleAddQuoteItem(p)
                  e.target.value = ''
                }}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white border-emerald-200"
              >
                <option value="">-- Seleccionar postre para agregar --</option>
                {products.filter(p => p.active !== false).map(p => (
                  <option key={p.id} value={p.id}>{p.emoji || '🍰'} {p.name} ({fmt(p.price)})</option>
                ))}
              </select>
            </div>

            {/* Added Items List */}
            <div className="space-y-2 border-t border-b border-slate-100 py-3">
              <span className="text-xs font-bold text-slate-700 block">Ítems Incluidos en el Presupuesto</span>
              {quoteItems.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">Seleccioná postres del desplegable arriba para armar la cotización.</p>
              ) : (
                quoteItems.map(item => (
                  <div key={item.product.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{item.product.emoji || '🍰'} {item.product.name}</span>
                      <span className="text-pink-600 font-bold block">{fmt(item.product.price * item.quantity)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuoteQty(item.product.id, -1)}
                        className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-black px-1 text-slate-800">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuoteQty(item.product.id, 1)}
                        className="p-1 rounded-lg bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Price Calculations */}
            {quoteItems.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal Postres:</span>
                  <span className="font-bold">{fmt(quoteSubtotal)}</span>
                </div>
                {parseFloat(quoteDeliveryCost) > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Envío:</span>
                    <span className="font-bold">{fmt(parseFloat(quoteDeliveryCost))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between font-black text-slate-900 pt-1 border-t border-emerald-200/60">
                  <span>Total Cotizado:</span>
                  <span className="text-sm text-pink-600">{fmt(totalQuoteWithDelivery)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-emerald-700 pt-1">
                  <span>💚 Seña 50% para agendar:</span>
                  <span>{fmt(deposit50)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Aclaraciones adicionales (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Entrega el sábado a las 17hs, incluye velita..."
                value={quoteNotes}
                onChange={e => setQuoteNotes(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSendCustomQuoteWhatsApp}
                disabled={quoteItems.length === 0}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Generar Presupuesto para WhatsApp</span>
              </button>

              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
