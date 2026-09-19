'use client'

import React, { useState } from 'react'
import { Plus, Calendar, ShoppingBag, Receipt, Mic, Camera } from 'lucide-react'

interface SpeedDialProps {
  onOpenNewOrder: () => void
  onOpenNewSale: () => void
  onOpenNewExpense: () => void
  onOpenVoiceAssistant?: () => void
  onOpenUniversalScanner?: () => void
}

export function SpeedDialFAB({
  onOpenNewOrder,
  onOpenNewSale,
  onOpenNewExpense,
  onOpenVoiceAssistant,
  onOpenUniversalScanner
}: SpeedDialProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Speed dial action options menu */}
      {isOpen && (
        <div className="mb-3 p-2.5 rounded-3xl bg-white/95 backdrop-blur-xl border border-pink-200/90 shadow-2xl space-y-1.5 w-64 animate-scale-up origin-bottom-right">
          {onOpenUniversalScanner && (
            <button
              onClick={() => handleAction(onOpenUniversalScanner)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-purple-50 text-slate-800 transition-all font-bold text-xs group"
            >
              <span className="truncate">Escanear con Cámara</span>
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <Camera className="w-4 h-4" />
              </div>
            </button>
          )}

          {onOpenVoiceAssistant && (
            <button
              onClick={() => handleAction(onOpenVoiceAssistant)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-pink-50 text-slate-800 transition-all font-bold text-xs group"
            >
              <span className="truncate">Asistente de Voz</span>
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <Mic className="w-4 h-4" />
              </div>
            </button>
          )}

          <button
            onClick={() => handleAction(onOpenNewOrder)}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-pink-50 text-slate-800 transition-all font-bold text-xs group"
          >
            <span className="truncate">Agendar Pedido</span>
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </button>

          <button
            onClick={() => handleAction(onOpenNewSale)}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-emerald-50 text-slate-800 transition-all font-bold text-xs group"
          >
            <span className="truncate">Registrar Venta</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </button>

          <button
            onClick={() => handleAction(onOpenNewExpense)}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-rose-50 text-slate-800 transition-all font-bold text-xs group"
          >
            <span className="truncate">Cargar Gasto</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Main Floating Action Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Menú de acciones rápidas"
        className={`w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-600 text-white shadow-2xl shadow-pink-500/40 flex items-center justify-center border-2 border-white/50 transition-all duration-300 active:scale-90 ${
          isOpen ? 'rotate-45 bg-slate-800' : 'hover:scale-105'
        }`}
        title="Acciones Rápidas"
      >
        <Plus className="w-7 h-7 text-white stroke-[2.5]" />
      </button>
    </div>
  )
}
