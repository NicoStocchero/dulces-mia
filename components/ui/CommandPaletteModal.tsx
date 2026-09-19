'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ActiveTab } from '@/lib/types'
import {
  Search, Calendar, ShoppingBag, Receipt, Package, User, Store, ChefHat,
  BarChart3, Camera, Mic, Sparkles, PlusCircle, X, ChevronRight, Scale, Download
} from 'lucide-react'

interface CommandPaletteModalProps {
  isOpen: boolean
  onClose: () => void
  setActiveTab: (tab: ActiveTab) => void
  onOpenVoiceAssistant?: () => void
  onOpenTicketScanner?: () => void
  onOpenDessertScanner?: () => void
}

type CommandItem = {
  id: string
  title: string
  category: string
  tab: ActiveTab
  icon: React.ElementType
  action?: () => void
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  setActiveTab,
  onOpenVoiceAssistant,
  onOpenTicketScanner,
  onOpenDessertScanner
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          // Trigger open via custom event or props if needed
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const commands: CommandItem[] = useMemo(() => [
    { id: '1', title: 'Agendar Nuevo Pedido', category: 'Pedidos', tab: 'pedidos', icon: Calendar },
    { id: '2', title: 'Control del Local Familiar (Consignación)', category: 'Pedidos', tab: 'pedidos', icon: Store },
    { id: '3', title: 'Resumen de Producción Semanal', category: 'Pedidos', tab: 'pedidos', icon: Scale },
    { id: '4', title: 'Reconocer Postres con Cámara', category: 'Pedidos', tab: 'pedidos', icon: Camera, action: onOpenDessertScanner },
    { id: '5', title: 'Registrar Nueva Venta', category: 'Ventas', tab: 'ventas', icon: ShoppingBag },
    { id: '6', title: 'Cargar Gasto Nuevo', category: 'Gastos', tab: 'gastos', icon: Receipt },
    { id: '7', title: 'Escanear Ticket de Compra', category: 'Insumos', tab: 'insumos', icon: Camera, action: onOpenTicketScanner },
    { id: '8', title: 'Control de Stock de Materia Prima', category: 'Insumos', tab: 'insumos', icon: Package },
    { id: '9', title: 'Ver CRM de Clientes & Cumpleaños', category: 'Clientes', tab: 'clientes', icon: User },
    { id: '10', title: 'Agregar Nuevo Postre al Catálogo', category: 'Catálogo', tab: 'catalogo', icon: Store },
    { id: '11', title: 'Editar Costos y Fotos de Postres', category: 'Catálogo', tab: 'catalogo', icon: Store },
    { id: '12', title: 'Libro de Recetas & Escalador', category: 'Recetas', tab: 'recetas', icon: ChefHat },
    { id: '13', title: 'Ver Ganancias Netas y Resumen', category: 'Resumen', tab: 'resumen', icon: BarChart3 },
    { id: '14', title: 'Descargar Todos los Registros (Ventas, Gastos, Stock) en CSV/Excel', category: 'Reportes', tab: 'resumen', icon: Download },
    { id: '15', title: 'Dictar Cambios por Voz', category: 'Asistente', tab: 'pedidos', icon: Mic, action: onOpenVoiceAssistant }
  ], [onOpenVoiceAssistant, onOpenTicketScanner, onOpenDessertScanner])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
  }, [commands, query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel-glow rounded-3xl p-4 max-w-xl w-full border border-pink-300 bg-white shadow-2xl my-4 animate-scale-up">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-pink-100">
          <Search className="w-5 h-5 text-pink-500 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Buscar cualquier funcionalidad o pantalla en la app..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          <button onClick={onClose} className="p-1 rounded-full hover:bg-pink-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="mt-3 space-y-1 max-h-80 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No se encontraron funcionalidades que coincidan con &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map(cmd => {
              const Icon = cmd.icon
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    setActiveTab(cmd.tab)
                    if (cmd.action) cmd.action()
                    onClose()
                  }}
                  className="w-full p-2.5 rounded-2xl hover:bg-pink-50 text-left transition-colors flex items-center justify-between group border border-transparent hover:border-pink-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-pink-100/70 text-pink-600 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{cmd.title}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{cmd.category}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-pink-500 transition-colors" />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
