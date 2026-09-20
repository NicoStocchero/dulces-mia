'use client'

import React, { useState, useEffect, useRef } from 'react'
import { interpretVoiceCommand, VoiceInterpreterResult, InterpretedAction } from '@/lib/voiceInterpreter'
import {
  Mic, MicOff, Sparkles, Loader2, CheckCircle2, X, AlertCircle,
  Edit3, ArrowRight, RotateCcw, Check, Calendar, ShoppingBag, Receipt, Package, Store, StopCircle
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

const fmt = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-AR')

export function VoiceAssistantModal({ isOpen, onClose, onExecuteActions, showToast }: VoiceAssistantModalProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<VoiceInterpreterResult | null>(null)
  const [micSupported, setMicSupported] = useState(true)
  const [micError, setMicError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const isRecordingRef = useRef(false)
  const finalTranscriptRef = useRef('')

  const stopListening = () => {
    isRecordingRef.current = false
    setIsListening(false)
    setInterimText('')
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // ignore if already stopped
      }
    }
  }

  const startListening = (keepExisting = true) => {
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

      if (!keepExisting) {
        finalTranscriptRef.current = ''
        setTranscript('')
        setInterimText('')
      } else {
        finalTranscriptRef.current = transcript.trim()
      }

      const recognition = new SpeechRecognition()
      recognition.lang = 'es-AR'
      recognition.continuous = true // Mantener escucha continua aunque haya pausas
      recognition.interimResults = true

      recognition.onstart = () => {
        isRecordingRef.current = true
        setIsListening(true)
        setMicError(null)
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + trans.trim()
          } else {
            interim += trans
          }
        }
        setInterimText(interim)
        const combined = (finalTranscriptRef.current + (interim ? ' ' + interim : '')).trim()
        setTranscript(combined)
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error)
        if (event.error === 'not-allowed') {
          isRecordingRef.current = false
          setIsListening(false)
          setMicError('Permiso de micrófono denegado. Habilitalo en los permisos del navegador o escribí la orden.')
        } else if (event.error === 'no-speech') {
          // Pausa prolongada del usuario: no cancelar de forma agresiva
        } else {
          console.warn(`Aviso de micrófono: ${event.error}`)
        }
      }

      recognition.onend = () => {
        // Si el usuario aún no presionó "Detener", reiniciar automáticamente para evitar cortes
        if (isRecordingRef.current) {
          try {
            recognition.start()
          } catch (e) {
            setTimeout(() => {
              if (isRecordingRef.current) {
                try { recognition.start() } catch (err) {}
              }
            }, 250)
          }
        } else {
          setIsListening(false)
          setInterimText('')
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      console.error('Recognition start error:', err)
      isRecordingRef.current = false
      setIsListening(false)
      setMicError('No se pudo inicializar el micrófono. Podés escribir tu orden abajo.')
    }
  }

  // Handle opening / closing
  useEffect(() => {
    if (isOpen) {
      setTranscript('')
      setInterimText('')
      finalTranscriptRef.current = ''
      setResult(null)
      setMicError(null)
      startListening(false)
    } else {
      stopListening()
    }

    return () => {
      stopListening()
    }
  }, [isOpen])

  // Process text with AI to get preview actions
  const handleInterpretVoice = async () => {
    const textToProcess = transcript.trim()
    if (!textToProcess) {
      showToast('⚠️ Escribí o dictá una orden antes de procesar')
      return
    }
    stopListening()
    setProcessing(true)
    try {
      const res = await interpretVoiceCommand(textToProcess)
      setResult(res)
    } catch (err) {
      console.error(err)
      showToast('⚠️ No se pudo procesar la orden con la IA')
    } finally {
      setProcessing(false)
    }
  }

  // Stop listening and immediately interpret
  const handleStopAndAnalyze = async () => {
    stopListening()
    await handleInterpretVoice()
  }

  // Confirm and execute the actions detected by AI
  const handleConfirmAndExecute = async () => {
    if (!result || result.actions.length === 0) return
    setExecuting(true)
    try {
      await onExecuteActions(result)
      showToast('✨ ¡Acciones registradas y ejecutadas con éxito!')
      onClose()
    } catch (err) {
      console.error(err)
      showToast('⚠️ Error al ejecutar las acciones en el sistema')
    } finally {
      setExecuting(false)
    }
  }

  // Render individual action item
  const renderActionCard = (act: InterpretedAction, idx: number) => {
    switch (act.type) {
      case 'RECORD_SALE':
        return (
          <div key={idx} className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-emerald-900">Registrar Venta Directa</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-800 font-extrabold text-[10px]">Cobrado</span>
              </div>
              <p className="text-slate-700 font-semibold mt-0.5">
                {act.data.quantity || 1}x {act.data.product_name || 'Postre'}
              </p>
              {act.data.price && (
                <p className="text-emerald-700 font-bold mt-0.5">
                  Total Venta: {fmt(act.data.price)}
                </p>
              )}
            </div>
          </div>
        )

      case 'ADD_ORDER':
        return (
          <div key={idx} className="p-3 rounded-2xl bg-pink-50/80 border border-pink-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-pink-900">Agendar Pedido</span>
                <span className="px-2 py-0.5 rounded-md bg-pink-200/80 text-pink-800 font-extrabold text-[10px]">Pendiente</span>
              </div>
              <p className="text-slate-700 font-semibold mt-0.5">
                {act.data.quantity || 1}x {act.data.product_name || 'Postre'}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Cliente: <span className="font-bold text-slate-700">{act.data.customer_name || 'Cliente Dictado'}</span>
              </p>
              {act.data.price && (
                <p className="text-pink-700 font-bold mt-0.5">
                  Monto Acordado: {fmt(act.data.price)}
                </p>
              )}
            </div>
          </div>
        )

      case 'RECORD_EXPENSE':
        return (
          <div key={idx} className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-rose-900">Registrar Gasto</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-800 font-extrabold text-[10px]">
                  {act.data.expense_type || 'Gasto'}
                </span>
              </div>
              <p className="text-slate-700 font-semibold mt-0.5">
                {act.data.description || 'Gasto por voz'}
              </p>
              <p className="text-rose-700 font-bold mt-0.5">
                Monto: {fmt(act.data.amount || 0)}
              </p>
            </div>
          </div>
        )

      case 'ADD_INGREDIENT':
        return (
          <div key={idx} className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <Package className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-purple-900">Compra de Insumo (Stock)</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-200/80 text-purple-800 font-extrabold text-[10px]">Materia Prima</span>
              </div>
              <p className="text-slate-700 font-semibold mt-0.5">
                {act.data.ingredient_name || 'Insumo'} ({act.data.quantity >= 1000 ? `${act.data.quantity / 1000} kg` : `${act.data.quantity || 1000} g`})
              </p>
              <p className="text-purple-700 font-bold mt-0.5">
                Costo Total: {fmt(act.data.amount || 0)}
              </p>
            </div>
          </div>
        )

      case 'DELIVER_TO_FAMILY_STORE':
        return (
          <div key={idx} className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <Store className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-amber-900">Traslado a Local Familiar</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-800 font-extrabold text-[10px]">En Local</span>
              </div>
              <p className="text-slate-700 font-semibold mt-0.5">
                {act.data.quantity || 1}x {act.data.product_name || 'Postre en Pote'}
              </p>
              <p className="text-amber-700 text-[11px] font-medium mt-0.5">
                Destinado a exhibición y despacho en el mostrador familiar.
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <span className="font-bold block">Acción interpretada:</span>
            <span>{act.data.description || 'Detalle no clasificado'}</span>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-pink-300 bg-white shadow-2xl my-8 animate-scale-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white shadow-md">
              <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-playfair text-lg font-bold text-slate-900">
                Asistente de Voz Inteligente
              </h3>
              <p className="text-[11px] text-pink-600 font-semibold">Dictá en cocina con manos libres o revisá el texto</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-pink-50 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Dictation & Text Review (Visible if no preview yet) */}
        {!result && (
          <div className="space-y-4 animate-fade-in">
            {/* Microphone Recording Center Box */}
            <div className="p-4 rounded-3xl bg-pink-50/50 border border-pink-200 text-center space-y-2">
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={isListening ? stopListening : () => startListening(true)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse scale-105 shadow-xl shadow-rose-500/40 ring-4 ring-rose-200'
                      : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md hover:scale-105'
                  }`}
                  title={isListening ? 'Pausar micrófono' : 'Comenzar a hablar'}
                >
                  {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">
                  {isListening ? '🎙️ Escuchando sin cortes... Podés pausar para respirar' : 'Micrófono en pausa'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isListening
                    ? 'El dictado se mantendrá activo hasta que toques el botón "Okay, hasta acá".'
                    : 'Tocá el micrófono para seguir dictando o escribí abajo.'}
                </p>
              </div>

              {/* Explicit "Okay, hasta acá" Stop & Analyze Button */}
              {isListening && (
                <button
                  type="button"
                  onClick={handleStopAndAnalyze}
                  className="mt-1 w-full py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <StopCircle className="w-4 h-4 text-rose-400" />
                  <span>⏹️ Okay, hasta acá (Procesar con IA)</span>
                </button>
              )}

              {micError && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-xl mt-2">
                  {micError}
                </p>
              )}
            </div>

            {/* Editable Transcript Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-pink-500" />
                  <span>Texto dictado o escrito:</span>
                </label>
                {transcript && (
                  <button
                    type="button"
                    onClick={() => {
                      finalTranscriptRef.current = ''
                      setTranscript('')
                      setInterimText('')
                    }}
                    className="text-[10px] text-slate-400 hover:text-rose-500 underline"
                  >
                    Limpiar texto
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                value={transcript}
                onChange={e => {
                  setTranscript(e.target.value)
                  finalTranscriptRef.current = e.target.value
                }}
                placeholder='Ej: "Hice 5 postres oreo para enviar al local familiar y anoté un gasto de $4500 en manteca"'
                className="w-full glass-input rounded-2xl p-3 text-xs text-slate-800 bg-white border-pink-200 focus:border-pink-500 resize-none font-medium leading-relaxed"
              />
            </div>

            {/* Quick Example Presets */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                💡 Ejemplos rápidos para probar:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VOICE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTranscript(preset)
                      finalTranscriptRef.current = preset
                    }}
                    className="text-[10px] font-medium bg-pink-50/70 hover:bg-pink-100/80 text-pink-700 border border-pink-200/80 px-2.5 py-1 rounded-xl transition-all text-left"
                  >
                    &quot;{preset}&quot;
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons: Cancel vs Interpret */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleInterpretVoice}
                disabled={processing || !transcript.trim()}
                data-testid="interpret-voice-btn"
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-pink-500/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Interpretando dictado...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Interpretar Dictado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: AI Action Preview & Human-In-The-Loop Confirmation */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* Friendly Speech Response Box */}
            <div className="p-3.5 rounded-2xl bg-pink-50/80 border border-pink-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-pink-900">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <span>Interpretación de la IA:</span>
              </div>
              <p className="pl-5 text-slate-700 font-medium italic">
                &quot;{result.speech_response}&quot;
              </p>
            </div>

            {/* Actions List Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Acciones a registrar ({result.actions.length}):
                </span>
                <span className="text-[11px] text-pink-600 font-semibold">
                  Revisá antes de confirmar
                </span>
              </div>

              {result.actions.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No se reconocieron acciones específicas</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Podés modificar el texto para aclarar qué postre, gasto o pedido querés registrar.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {result.actions.map((act, idx) => renderActionCard(act, idx))}
                </div>
              )}
            </div>

            {/* Confirmation Banner */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs font-bold text-slate-800">
                ¿Está todo okay para registrar estas acciones en el sistema?
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Si algo no coincide, podés volver atrás para corregir el texto sin perder nada.
              </p>
            </div>

            {/* Decision Buttons: Back to Edit vs Execute */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                disabled={executing}
                className="flex-1 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Modificar texto</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmAndExecute}
                disabled={executing || result.actions.length === 0}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando acciones...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>✓ Sí, Ejecutar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
