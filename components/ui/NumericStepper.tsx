'use client'

import React from 'react'
import { Plus, Minus } from 'lucide-react'

interface NumericStepperProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  className?: string
}

export function NumericStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  label,
  className = ''
}: NumericStepperProps) {
  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step)
    }
  }

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value)
    if (!isNaN(parsed)) {
      if (parsed >= min && parsed <= max) {
        onChange(parsed)
      } else if (parsed < min) {
        onChange(min)
      }
    } else if (e.target.value === '') {
      onChange(min)
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
      )}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 w-fit">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="p-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition-all active:scale-95"
          title="Restar 1"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          className="w-12 text-center bg-transparent text-xs font-black text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="p-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-sm transition-all active:scale-95"
          title="Sumar 1"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
