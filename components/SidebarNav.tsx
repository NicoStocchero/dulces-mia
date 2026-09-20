'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ActiveTab } from '@/lib/types'
import { Calendar, ShoppingBag, Receipt, Package, User, ChefHat, BarChart3, Store, ChevronLeft, ChevronRight, Cake, RefreshCw, Lock, Search, FileText } from 'lucide-react'

interface SidebarNavProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  onLock: () => void
  onOpenSearch?: () => void
  isSynced?: boolean
}

export function SidebarNav({ activeTab, setActiveTab, onLock, onOpenSearch, isSynced = true }: SidebarNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'pedidos', label: 'Ventas & Pedidos', icon: ShoppingBag, color: 'text-pink-500' },
    { id: 'gastos', label: 'Gastos', icon: Receipt, color: 'text-rose-500' },
    { id: 'insumos', label: 'Insumos & Costos', icon: Package, color: 'text-purple-500' },
    { id: 'notas', label: 'Bloc de Notas', icon: FileText, color: 'text-amber-500' },
    { id: 'clientes', label: 'CRM Clientes', icon: User, color: 'text-blue-500' },
    { id: 'catalogo', label: 'Catálogo Postres', icon: Store, color: 'text-amber-500' },
    { id: 'recetas', label: 'Libro de Recetas', icon: ChefHat, color: 'text-teal-500' },
    { id: 'resumen', label: 'Resumen Financiero', icon: BarChart3, color: 'text-indigo-500' }
  ]

  return (
    <aside
      className={`hidden lg:flex flex-col justify-between h-screen sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-r border-pink-200/60 shadow-sm transition-all duration-300 ${
        isCollapsed ? 'w-20 p-3' : 'w-64 p-5'
      }`}
    >
      <div>
        {/* Header Branding */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-pink-100">
          <Link href="/pedidos" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Cake className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="font-playfair text-lg font-bold text-slate-900 leading-tight">Dulces Mía</h1>
                <p className="text-[10px] font-bold text-pink-600 tracking-wider uppercase">SaaS Pastelería</p>
              </div>
            )}
          </Link>

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 transition-colors"
            title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Search Button */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className={`w-full mb-4 py-2.5 px-3 rounded-2xl bg-pink-50/70 hover:bg-pink-100/70 text-slate-600 border border-pink-200 text-xs font-semibold flex items-center justify-between transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Buscar función en la app (Cmd+K)"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-pink-500" />
              {!isCollapsed && <span>Buscar función...</span>}
            </span>
            {!isCollapsed && <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border">⌘K</span>}
          </button>
        )}

        {/* Navigation Items List */}
        <nav className="space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id || (item.id === 'pedidos' && activeTab === 'ventas')

            return (
              <Link
                key={item.id}
                href={`/${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25 border border-pink-400'
                    : 'text-slate-600 hover:bg-pink-50/80 hover:text-slate-900 border border-transparent'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />

                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}

                {/* Hover Tooltip when Collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Sync Status & Lock */}
      <div className="pt-4 border-t border-pink-100 space-y-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold ${
          isCollapsed ? 'justify-center px-0' : ''
        }`}>
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin-slow flex-shrink-0" />
          {!isCollapsed && <span>Supabase 100% Sync</span>}
        </div>

        <button
          onClick={onLock}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold transition-colors shadow-2xs ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Bloquear sesión"
        >
          <Lock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          {!isCollapsed && <span>Bloquear Sesión</span>}
        </button>
      </div>
    </aside>
  )
}
