'use client'

import React, { useState } from 'react'
import { LogoBadge } from './LogoBadge'
import { Lock, Delete, Sparkles } from 'lucide-react'

const TARGET_PIN = process.env.NEXT_PUBLIC_ACCESS_PIN || '4321'

export function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [hint, setHint] = useState('')

  const handleKeyPress = (num: string) => {
    if (pin.length >= TARGET_PIN.length) return
    const nextPin = pin + num
    setPin(nextPin)
    setError(false)

    if (nextPin.length === TARGET_PIN.length) {
      if (nextPin === TARGET_PIN) {
        onSuccess()
      } else {
        setError(true)
        setHint('PIN incorrecto. Intentá nuevamente.')
        setTimeout(() => {
          setPin('')
          setError(false)
          setHint('')
        }, 700)
      }
    }
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
    setError(false)
    setHint('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-100/80 via-rose-50/50 to-amber-50/60">
      {/* Background ambient glow circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-rose-200/30 rounded-full blur-2xl pointer-events-none" />

      {/* Main Container */}
      <div className="glass-panel-glow rounded-3xl p-8 max-w-sm w-full flex flex-col items-center z-10 animate-float shadow-xl border border-pink-200/60 bg-white/80">
        
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 transform hover:scale-105 transition-transform duration-300">
            <LogoBadge size="lg" />
          </div>
          <h1 className="font-playfair text-3xl font-black tracking-tight text-gradient-pink mt-2">
            Dulces Mía
          </h1>
          <p className="text-xs text-rose-500/80 font-medium tracking-wide mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3 text-pink-500" /> Control de Gestión & Postres
          </p>
        </div>

        {/* PIN Indicators (Dots) */}
        <div className={`flex items-center gap-3.5 mb-2 transition-transform ${error ? 'animate-shake' : ''}`}>
          {Array.from({ length: TARGET_PIN.length }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                i < pin.length
                  ? 'bg-gradient-to-tr from-pink-500 to-rose-400 shadow-[0_0_12px_rgba(244,114,182,0.6)] scale-110'
                  : 'bg-rose-100/80 border border-pink-200'
              }`}
            />
          ))}
        </div>

        {/* Hint text */}
        <div className="h-6 mb-4 flex items-center justify-center">
          {hint ? (
            <span className="text-xs font-semibold text-rose-500 tracking-wide">{hint}</span>
          ) : (
            <span className="text-[11px] text-slate-400 tracking-wider">Ingresá el PIN de 4 dígitos</span>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
            <button
              key={n}
              onClick={() => handleKeyPress(n)}
              className="w-16 h-16 rounded-2xl glass-panel hover:bg-pink-100/60 active:scale-95 border border-pink-200/60 font-outfit text-xl font-bold text-slate-700 transition-all duration-150 flex items-center justify-center shadow-sm hover:border-pink-300"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-2xl glass-panel hover:bg-pink-100/60 active:scale-95 border border-pink-200/60 font-outfit text-xl font-bold text-slate-700 transition-all duration-150 flex items-center justify-center shadow-sm hover:border-pink-300"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-2xl glass-panel hover:bg-rose-100/60 active:scale-95 border border-rose-200 font-outfit text-lg font-bold text-rose-500 transition-all duration-150 flex items-center justify-center shadow-sm"
            title="Borrar"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-[10px] text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-pink-400" />
          <span>Dulces Mía • Pastelería Artesanal</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
    </div>
  )
}
