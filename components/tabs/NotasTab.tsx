'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { SolNote } from '@/lib/types'
import { fetchSetting, saveSetting } from '@/lib/supabase'
import {
  FileText, PlusCircle, CheckCircle2, Circle, Trash2, Edit3,
  Search, Sparkles, Check, Tag, Clock, Lightbulb, Cake, ShoppingCart, Bell, X
} from 'lucide-react'

interface NotasTabProps {
  showToast: (msg: string) => void
}

const STORAGE_KEY = 'sol_app_notes'
const SETTING_KEY = 'sol_general_notes_json'

const CATEGORIES: { id: SolNote['category']; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: 'Ideas', label: 'Ideas de Postres', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  { id: 'Encargos', label: 'Encargos Especiales', icon: Cake, color: 'text-pink-500', bg: 'bg-pink-50 border-pink-200' },
  { id: 'Compras', label: 'Cosas para Comprar', icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'Recordatorio', label: 'Recordatorios', icon: Bell, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' },
  { id: 'General', label: 'Notas Generales', icon: FileText, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' }
]

export function NotasTab({ showToast }: NotasTabProps) {
  const [notes, setNotes] = useState<SolNote[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Form State for New or Editing Note
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState<SolNote['category']>('General')

  // Initial Load from Supabase settings or LocalStorage
  useEffect(() => {
    async function loadNotes() {
      try {
        const rawJson = await fetchSetting(SETTING_KEY, '')
        if (rawJson) {
          try {
            const parsed = JSON.parse(rawJson)
            if (Array.isArray(parsed)) {
              setNotes(parsed)
              localStorage.setItem(STORAGE_KEY, rawJson)
              setLoading(false)
              return
            }
          } catch (e) {}
        }

        // Fallback to local storage
        const local = localStorage.getItem(STORAGE_KEY)
        if (local) {
          try {
            const parsed = JSON.parse(local)
            if (Array.isArray(parsed)) {
              setNotes(parsed)
              setLoading(false)
              return
            }
          } catch (e) {}
        }

        // Initial default welcome note for Sol
        const initialNotes: SolNote[] = [
          {
            id: '1',
            title: '¡Bienvenida a tu Bloc de Notas! 💕',
            content: 'Acá podés anotar ideas de postres nuevos, pedidos especiales con detalles únicos, listas de compras o recordatorios para la semana.',
            category: 'General',
            completed: false,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Ideas para probar este fin de semana',
            content: '• Probar relleno de mousse de pistacho con chocolate blanco\n• Diseñar vasitos individuales de marquise de chocolate',
            category: 'Ideas',
            completed: false,
            created_at: new Date().toISOString()
          }
        ]
        setNotes(initialNotes)
      } catch (err) {
        console.error('Error cargando notas:', err)
      } finally {
        setLoading(false)
      }
    }

    loadNotes()
  }, [])

  // Persist notes helper
  const persistNotes = async (newNotes: SolNote[]) => {
    setNotes(newNotes)
    const json = JSON.stringify(newNotes)
    try {
      localStorage.setItem(STORAGE_KEY, json)
      await saveSetting(SETTING_KEY, json)
    } catch (e) {
      console.error('Error guardando notas:', e)
    }
  }

  // Handle Save (Create or Update)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteTitle.trim() && !noteContent.trim()) {
      showToast('⚠️ Ingresá un título o contenido para la nota')
      return
    }

    const title = noteTitle.trim() || 'Nota sin título'
    const content = noteContent.trim()

    if (editingNoteId) {
      const updated = notes.map(n =>
        n.id === editingNoteId
          ? { ...n, title, content, category: noteCategory }
          : n
      )
      await persistNotes(updated)
      showToast('✓ Nota actualizada')
    } else {
      const newNote: SolNote = {
        id: Date.now().toString(),
        title,
        content,
        category: noteCategory,
        completed: false,
        created_at: new Date().toISOString()
      }
      await persistNotes([newNote, ...notes])
      showToast('✨ Nota guardada')
    }

    // Reset modal
    setIsModalOpen(false)
    setEditingNoteId(null)
    setNoteTitle('')
    setNoteContent('')
    setNoteCategory('General')
  }

  // Open modal for editing
  const handleOpenEdit = (note: SolNote) => {
    setEditingNoteId(note.id)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteCategory(note.category)
    setIsModalOpen(true)
  }

  // Toggle Note Completion
  const handleToggleComplete = async (id: string) => {
    const updated = notes.map(n =>
      n.id === id ? { ...n, completed: !n.completed } : n
    )
    await persistNotes(updated)
  }

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    await persistNotes(updated)
    showToast('✓ Nota eliminada')
  }

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesCat = selectedCategory === 'Todas' || n.category === selectedCategory
      if (!matchesCat) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      }
      return true
    })
  }, [notes, selectedCategory, searchQuery])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-pink-200/60 bg-white/70 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-2xl bg-pink-100 text-pink-600">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="font-playfair text-xl sm:text-2xl font-black text-slate-800">
              Bloc de Notas & Ideas
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Tus recordatorios, listas de compras, recetas por probar y detalles de encargos siempre a mano.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingNoteId(null)
            setNoteTitle('')
            setNoteContent('')
            setNoteCategory('General')
            setIsModalOpen(true)
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nueva Nota</span>
        </button>
      </div>

      {/* Categories & Search Filter Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-pink-200/50 bg-white/80 space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={`py-1.5 px-3.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'Todas'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-pink-50/60 text-slate-600 hover:bg-pink-100/70 border border-pink-200/40'
            }`}
          >
            Todas ({notes.length})
          </button>

          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const count = notes.filter(n => n.category === cat.id).length
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-1.5 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-pink-50 border border-pink-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : cat.color}`} />
                <span>{cat.label} ({count})</span>
              </button>
            )
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar en tus notas o recordatorios..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full glass-input rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-800 bg-white border-pink-200"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-3" />
          <p>Cargando tus notas...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-pink-200/50 bg-white/70 space-y-3">
          <Sparkles className="w-10 h-10 text-pink-300 mx-auto" />
          <h3 className="font-playfair text-lg font-bold text-slate-700">No hay notas en esta categoría</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hacé clic en "+ Nueva Nota" para anotar cualquier idea, receta o encargo para no olvidarte de nada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => {
            const catConfig = CATEGORIES.find(c => c.id === note.category) || CATEGORIES[4]
            const CatIcon = catConfig.icon

            return (
              <div
                key={note.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between bg-white shadow-sm hover:shadow-md ${
                  note.completed ? 'opacity-65 border-slate-200 bg-slate-50/50' : 'border-pink-200/80 hover:border-pink-300'
                }`}
              >
                <div>
                  {/* Card Header: Category badge + Complete Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${catConfig.bg}`}>
                      <CatIcon className={`w-3 h-3 ${catConfig.color}`} />
                      <span className="text-slate-700">{catConfig.label}</span>
                    </span>

                    <button
                      onClick={() => handleToggleComplete(note.id)}
                      className={`p-1 rounded-xl transition-colors ${
                        note.completed ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={note.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                    >
                      {note.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Title & Content */}
                  <h3 className={`font-bold text-sm text-slate-900 mb-1.5 ${note.completed ? 'line-through text-slate-400' : ''}`}>
                    {note.title}
                  </h3>

                  <p className={`text-xs text-slate-600 whitespace-pre-wrap leading-relaxed ${note.completed ? 'line-through text-slate-400' : ''}`}>
                    {note.content}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(note.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(note)}
                      className="p-1.5 rounded-xl hover:bg-pink-50 text-slate-400 hover:text-pink-600 transition-colors"
                      title="Editar nota"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Eliminar nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Create or Edit Note */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-lg w-full border border-pink-300 bg-white shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-500" />
                <h3 className="font-playfair text-lg font-bold text-slate-900">
                  {editingNoteId ? 'Editar Nota' : 'Nueva Nota'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Nota</label>
                <input
                  type="text"
                  placeholder="Ej: Encargo Torta Boda, Lista Makro..."
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border-pink-200"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNoteCategory(cat.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        noteCategory === cat.id
                          ? 'bg-pink-500 text-white border-pink-400 shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-pink-50 border-pink-200'
                      }`}
                    >
                      <cat.icon className={`w-3.5 h-3.5 ${noteCategory === cat.id ? 'text-white' : cat.color}`} />
                      <span className="truncate">{cat.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contenido / Detalles</label>
                <textarea
                  rows={5}
                  placeholder="Escribí acá lo que quieras recordar, ingredientes a comprar, ideas de decoración..."
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 bg-white border-pink-200 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-pink-500/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Nota</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
