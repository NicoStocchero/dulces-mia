'use client'

import React, { useState } from 'react'
import { IngredientMaster } from '@/lib/types'
import { analyzeReceiptWithGemini, ScannedReceiptResult } from '@/lib/gemini'
import { Sparkles, Camera, Upload, CheckCircle2, AlertCircle, Loader2, DollarSign, PackageCheck, X } from 'lucide-react'

interface ReceiptScannerModalProps {
  isOpen: boolean
  onClose: () => void
  masterIngredients: IngredientMaster[]
  onConfirmReceipt: (data: {
    merchantName: string
    date: string
    totalAmount: number
    items: Array<{
      ingredientId?: string
      name: string
      qty: number
      unit: string
      price: number
    }>
  }) => Promise<void>
  showToast: (msg: string) => void
}

export function ReceiptScannerModal({ isOpen, onClose, masterIngredients, onConfirmReceipt, showToast }: ReceiptScannerModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [scanResult, setScanResult] = useState<ScannedReceiptResult | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setImagePreview(base64)
      setScanResult(null)
      await runAnalysis(base64)
    }
    reader.readAsDataURL(file)
  }

  const runAnalysis = async (base64: string) => {
    setAnalyzing(true)
    try {
      const result = await analyzeReceiptWithGemini(base64)
      
      // Auto match items with masterIngredients
      const matchedItems = result.items.map(item => {
        const itemLower = item.name.toLowerCase()
        const match = masterIngredients.find(ing => 
          itemLower.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(itemLower)
        )
        return {
          ...item,
          matched_ingredient_id: match?.id
        }
      })

      setScanResult({
        ...result,
        items: matchedItems
      })
      showToast('✨ Ticket analizado exitosamente por Gemini IA!')
    } catch (err: any) {
      showToast('⚠️ No se pudo analizar el ticket. Intentá con una foto más clara.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleConfirm = async () => {
    if (!scanResult) return
    setSaving(true)
    try {
      await onConfirmReceipt({
        merchantName: scanResult.merchant_name || 'Supermercado / Mayorista',
        date: scanResult.date || new Date().toISOString().split('T')[0],
        totalAmount: scanResult.total_amount || 0,
        items: scanResult.items.map(i => ({
          ingredientId: i.matched_ingredient_id,
          name: i.name,
          qty: i.quantity || 1,
          unit: i.unit || 'g',
          price: i.price || 0
        }))
      })
      showToast('🎉 ¡Gasto e inventario de insumos actualizados con IA!')
      onClose()
    } catch (err) {
      showToast('⚠️ Error guardando resultado del ticket')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-pink-300 bg-white shadow-2xl my-8 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-pink-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-playfair text-lg font-bold text-slate-800 flex items-center gap-1.5">
                Escáner de Tickets de Compra
              </h3>
              <p className="text-[11px] text-pink-600 font-semibold">Lectura automática de insumos y precios de factura</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-pink-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!scanResult && !analyzing && (
          <div className="space-y-4 text-center py-6">
            <div className="p-6 rounded-3xl border-2 border-dashed border-pink-300 bg-pink-50/40 hover:bg-pink-50 transition-colors cursor-pointer relative group">
              <input
                type="file"
                accept="image/*"
                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <Camera className="w-12 h-12 text-pink-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-slate-800">Sacar Foto o Subir Ticket de Compra</p>
              <p className="text-xs text-slate-500 mt-1">La Inteligencia Artificial detectará automáticamente los insumos, precios y actualizará tu inventario.</p>
            </div>
          </div>
        )}

        {analyzing && (
          <div className="text-center py-10 space-y-3">
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto" />
            <p className="font-bold text-slate-800 text-sm">🤖 Gemini AI analizando el ticket...</p>
            <p className="text-xs text-slate-500">Leyendo nombres de insumos, cantidades y precios del supermercado</p>
          </div>
        )}

        {scanResult && !analyzing && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-between text-xs font-bold text-slate-800">
              <span>📍 {scanResult.merchant_name || 'Comprobante'}</span>
              <span>📅 {scanResult.date}</span>
              <span className="text-pink-600 font-extrabold text-sm">${scanResult.total_amount?.toLocaleString('es-AR')}</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-700 block">Insumos Detectados ({scanResult.items?.length || 0})</span>
              {scanResult.items?.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl border border-pink-100 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{item.name}</span>
                    <span className="text-[10px] text-slate-500">Cantidad: {item.quantity} {item.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 block">${item.price?.toLocaleString('es-AR')}</span>
                    {item.matched_ingredient_id ? (
                      <span className="text-[9px] font-bold text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded-md">✓ VINCULADO</span>
                    ) : (
                      <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">NUEVO INSUMO</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => { setScanResult(null); setImagePreview(null) }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Reintentar Foto
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/20 flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                <span>Confirmar & Cargar Stock</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
