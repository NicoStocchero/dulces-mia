'use client'

import React, { useState, useMemo } from 'react'
import { Sale, Expense, Product, Recipe, Order, Customer, IngredientMaster } from '@/lib/types'
import { generateGeminiBusinessContext } from '@/lib/geminiExporter'
import { exportAllDataPackage } from '@/lib/dataExporter'
import { BarChart3, TrendingUp, DollarSign, Target, FileText, Printer, Sparkles, ArrowUpRight, Users, UserPlus, Cake, MessageCircle, Trash2, Award, Clock, Link as LinkIcon, ExternalLink, Bot, Mic, Download } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface ResumenTabProps {
  sales: Sale[]
  expenses: Expense[]
  products?: Product[]
  recipes?: Recipe[]
  orders?: Order[]
  customers?: Customer[]
  ingredients?: IngredientMaster[]
  goal: number
  notes: string
  onSaveGoal: (goal: number) => Promise<void>
  onSaveNotes: (notes: string) => Promise<void>
  onSaveCustomer?: (customer: Omit<Customer, 'id'> & { id?: string }) => Promise<Customer | null | void>
  onDeleteCustomer?: (id: string) => Promise<void>
  showToast: (msg: string) => void
}

const fmt = (n: number) => '$' + (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function ResumenTab({
  sales,
  expenses,
  products = [],
  recipes = [],
  orders = [],
  customers = [],
  ingredients = [],
  goal,
  notes,
  onSaveGoal,
  onSaveNotes,
  onSaveCustomer,
  onDeleteCustomer,
  showToast
}: ResumenTabProps) {
  const [goalInput, setGoalInput] = useState(goal.toString())
  const [notesInput, setNotesInput] = useState(notes)
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Customer CRM Form state
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custBirthday, setCustBirthday] = useState('')
  const [custNotes, setCustNotes] = useState('')
  const [isAddingCust, setIsAddingCust] = useState(false)

  // Calculations
  const totalRevenue = sales.reduce((acc, s) => acc + s.revenue, 0)
  const totalProductCost = sales.reduce((acc, s) => acc + s.cost, 0)
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0)
  const netProfit = totalRevenue - totalProductCost - totalExpenses
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'
  const goalPct = goal > 0 ? Math.min(100, (totalRevenue / goal) * 100) : 0

  // 1. Most Sold Product (Postre Estrella)
  const topSoldProduct = useMemo(() => {
    const counts: Record<string, number> = {}
    sales.forEach(s => {
      counts[s.product_name] = (counts[s.product_name] || 0) + s.quantity
    })
    let topName = 'Ninguno aún'
    let maxQty = 0
    Object.entries(counts).forEach(([pName, qty]) => {
      if (qty > maxQty) {
        maxQty = qty
        topName = pName
      }
    })
    return { name: topName, qty: maxQty }
  }, [sales])

  // 2. Most Profitable Product per Hour (Ganancia / Hora)
  const mostProfitablePerHour = useMemo(() => {
    let topProduct = 'Tarta / Postre'
    let maxProfitPerHour = 0

    products.forEach(p => {
      const recipe = recipes.find(r => r.id === p.recipe_id || r.title.toLowerCase() === p.name.toLowerCase())
      const laborHours = recipe?.labor_hours || 0.5
      const profitPerUnit = p.price - p.cost
      const profitPerHour = profitPerUnit / laborHours
      if (profitPerHour > maxProfitPerHour) {
        maxProfitPerHour = profitPerHour
        topProduct = p.name
      }
    })

    return { name: topProduct, profitPerHour: Math.round(maxProfitPerHour) }
  }, [products, recipes])

  // Birthday Alerts (Next 15 Days)
  const birthdayAlerts = useMemo(() => {
    const today = new Date()
    return customers.filter(c => {
      if (!c.birthday) return false
      const bdate = new Date(c.birthday + 'T12:00:00')
      const nextBday = new Date(today.getFullYear(), bdate.getMonth(), bdate.getDate())
      if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1)
      const diffTime = nextBday.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 15
    })
  }, [customers])

  // Chart data aggregation by date
  const chartDataMap: { [dateStr: string]: { date: string; revenue: number; profit: number } } = {}
  sales.forEach(s => {
    const d = new Date(s.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    if (!chartDataMap[d]) {
      chartDataMap[d] = { date: d, revenue: 0, profit: 0 }
    }
    chartDataMap[d].revenue += s.revenue
    chartDataMap[d].profit += s.profit
  })
  const chartData = Object.values(chartDataMap).reverse().slice(-14)

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(goalInput)
    if (isNaN(parsed) || parsed < 0) {
      showToast('⚠️ Ingresá una meta válida')
      return
    }
    await onSaveGoal(parsed)
    setIsEditingGoal(false)
    showToast('✨ Meta de ventas actualizada!')
  }

  const handleUpdateNotes = async () => {
    setIsSavingNotes(true)
    await onSaveNotes(notesInput)
    setIsSavingNotes(false)
    showToast('✓ Notas guardadas')
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim()) {
      showToast('⚠️ Ingresá el nombre del cliente')
      return
    }
    if (onSaveCustomer) {
      await onSaveCustomer({
        name: custName.trim(),
        phone: custPhone.trim(),
        birthday: custBirthday || undefined,
        notes: custNotes.trim()
      })
      setCustName('')
      setCustPhone('')
      setCustBirthday('')
      setCustNotes('')
      setIsAddingCust(false)
    }
  }

  const handleOpenMenuPublic = () => {
    window.open('/menu', '_blank')
  }

  const handleCopyMenuLink = () => {
    const url = `${window.location.origin}/menu`
    navigator.clipboard.writeText(url)
    showToast('📋 ¡Enlace a tu Menú Público copiado!')
  }

  const handleExportGeminiContext = () => {
    const markdownText = generateGeminiBusinessContext({
      products,
      orders,
      sales,
      expenses,
      ingredients: [],
      customers,
      recipes
    })

    navigator.clipboard.writeText(markdownText)

    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `dulces_mia_contexto_gemini_${new Date().toISOString().split('T')[0]}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast('🤖 ¡Contexto copiado al portapapeles y descargado para Gemini AI!')
  }

  const handleDownloadFullCSV = () => {
    exportAllDataPackage({
      sales,
      expenses,
      products,
      orders,
      ingredients,
      customers,
      recipes
    })
    showToast('📥 ¡Descargando reportes completos (Ventas, Gastos, Pedidos, Stock, Clientes) en CSV/Excel!')
  }

  const handleWhatsAppCustomer = (phone: string, name: string, isBday = false) => {
    const text = isBday
      ? `¡Hola ${name}! 🎂🎉 Desde Dulces Mía te deseamos un muy feliz cumpleaños. ¡Te regalamos un 10% OFF en tu torta de festejo! 💕`
      : `¡Hola ${name}! 🍰 ¿Cómo estás? Te escribimos de Dulces Mía para ofrecerte los postres frescos de esta semana.`

    const cleanPhone = phone.replace(/[^\d]/g, '')
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      
      {/* Public Menu Share Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-pink-300/40">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-white">
            <LinkIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-playfair text-base font-bold">Tu Catálogo Digital Público está Activo</h3>
            <p className="text-xs text-pink-100">Compartí tu menú interactivo con tus clientes para tomar pedidos directos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadFullCSV}
            className="px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-pink-50 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            title="Descargar todos los registros (Ventas, Gastos, Pedidos, Insumos) en formato CSV para Excel"
          >
            <Download className="w-4 h-4 text-pink-600" />
            <span>Descargar Todo (CSV)</span>
          </button>

          <button
            onClick={handleExportGeminiContext}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition-all border border-white/30 flex items-center gap-1.5 shadow-sm"
            title="Descarga y copia toda la información de tu negocio formateada para pegarla en tu chat de consultas"
          >
            <Bot className="w-4 h-4 text-white" />
            <span>Copiar Reporte Completo</span>
          </button>

          <button
            onClick={handleCopyMenuLink}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition-all border border-white/30 flex items-center gap-1.5"
          >
            <span>Copiar Enlace</span>
          </button>
          <button
            onClick={handleOpenMenuPublic}
            className="px-4 py-2 rounded-xl bg-white text-pink-600 hover:bg-pink-50 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Ver Menú</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Banner / Executive Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="glass-panel p-5 rounded-3xl border border-pink-200/50 bg-white/80">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
            <div className="p-2 rounded-xl bg-pink-100 text-pink-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800">{fmt(totalRevenue)}</p>
          <span className="text-[11px] text-slate-500">{sales.length} ventas realizadas</span>
        </div>

        {/* Cost + Expenses */}
        <div className="glass-panel p-5 rounded-3xl border border-rose-200/60 bg-white/80">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Costos & Gastos</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <TrendingUp className="w-4 h-4 rotate-180" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{fmt(totalProductCost + totalExpenses)}</p>
          <span className="text-[11px] text-slate-500">Insumos {fmt(totalProductCost)} • Gastos {fmt(totalExpenses)}</span>
        </div>

        {/* Net Profit */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-200/60 bg-white/80">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ganancia Neta</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">{fmt(netProfit)}</p>
          <span className="text-[11px] text-emerald-700 font-bold">Margen: {margin}%</span>
        </div>

        {/* Goal Progress */}
        <div className="glass-panel p-5 rounded-3xl border border-purple-200/60 bg-white/80">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Meta Mensual</span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-700">{goalPct.toFixed(0)}%</p>
          <span className="text-[11px] text-slate-500">{fmt(totalRevenue)} de {fmt(goal)}</span>
        </div>
      </div>

      {/* Business Intelligence Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Sold Product */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-200/70 bg-gradient-to-br from-white to-amber-50/40 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Postre Estrella (Más Vendido)</span>
            <h4 className="font-playfair text-lg font-bold text-slate-900">{topSoldProduct.name}</h4>
            <span className="text-xs text-slate-500 font-semibold">{topSoldProduct.qty} unidades vendidas</span>
          </div>
        </div>

        {/* Most Profitable Product Per Hour */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/40 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Más Rentable por Hora Trabajada</span>
            <h4 className="font-playfair text-lg font-bold text-slate-900">{mostProfitablePerHour.name}</h4>
            <span className="text-xs text-emerald-600 font-bold">{fmt(mostProfitablePerHour.profitPerHour)} ganancia neta / hora</span>
          </div>
        </div>
      </div>

      {/* CRM Pastelero: Customer Management & Birthday Alerts */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/60 bg-white/80 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-pink-100 text-pink-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-playfair text-lg font-bold text-slate-900">CRM Pastelero - Ficha de Clientes</h3>
              <p className="text-xs text-slate-500">Gestioná clientes frecuentes y recordatorios de cumpleaños</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingCust(!isAddingCust)}
            className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAddingCust ? 'Cerrar Formulario' : 'Nuevo Cliente'}</span>
          </button>
        </div>

        {/* Add Customer Form */}
        {isAddingCust && (
          <form onSubmit={handleCreateCustomer} className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cargar Nuevo Cliente</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nombre del Cliente *"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              />
              <input
                type="text"
                placeholder="Teléfono / WhatsApp (Ej: 1122334455)"
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              />
              <input
                type="date"
                placeholder="Fecha de Cumpleaños"
                value={custBirthday}
                onChange={e => setCustBirthday(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              />
            </div>
            <input
              type="text"
              placeholder="Notas (Ej: Le gusta la Tarta Cabsha, alérgica a nueces)..."
              value={custNotes}
              onChange={e => setCustNotes(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
            />
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-pink-600 text-white font-bold text-xs hover:bg-pink-700 shadow-sm"
            >
              Guardar Cliente
            </button>
          </form>
        )}

        {/* Birthday Alerts Notification Banner */}
        {birthdayAlerts.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white space-y-2 shadow-md">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Cake className="w-5 h-5" />
              <span>¡Próximos Cumpleaños de Clientes (Siguientes 15 días)!</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {birthdayAlerts.map(c => (
                <div key={c.id} className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold block">{c.name}</span>
                    <span className="text-[10px] text-amber-100">Cumple: {new Date(c.birthday! + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
                  </div>
                  <button
                    onClick={() => handleWhatsAppCustomer(c.phone || '', c.name, true)}
                    className="px-2.5 py-1 rounded-lg bg-white text-rose-600 font-bold text-[11px] hover:bg-rose-50"
                  >
                    💬 Felicitar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {customers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center col-span-3 py-6">No hay clientes registrados en el CRM aún. ¡Cargá a tus clientes habituales!</p>
          ) : (
            customers.map(c => (
              <div key={c.id} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{c.name}</span>
                    {onDeleteCustomer && (
                      <button
                        onClick={() => onDeleteCustomer(c.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {c.phone && <p className="text-[11px] text-slate-500">📱 {c.phone}</p>}
                  {c.birthday && <p className="text-[11px] text-pink-600 font-medium">🎂 Cumple: {c.birthday}</p>}
                  {c.notes && <p className="text-[10px] text-slate-600 italic mt-1">&quot;{c.notes}&quot;</p>}
                </div>

                {c.phone && (
                  <button
                    onClick={() => handleWhatsAppCustomer(c.phone!, c.name, false)}
                    className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-pink-500" />
            <h3 className="font-playfair text-lg font-bold text-slate-800">Evolución Financiera (Últimos 14 Días)</h3>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-2" />
            <p>Aún no hay suficientes datos para generar el gráfico de tendencia.</p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,114,182,0.15)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(244, 114, 182, 0.4)',
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: any) => [`$${value}`, '']}
                />
                <Area type="monotone" dataKey="revenue" name="Ventas Total" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="profit" name="Ganancia Neta" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Notes & Reminders Pad */}
      <div className="glass-panel p-6 rounded-3xl border border-pink-200/50 bg-white/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-pink-500" />
            <h3 className="font-playfair text-lg font-bold text-slate-800">Notas & Recordatorios</h3>
          </div>
          <button
            onClick={handleUpdateNotes}
            disabled={isSavingNotes}
            className="px-4 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md transition-colors"
          >
            {isSavingNotes ? 'Guardando...' : 'Guardar Notas'}
          </button>
        </div>

        <textarea
          rows={4}
          value={notesInput}
          onChange={e => setNotesInput(e.target.value)}
          placeholder="Escribí notas sobre recetas, lista de compras de insumos pendientes, encargos especiales..."
          className="w-full glass-input rounded-2xl p-4 text-xs text-slate-800 placeholder-slate-400 resize-y bg-white border-pink-200"
        />
      </div>
    </div>
  )
}
