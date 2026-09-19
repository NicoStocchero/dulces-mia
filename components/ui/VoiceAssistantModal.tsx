'use client'

import React, { useState, useEffect, useRef } from 'react'
import { interpretVoiceCommand, VoiceInterpreterResult } from '@/lib/voiceInterpreter'
import {
  Mic, MicOff, Sparkles, Loader2, CheckCircle2, X, AlertCircle,
  Volume2, Edit3, ArrowRight
} from 'lucide-react'

interface VoiceAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  onExecuteActions: (result: VoiceInterpreterResult) => Promise<void>
  showToast: (msg: string) => void
}

const VOICE_PRESETS = [
  'Hice 5 postres oreo y 3 chocotortas para enviar al local familiar',
  'Gasté 8500 pesos en dulce de leche para insumos',
  'Vendí 2 chocotortas en pote cobradas a 5000 cada una',
  'Anotame un pedido de 2 tartas cabsha para el viernes'
]

export function VoiceAssistantModal({ isOpen, onClose, onExecuteActions, showToast }: VoiceAssistantModalProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<VoiceInterpreterResult | null>(null)
  const [micSupported, setMicSupported] = useState(true)
  const [micError, setMicError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)

  const stopListening = () => {
    setIsListening(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // ignore if already stopped
      }
    }
  }

  const startListening = () => {
    setMicError(null)
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setMicSupported(false)
      setMicError('El reconocimiento de voz por micrófono no está soportado en este navegador. Podés escribir tu orden directamente.')
      return
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
      }

      const recognition = new SpeechRecognition()
      recognition.lang = 'es-AR'
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onstart = () => {
        setIsListening(true)
        setMicError(null)
      }

      recognition.onresult = (event: any) => {
        let currentText = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript
        }
        setTranscript(currentText)
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setMicError('Permiso de micrófono denegado. Habilitalo en los permisos del navegador o escribí la orden.')
        } else if (event.error === 'no-speech') {
          // just silent, do not error aggressively
        } else {
          setMicError(`Aviso de micrófono: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      console.error('Recognition start error:', err)
      setIsListening(false)
      setMicError('No se pudo inicializar el micrófono. Podés escribir tu orden abajo.')
    }
  }

  useEffect(() => {
    if (isOpen) {
      setTranscript('')
      setResult(null)
      setMicError(null)
      startListening()
    } else {
      stopListening()
    }

    return () => {
      stopListening()
    }
  }, [isOpen])

  const handleProcessTranscript = async () => {
    if (!transcript.trim()) {
      showToast('⚠️ Escribí o dictá una orden antes de procesar')
      return
    }
    stopListening()
    setProcessing(true)
    try {
      const res = await interpretVoiceCommand(transcript.trim())
      setResult(res)
      await onExecuteActions(res)
      showToast('✨ ¡Acciones dictadas ejecutadas exitosamente en el sistema!')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error(err)
      showToast('⚠️ No se pudo procesar la orden con la IA')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-purple-300 bg-white shadow-2xl my-8 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-md">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-playfair text-lg font-bold text-slate-800">
                Asistente de Voz Inteligente
              </h3>
              <p className="text-[11px] text-pink-600 font-semibold">Dictá o escribí acciones para cocina con manos libres</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-purple-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Microphone Animation and Toggle Button */}
          <div className="text-center py-2">
            <div className="relative inline-block">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-lg shadow-rose-500/40 ring-4 ring-rose-200'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:scale-105'
                }`}
                title={isListening ? 'Detener escucha' : 'Comenzar a hablar'}
              >
                {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 mt-2">
              {isListening ? '🎙️ Escuchando... Dictá con naturalidad' : 'Toca el micrófono para comenzar a hablar'}
            </p>

            {micError && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-xl mt-2 mx-auto max-w-sm">
                {micError}
              </p>
            )}
          </div>

          {/* Editable Transcript Textarea (allows manual edits or typing if mic fails) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5 text-purple-500" />
                <span>Texto dictado o escrito:</span>
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="text-[10px] text-slate-400 hover:text-rose-500 underline"
                >
                  Limpiar
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder='Ej: "Hice 5 postres oreo para el local familiar y anoté un gasto de $4500 en manteca"'
              className="w-full glass-input rounded-2xl p-3 text-xs text-slate-800 bg-purple-50/50 border-purple-200 focus:bg-white resize-none"
            />
          </div>

          {/* Quick Voice Presets */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              💡 Ejemplos rápidos (tocá para probar):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {VOICE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTranscript(preset)}
                  className="text-[10px] font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 px-2.5 py-1 rounded-xl transition-all text-left"
                >
                  &quot;{preset}&quot;
                </button>
              ))}
            </div>
          </div>

          {/* Success Response Box */}
          {result && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1 animate-fade-in">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Confirmación de la IA:</span>
              </div>
              <p className="pl-5 italic">&quot;{result.speech_response}&quot;</p>
              <div className="pl-5 text-[11px] text-emerald-700 font-medium">
                ✓ {result.actions.length} {result.actions.length === 1 ? 'acción registrada' : 'acciones registradas'}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleProcessTranscript}
              disabled={processing || !transcript.trim()}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Interpretando orden...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ejecutar Orden</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
