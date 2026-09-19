'use client'

import React, { useState, useMemo } from 'react'
import { Customer, Order, Sale } from '@/lib/types'
import { User, Phone, MapPin, Gift, Cake, Sparkles, Heart, Search, PlusCircle, Edit3, Trash2, Calendar, ShoppingBag, MessageCircle, Star, CheckCircle2, Clock, X, ChevronRight, Filter } from 'lucide-react'

const DIETARY_OPTIONS = [
  { id: 'Sin TACC', label: 'Sin TACC', icon: Sparkles },
  { id: 'Sin Lactosa', label: 'Sin Lactosa', icon: Heart },
  { id: 'Frutos Secos', label: 'Alergia Frutos Secos', icon: X },
  { id: 'Menos Dulce', label: 'Menos Dulce', icon: Cake }
]

interface ClientesTabProps {
  customers: Customer[]
  orders: Order[]
  sales: Sale[]
  onSaveCustomer: (customerData: Omit<Customer, 'id'> & { id?: string }) => Promise<Customer | null | void>
  onDeleteCustomer: (id: string) => Promise<void>
  showToast: (msg: string) => void
}

export function ClientesTab({ customers, orders, sales, onSaveCustomer, onDeleteCustomer, showToast }: ClientesTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'todos' | 'cumple' | 'vip'>('todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [birthday, setBirthday] = useState('')
  const [favoriteDessert, setFavoriteDessert] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [addressNotes, setAddressNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Helper for birthday calculations
  const getBirthdayInfo = (bdayStr?: string) => {
    if (!bdayStr) return null
    const today = new Date()
    const bday = new Date(bdayStr + 'T12:00:00')
    if (isNaN(bday.getTime())) return null

    const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
    if (nextBday < today) {
      nextBday.setFullYear(today.getFullYear() + 1)
    }

    const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 3600 * 24))
    const formattedDate = bday.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })

    return {
      formattedDate,
      daysLeft: diffDays,
      isToday: diffDays === 0 || diffDays === 365,
      isUpcoming: diffDays <= 30
    }
  }

  // Calculate customer purchase history
  const customerStats = useMemo(() => {
    const map = new Map<string, { totalSpent: number; totalOrders: number; items: string[] }>()

    customers.forEach(c => {
      const cNameLower = c.name.toLowerCase().trim()
      let spent = 0
      let count = 0
      const items: string[] = []

      orders.forEach(o => {
        if (o.customer_name.toLowerCase().trim() === cNameLower) {
          spent += o.total_price || 0
          count++
          if (o.product_name) items.push(o.product_name)
        }
      })

      sales.forEach(s => {
        if (s.product_name && s.product_name.toLowerCase().includes(cNameLower)) {
          spent += s.revenue || 0
          count++
        }
      })

      map.set(c.id, { totalSpent: spent, totalOrders: count, items })
    })

    return map
  }, [customers, orders, sales])

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery = !q || (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.favorite_dessert && c.favorite_dessert.toLowerCase().includes(q))
      )

      if (!matchesQuery) return false

      if (filterMode === 'cumple') {
        const bInfo = getBirthdayInfo(c.birthday)
        return bInfo ? bInfo.isUpcoming : false
      }

      if (filterMode === 'vip') {
        const stats = customerStats.get(c.id)
        return stats ? (stats.totalOrders >= 2 || stats.totalSpent >= 15000) : false
      }

      return true
    })
  }, [customers, searchQuery, filterMode, customerStats])

  const openNewModal = () => {
    setEditingCustomer(null)
    setName('')
    setPhone('')
    setAddress('')
    setBirthday('')
    setFavoriteDessert('')
    setSelectedTags([])
    setAddressNotes('')
    setNotes('')
    setIsModalOpen(true)
  }

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c)
    setName(c.name)
    setPhone(c.phone || '')
    setAddress(c.address || '')
    setBirthday(c.birthday || '')
    setFavoriteDessert(c.favorite_dessert || '')
    setSelectedTags(c.dietary_tags || [])
    setAddressNotes(c.address_notes || '')
    setNotes(c.notes || '')
    setIsModalOpen(true)
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('⚠️ Ingresá el nombre del cliente')
      return
    }

    setLoading(true)
    await onSaveCustomer({
      id: editingCustomer?.id,
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      birthday: birthday || undefined,
      favorite_dessert: favoriteDessert.trim() || undefined,
      dietary_tags: selectedTags,
      address_notes: addressNotes.trim() || undefined,
      notes: notes.trim() || undefined
    })

    showToast(editingCustomer ? '✓ Ficha de cliente actualizada' : '✨ Nuevo cliente guardado en el CRM!')
    setIsModalOpen(false)
    setLoading(false)
  }

  // Open direct WhatsApp chat
  const handleOpenWhatsApp = (phoneStr?: string) => {
    if (!phoneStr) return
    const cleanPhone = phoneStr.replace(/\D/g, '')
    const fullNum = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`
    window.open(`https://wa.me/${fullNum}`, '_blank')
  }

  // Birthday Greeting Promo WhatsApp
  const handleSendBirthdayGreeting = (c: Customer) => {
    if (!c.phone) return
    const cleanPhone = c.phone.replace(/\D/g, '')
    const fullNum = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`
    const msg = `Hola ${c.name.split(' ')[0]}! 💕 Desde Dulces Mia te deseamos un muy feliz cumpleanos! Queremos regalarte un descuento especial para tu torta de festejo. Que tengas un hermoso dia!`
    window.open(`https://wa.me/${fullNum}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pink-100 text-pink-600 border border-pink-200">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-playfair text-2xl font-black text-gradient-pink">CRM & Fichas de Clientes</h2>
            <p className="text-xs text-slate-500">Historial de compras, preferencias alimentarias y alertas de cumpleaños</p>
          </div>
        </div>

        <button
          onClick={openNewModal}
          className="py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all duration-200 flex items-center gap-2 border border-pink-300/40 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-pink-200/60 bg-white/80 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-pink-100 text-pink-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Clientes CRM</span>
            <span className="text-xl font-black text-slate-800">{customers.length} fichas</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-purple-200/80 bg-purple-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-700">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-purple-900 block">Cumpleañeros este Mes</span>
              <span className="text-xl font-black text-purple-800">
                {customers.filter(c => getBirthdayInfo(c.birthday)?.isUpcoming).length} clientes
              </span>
            </div>
          </div>
          <button
            onClick={() => setFilterMode('cumple')}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
          >
            Ver
          </button>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-amber-900 block">Clientes VIP Recurrentes</span>
              <span className="text-xl font-black text-amber-800">
                {customers.filter(c => (customerStats.get(c.id)?.totalOrders || 0) >= 2).length} VIPs
              </span>
            </div>
          </div>
          <button
            onClick={() => setFilterMode('vip')}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
          >
            Ver VIPs
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-pink-200/60 bg-white/80 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre, teléfono, dirección o postre favorito..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-2 text-xs text-slate-800 bg-white border-pink-200"
            />
          </div>

          <div className="md:col-span-6 flex items-center gap-1 bg-pink-50/80 p-1 rounded-2xl border border-pink-200/60">
            <button
              onClick={() => setFilterMode('todos')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterMode === 'todos' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({customers.length})
            </button>

            <button
              onClick={() => setFilterMode('cumple')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                filterMode === 'cumple' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-700 hover:bg-purple-100/50'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Cumpleaños</span>
            </button>

            <button
              onClick={() => setFilterMode('vip')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                filterMode === 'vip' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-100/50'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Clientes VIP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm glass-panel rounded-3xl p-8 bg-white/60">
          <User className="w-8 h-8 text-pink-300 mx-auto mb-2" />
          <p>No se encontraron clientes en el CRM.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map(c => {
            const bInfo = getBirthdayInfo(c.birthday)
            const stats = customerStats.get(c.id) || { totalSpent: 0, totalOrders: 0, items: [] }
            const isVip = stats.totalOrders >= 2 || stats.totalSpent >= 15000

            return (
              <div
                key={c.id}
                className="glass-panel p-5 rounded-3xl border border-pink-200/80 hover:border-pink-300 transition-all duration-200 bg-white/90 shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Avatar & Badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-pink-500/20">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-playfair font-bold text-slate-900 text-base leading-tight">
                          {c.name}
                        </h3>
                        {c.phone && (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {c.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {isVip && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-sm">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>VIP</span>
                      </span>
                    )}
                  </div>

                  {/* Culinary Preferences Box */}
                  <div className="p-3.5 rounded-2xl bg-pink-50/60 border border-pink-100 space-y-2 mb-3">
                    {c.favorite_dessert && (
                      <div className="flex items-center gap-1.5 text-xs text-pink-700 font-bold">
                        <Cake className="w-4 h-4 text-pink-500" />
                        <span>Favorito: <strong className="text-slate-800">{c.favorite_dessert}</strong></span>
                      </div>
                    )}

                    {c.dietary_tags && c.dietary_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-pink-100/60">
                        {c.dietary_tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-pink-200 shadow-2xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {bInfo && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-pink-100/60">
                        <span className="flex items-center gap-1 text-purple-700 font-semibold text-[11px]">
                          <Gift className="w-3.5 h-3.5 text-purple-500" />
                          <span>{bInfo.formattedDate}</span>
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          bInfo.isToday ? 'bg-purple-600 text-white animate-pulse' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {bInfo.isToday ? '🎉 ¡Cumple Hoy!' : `Cumple en ${bInfo.daysLeft} días`}
                        </span>
                      </div>
                    )}

                    {c.address && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-600 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{c.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Purchase History Summary Badge */}
                  <button
                    onClick={() => setSelectedHistoryCustomer(c)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-pink-50 border border-slate-200/80 hover:border-pink-200 text-left flex items-center justify-between transition-colors mb-3"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <ShoppingBag className="w-4 h-4 text-pink-500" />
                      <span className="font-bold text-slate-800">{stats.totalOrders} pedidos realizados</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-pink-100">
                  {c.phone && (
                    <button
                      onClick={() => handleOpenWhatsApp(c.phone)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  )}

                  {bInfo && bInfo.isUpcoming && c.phone && (
                    <button
                      onClick={() => handleSendBirthdayGreeting(c)}
                      className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200"
                      title="Enviar felicitación de cumpleaños por WhatsApp"
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => openEditModal(c)}
                    className="p-2 rounded-xl bg-white hover:bg-pink-50 text-slate-700 border border-pink-200 shadow-sm"
                    title="Editar ficha del cliente"
                  >
                    <Edit3 className="w-4 h-4 text-pink-500" />
                  </button>

                  <button
                    onClick={() => onDeleteCustomer(c.id)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-pink-200 shadow-sm"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / New Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-md w-full border border-pink-300 bg-white shadow-2xl my-8 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <h3 className="font-playfair text-xl font-bold text-slate-900">
                {editingCustomer ? 'Editar Ficha de Cliente' : 'Nuevo Cliente en CRM'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:bg-pink-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Rossi"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: 3515554321"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Cumpleaños</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={e => setBirthday(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white border-pink-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección & Barrio</label>
                <input
                  type="text"
                  placeholder="Ej: Av. Colón 1234, Barrio Alberdi"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Postre / Sabor Favorito</label>
                <input
                  type="text"
                  placeholder="Ej: Tarta Cabsha 18cm, Pote Oreo..."
                  value={favoriteDessert}
                  onChange={e => setFavoriteDessert(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              {/* Dietary Tags Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Preferencias Alimentarias & Alergias</label>
                <div className="flex flex-wrap gap-1.5">
                  {DIETARY_OPTIONS.map(opt => {
                    const isSelected = selectedTags.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleTag(opt.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-pink-500 text-white border-pink-400 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-pink-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Le gusta la chocotorta bien helada, entregar después de las 18hs..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-slate-800 bg-white border-pink-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all"
              >
                {loading ? 'Guardando...' : editingCustomer ? 'Actualizar Ficha' : 'Guardar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal Drawer */}
      {selectedHistoryCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-pink-300 bg-white shadow-2xl my-8 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h3 className="font-playfair text-lg font-bold text-slate-900">
                  Historial de Compras — {selectedHistoryCustomer.name}
                </h3>
                <p className="text-xs text-pink-600 font-semibold">
                  Total consumido: ${(customerStats.get(selectedHistoryCustomer.id)?.totalSpent || 0).toLocaleString('es-AR')}
                </p>
              </div>
              <button onClick={() => setSelectedHistoryCustomer(null)} className="p-1 rounded-xl text-slate-400 hover:bg-pink-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {orders.filter(o => o.customer_name.toLowerCase().trim() === selectedHistoryCustomer.name.toLowerCase().trim()).map(o => (
                <div key={o.id} className="p-3 rounded-2xl bg-pink-50/50 border border-pink-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{o.quantity}x {o.product_name}</span>
                    <span className="text-[10px] text-slate-500">Fecha: {o.delivery_date || 'Sin fecha'}</span>
                  </div>
                  <span className="font-black text-pink-600">${(o.total_price || 0).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
