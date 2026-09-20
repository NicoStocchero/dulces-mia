'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Product } from '@/lib/types'
import { fetchProducts } from '@/lib/supabase'
import { Cake, Sparkles, MessageCircle, Heart, Plus, Minus, ShoppingBag, X, Check, MapPin, Truck, Calendar, Clock, User, Phone, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'

const SOL_WHATSAPP_NUMBER = '5493512929615'
const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

// Default fallback photos mapping if product image_url is missing
const DESSERT_DEFAULT_PHOTOS: Record<string, string> = {
  'pote': '/images/desserts/sol_pote_oreo.jpg',
  'oreo': '/images/desserts/sol_pote_oreo.jpg',
  'chocotorta': '/images/desserts/sol_pote_oreo.jpg',
  'cabsha': '/images/desserts/sol_tarta_cabsha.png',
  'tarta': '/images/desserts/sol_tarta_cabsha.png',
  'coco': '/images/desserts/sol_tarta_cabsha.png'
}

function getProductPhoto(product: Product): string {
  if (product.image_url && product.image_url.trim() !== '') return product.image_url
  const nameLower = product.name.toLowerCase()
  for (const [key, url] of Object.entries(DESSERT_DEFAULT_PHOTOS)) {
    if (nameLower.includes(key)) return url
  }
  return '/images/desserts/sol_pote_oreo.jpg'
}

type CartItem = {
  product: Product
  quantity: number
}

export default function PublicMenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Customer Checkout Form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'Retiro' | 'Envío'>('Retiro')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [nameError, setNameError] = useState(false)

  useEffect(() => {
    fetchProducts().then(data => {
      // Show products that are active
      setProducts(data.filter(p => p.active !== false))
      setLoading(false)
    })
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => {
      if (p.category) set.add(p.category)
    })
    return ['Todas', ...Array.from(set)]
  }, [products])

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todas') return products
    return products.filter(p => (p.category || 'General') === selectedCategory)
  }, [products, selectedCategory])

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean) as CartItem[]
    })
  }

  const getItemQuantityInCart = (productId: string) => {
    const item = cart.find(i => i.product.id === productId)
    return item ? item.quantity : 0
  }

  const totalCartPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }, [cart])

  const totalCartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const [phoneError, setPhoneError] = useState(false)

  // WhatsApp Order Message Generator - 100% Clean Formatting (No Broken Emojis)
  const handleSendOrderToSolWhatsApp = (e: React.FormEvent) => {
    e.preventDefault()
    let hasErr = false

    if (!customerName.trim() || customerName.trim().length < 2) {
      setNameError(true)
      hasErr = true
    } else {
      setNameError(false)
    }

    const cleanPhoneDigits = customerPhone.replace(/\D/g, '')
    if (!customerPhone.trim() || cleanPhoneDigits.length < 8) {
      setPhoneError(true)
      hasErr = true
    } else {
      setPhoneError(false)
    }

    if (hasErr) return
    if (cart.length === 0) return

    const dateFormatted = deliveryDate
      ? new Date(deliveryDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'A coordinar'

    // Clean, robust formatting for WhatsApp Web & Mobile (No broken emoji replacement characters)
    let text = `*NUEVO PEDIDO - DULCES MIA*\n`
    text += `==============================\n\n`
    text += `*Cliente:* ${customerName.trim()}\n`
    text += `*Telefono:* ${customerPhone.trim()}\n`
    text += `*Modalidad:* ${deliveryMethod === 'Envío' ? `Envio a Domicilio (${deliveryAddress || 'A coordinar'})` : 'Retiro en Local'}\n`
    text += `*Fecha Deseada:* ${dateFormatted} ${deliveryTime ? `(${deliveryTime} hs)` : ''}\n\n`

    text += `*DETALLE DEL PEDIDO:*\n`
    cart.forEach(item => {
      text += `• ${item.quantity}x ${item.product.name}: ${fmt(item.product.price * item.quantity)}\n`
    })

    text += `\n*TOTAL PEDIDO: ${fmt(totalCartPrice)}*\n`

    if (orderNotes.trim()) {
      text += `\n*Notas / Aclaraciones:* ${orderNotes.trim()}\n`
    }

    text += `\n==============================\n`
    text += `Hola Sol! Quisiera hacer este pedido. Tenes disponibilidad?`

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#ec4899', '#f43f5e', '#ffffff']
    })

    const url = `https://wa.me/${SOL_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50/50 to-amber-50/40 text-slate-800 font-sans selection:bg-pink-500 selection:text-white pb-32">
      {/* Top Banner Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-pink-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-playfair text-lg font-bold text-slate-900 leading-tight">Dulces Mía</h1>
              <p className="text-[11px] text-pink-600 font-medium">Postres Caseros</p>
            </div>
          </div>

          <a
            href={`https://wa.me/${SOL_WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-all"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">WhatsApp: +54 9 3512 92-9615</span>
            <span className="sm:hidden">Consultar</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Intro Hero */}
        <div className="text-center space-y-3 py-2">
          <h2 className="font-playfair text-3xl sm:text-4xl font-black text-slate-900">
            Nuestros Postres Caseros
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Elaborados artesanalmente con ingredientes seleccionados de primera calidad.
          </p>

          {/* Service Banner */}
          <div className="flex flex-wrap items-center justify-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-md border border-pink-200/60 text-xs font-semibold text-slate-700 shadow-sm max-w-lg mx-auto">
            <span className="flex items-center gap-1.5 text-pink-700 font-bold"><Truck className="w-4 h-4 text-pink-500" /> Envíos a Domicilio</span>
            <span className="text-pink-300">•</span>
            <span className="flex items-center gap-1.5 text-pink-700 font-bold"><MapPin className="w-4 h-4 text-pink-500" /> Retiro por Local</span>
            <span className="text-pink-300">•</span>
            <span className="flex items-center gap-1.5 text-pink-700 font-bold"><Heart className="w-4 h-4 text-pink-500" /> 100% Artesanal</span>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-400 shadow-md shadow-pink-500/20'
                  : 'bg-white/80 text-slate-700 border-pink-200 hover:bg-pink-100/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 text-sm">
            <Sparkles className="w-8 h-8 text-pink-400 mx-auto mb-2 animate-pulse" />
            <p>Cargando postres caseros...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm glass-panel rounded-3xl p-8 bg-white/60 border-pink-100">
            <p>No hay postres disponibles en la categoría &quot;{selectedCategory}&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map(p => {
              const qtyInCart = getItemQuantityInCart(p.id)
              const photoUrl = getProductPhoto(p)

              return (
                <div
                  key={p.id}
                  className="group rounded-3xl bg-white border border-pink-200/80 shadow-md hover:shadow-xl hover:border-pink-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Real Dessert Photo */}
                    <div className="h-44 w-full relative overflow-hidden bg-pink-100/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-pink-700 border border-pink-200 shadow-sm">
                        {p.category || 'Postres'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-playfair text-lg font-bold text-slate-900 group-hover:text-pink-600 transition-colors">
                          {p.name}
                        </h3>
                      </div>

                      {p.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}

                      <div className="pt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-pink-600">{fmt(p.price)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Add to Cart / Quantity controls */}
                  <div className="p-4 pt-0">
                    {qtyInCart === 0 ? (
                      <button
                        onClick={() => handleAddToCart(p)}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar al Pedido</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between p-1 bg-pink-50 rounded-2xl border border-pink-200">
                        <button
                          onClick={() => handleUpdateQuantity(p.id, -1)}
                          className="p-2 rounded-xl bg-white hover:bg-pink-100 text-pink-700 shadow-sm transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-sm text-pink-700 px-3">{qtyInCart} en el carrito</span>
                        <button
                          onClick={() => handleUpdateQuantity(p.id, 1)}
                          className="p-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Sticky Cart Bar at Bottom */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-4 rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-bold text-sm shadow-2xl shadow-pink-500/40 flex items-center justify-between border border-white/40 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-xs text-pink-100 font-medium">{totalCartItemsCount} {totalCartItemsCount === 1 ? 'postre' : 'postres'} seleccionados</span>
                <span className="font-black text-base">{fmt(totalCartPrice)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white text-pink-600 font-extrabold text-xs shadow-md">
              <span>Ver mi Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Interactive Cart Checkout Modal Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border border-pink-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-pink-500" />
                <h3 className="font-playfair text-lg font-bold text-slate-900">Tu Pedido - Dulces Mía</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-pink-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {cart.map(item => (
                <div
                  key={item.product.id}
                  className="p-3 rounded-2xl bg-pink-50/50 border border-pink-200/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getProductPhoto(item.product)}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-xl object-cover border border-pink-200"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">{item.product.name}</span>
                      <span className="text-pink-600 font-bold">{fmt(item.product.price)} c/u</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, -1)}
                      className="p-1 rounded-lg bg-white border border-pink-200 text-slate-700 hover:bg-pink-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-black text-slate-900 px-1">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, 1)}
                      className="p-1 rounded-lg bg-pink-500 hover:bg-pink-600 text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Summary Box */}
            <div className="p-3.5 rounded-2xl bg-pink-100/50 border border-pink-200 flex items-center justify-between text-sm">
              <span className="font-bold text-slate-800">Total del Pedido</span>
              <span className="font-black text-xl text-pink-600">{fmt(totalCartPrice)}</span>
            </div>

            {/* Customer Details Form */}
            <form onSubmit={handleSendOrderToSolWhatsApp} className="space-y-3.5 pt-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Datos para la Entrega</span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tu Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Rossi"
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value)
                    if (e.target.value.trim()) setNameError(false)
                  }}
                  className={`w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 bg-white border ${
                    nameError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-pink-200'
                  }`}
                />
                {nameError && (
                  <span className="text-[10px] text-rose-600 font-bold mt-1 block">Por favor ingresá tu nombre</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono de Contacto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 3515554321"
                    value={customerPhone}
                    onChange={e => {
                      setCustomerPhone(e.target.value)
                      if (e.target.value.replace(/\D/g, '').length >= 8) setPhoneError(false)
                    }}
                    className={`w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border ${
                      phoneError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-pink-200'
                    }`}
                  />
                  {phoneError && (
                    <span className="text-[10px] text-rose-600 font-bold mt-1 block">Ingresá un teléfono válido (min. 8 números)</span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Modalidad</label>
                  <select
                    value={deliveryMethod}
                    onChange={e => setDeliveryMethod(e.target.value as any)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white border-pink-200"
                  >
                    <option value="Retiro">📍 Retiro en Local</option>
                    <option value="Envío">🛵 Envío a Domicilio</option>
                  </select>
                </div>
              </div>

              {deliveryMethod === 'Envío' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dirección de Envío</label>
                  <input
                    type="text"
                    placeholder="Calle, número, barrio..."
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fecha Deseada</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Hora Deseada</label>
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={e => setDeliveryTime(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notas / Especificaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Con velita de cumpleaños..."
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              {/* Confirm WhatsApp Order Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all active:scale-[0.99] border border-emerald-400/40"
              >
                <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                <span>Confirmar Pedido por WhatsApp</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
