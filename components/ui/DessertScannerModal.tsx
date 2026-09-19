'use client'

import React, { useState } from 'react'
import { Product } from '@/lib/types'
import { analyzeDessertsPhotoWithGemini, ScannedDessertResult } from '@/lib/gemini'
import { Sparkles, Camera, Store, Loader2, PackageCheck, X, Cake } from 'lucide-react'

interface DessertScannerModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  onConfirmBatch: (detectedDesserts: Array<{ productId?: string; productName: string; qty: number }>) => Promise<void>
  showToast: (msg: string) => void
}

export function DessertScannerModal({ isOpen, onClose, products, onConfirmBatch, showToast }: DessertScannerModalProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [scanResult, setScanResult] = useState<ScannedDessertResult | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setScanResult(null)
      await runDessertAnalysis(base64)
    }
    reader.readAsDataURL(file)
  }

  const runDessertAnalysis = async (base64: string) => {
    setAnalyzing(true)
    try {
      const availableNames = products.map(p => p.name)
      const result = await analyzeDessertsPhotoWithGemini(base64, availableNames)

      // Auto match detected names with products
      const matched = result.detected_desserts.map(item => {
        const itemLower = item.name.toLowerCase()
        const found = products.find(p => itemLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(itemLower))
        return {
          ...item,
          matched_product_id: found?.id
        }
      })

      setScanResult({
        ...result,
        detected_desserts: matched
      })
      showToast('✨ ¡Postres en la mesada detectados exitosamente por Gemini IA!')
    } catch (err: any) {
      showToast('⚠️ No se pudieron reconocer los postres. Intentá con una foto con buena luz.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleConfirm = async () => {
    if (!scanResult) return
    setSaving(true)
    try {
      await onConfirmBatch(
        scanResult.detected_desserts.map(d => ({
          productId: d.matched_product_id,
          productName: d.name,
          qty: d.quantity || 1
        }))
      )
      showToast('🎉 ¡Lote de postres registrado y entregado al Local Familiar!')
      onClose()
    } catch (err) {
      showToast('⚠️ Error registrando producción de postres')
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
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-playfair text-lg font-bold text-slate-800 flex items-center gap-1.5">
                Reconocimiento Visual de Postres
              </h3>
              <p className="text-[11px] text-pink-600 font-semibold">Fotografiá la mesada para registrar el lote producido</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-pink-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Trigger */}
        {!scanResult && !analyzing && (
          <div className="space-y-4 text-center py-6">
            <div className="p-6 rounded-3xl border-2 border-dashed border-purple-300 bg-purple-50/40 hover:bg-purple-50 transition-colors cursor-pointer relative group">
              <input
                type="file"
                accept="image/*"
                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <Cake className="w-12 h-12 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-slate-800">Fotografiar Mesada o Heladera de Producción</p>
              <p className="text-xs text-slate-500 mt-1">Saca una foto a los postres listos y la IA reconocerá cuántas unidades hiciste de cada uno.</p>
            </div>
          </div>
        )}

        {analyzing && (
          <div className="text-center py-10 space-y-3">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
            <p className="font-bold text-slate-800 text-sm">🤖 Gemini AI analizando la mesada de cocina...</p>
            <p className="text-xs text-slate-500">Identificando potes Oreo, tartas cabsha y contando unidades</p>
          </div>
        )}

        {scanResult && !analyzing && (
          <div className="space-y-4">
            {scanResult.notes && (
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-900">
                💡 {scanResult.notes}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-700 block">Postres Reconocidos por la Cámara</span>
              {scanResult.detected_desserts?.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl border border-purple-100 bg-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-pink-500" />
                    <div>
                      <span className="font-bold text-slate-800 block">{item.name}</span>
                      <span className="text-[10px] text-slate-500">Confianza IA: {Math.round((item.confidence || 0.9) * 100)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-purple-700 text-sm">{item.quantity} unidades</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setScanResult(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Reintentar Foto
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                <span>🏪 Enviar Lote al Local Familiar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
