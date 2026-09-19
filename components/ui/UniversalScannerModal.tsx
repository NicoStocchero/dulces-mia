'use client'

import React, { useState } from 'react'
import { analyzeUniversalImage, UniversalScanResult } from '@/lib/geminiUniversalScanner'
import { Camera, Sparkles, X, Check, FileText, ShoppingBag, Receipt, ArrowRight } from 'lucide-react'

interface UniversalScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onExecuteScan: (result: UniversalScanResult) => Promise<void>
  showToast: (msg: string) => void
}

export function UniversalScannerModal({ isOpen, onClose, onExecuteScan, showToast }: UniversalScannerModalProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [scanResult, setScanResult] = useState<UniversalScanResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setPreviewUrl(base64)
      setAnalyzing(true)
      setScanResult(null)

      try {
        const result = await analyzeUniversalImage(base64)
        setScanResult(result)
      } catch (err) {
        showToast('⚠️ No se pudo analizar la imagen. Intentá con otra foto.')
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleConfirmAndSave = async () => {
    if (!scanResult) return
    setSaving(true)
    try {
      await onExecuteScan(scanResult)
      showToast('✨ ¡Acción registrada en el sistema con éxito!')
      onClose()
    } catch (err) {
      showToast('⚠️ Error guardando el resultado del escaneo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-pink-300 bg-white shadow-2xl my-8 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-pink-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-playfair text-lg font-bold text-slate-800">
                Escáner Inteligente con Cámara
              </h3>
              <p className="text-[11px] text-pink-600 font-semibold">Subí o saca foto a un ticket, lote de postres o nota de pedido</p>
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
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 rounded-full bg-pink-100 text-pink-600 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold text-slate-800">Tocar para Tomar o Subir Foto</span>
                <span className="text-[10px] text-slate-500 max-w-xs">
                  Ticket de compra, postres producidos en la mesada o anotación de pedido
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {analyzing && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin mx-auto" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Analizando Imagen...</h4>
              <p className="text-xs text-slate-500">Identificando si es un gasto, lote de producción o pedido</p>
            </div>
          </div>
        )}

        {/* Result Card */}
        {scanResult && !analyzing && (
          <div className="space-y-4 py-2">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Vista previa" className="w-full h-36 object-cover rounded-2xl border border-pink-200" />
            )}

            <div className="p-4 rounded-2xl bg-pink-50/80 border border-pink-200 space-y-2">
              <div className="flex items-center gap-2 text-pink-700 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span className="uppercase tracking-wider">Resultado del Análisis</span>
              </div>
              <p className="text-xs font-semibold text-slate-800">{scanResult.summary}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => { setScanResult(null); setPreviewUrl(null) }}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold text-xs transition-colors"
              >
                Volver a Tomar
              </button>
              <button
                onClick={handleConfirmAndSave}
                disabled={saving}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{saving ? 'Guardando...' : 'Confirmar y Registrar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
