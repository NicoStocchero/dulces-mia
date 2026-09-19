'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ActiveTab } from '@/lib/types'
import {
  Lock, ShoppingBag, Calendar, Receipt, BookOpen, ChefHat, BarChart3, Menu, X, ChevronRight, Package, User
} from 'lucide-react'

interface HeaderProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  onLock: () => void
  isOnline?: boolean
}

export function LogoHeader({ activeTab, setActiveTab, onLock, isOnline = true }: HeaderProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  // Primary mobile tabs (Pedidos FIRST before Ventas)
  const primaryTabs = [
    { id: 'pedidos' as ActiveTab, label: 'Pedidos', icon: Calendar },
    { id: 'ventas' as ActiveTab, label: 'Ventas', icon: ShoppingBag },
    { id: 'gastos' as ActiveTab, label: 'Gastos', icon: Receipt },
  ]

  // Secondary options inside "Más"
  const secondaryTabs = [
    { id: 'insumos' as ActiveTab, label: 'Insumos & Costos', desc: 'Precios, $/g e histórico de compras', icon: Package },
    { id: 'clientes' as ActiveTab, label: 'CRM & Clientes', desc: 'Fichas, cumpleaños e historial de compras', icon: User },
    { id: 'catalogo' as ActiveTab, label: 'Catálogo de Postres', desc: 'Gestionar precios y productos', icon: BookOpen },
    { id: 'recetas' as ActiveTab, label: 'Libro de Recetas', desc: 'Ingredientes y paso a paso', icon: ChefHat },
    { id: 'resumen' as ActiveTab, label: 'Resumen & Metas', desc: 'Estadísticas y objetivos', icon: BarChart3 },
  ]

  // Desktop header tabs (Pedidos FIRST)
  const desktopTabs = [
    { id: 'pedidos' as ActiveTab, label: 'Pedidos', icon: Calendar },
    { id: 'ventas' as ActiveTab, label: 'Ventas', icon: ShoppingBag },
    { id: 'gastos' as ActiveTab, label: 'Gastos', icon: Receipt },
    { id: 'insumos' as ActiveTab, label: 'Insumos', icon: Package },
    { id: 'clientes' as ActiveTab, label: 'Clientes', icon: User },
    { id: 'catalogo' as ActiveTab, label: 'Catálogo', icon: BookOpen },
    { id: 'recetas' as ActiveTab, label: 'Recetas', icon: ChefHat },
    { id: 'resumen' as ActiveTab, label: 'Resumen', icon: BarChart3 },
  ]

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab)
    setIsMoreMenuOpen(false)
  }

  const isMoreActive = secondaryTabs.some(t => t.id === activeTab)

  return (
    <>
      {/* Mobile Fixed 4-Item Bottom Navigation Bar (Pedidos first) */}
      <nav aria-label="Navegación principal" className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-pink-200/80 shadow-[0_-4px_20px_rgba(244,114,182,0.15)] px-3 py-2">
        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          {primaryTabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Link
                key={tab.id}
                href={`/${tab.id}`}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-md shadow-pink-500/20'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-pink-50/50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-white' : 'text-pink-500'}`} />
                <span className="text-[11px] font-semibold leading-none">
                  {tab.label}
                </span>
              </Link>
            )
          })}

          {/* 4th Tab: "Más" */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2 rounded-2xl transition-all duration-200 ${
              isMoreActive
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-md shadow-pink-500/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-pink-50/50'
            }`}
          >
            <Menu className={`w-5 h-5 mb-0.5 ${isMoreActive ? 'text-white' : 'text-pink-500'}`} />
            <span className="text-[11px] font-semibold leading-none">
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* "Más" Bottom Sheet Modal for Secondary Actions */}
      {isMoreMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end justify-center animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 border-t border-pink-200 shadow-2xl space-y-4 animate-slide-up">
            
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-100 text-pink-600">
                  <Menu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-playfair text-lg font-bold text-slate-800">Menú Dulces Mía</h3>
                  <p className="text-xs text-slate-500">Herramientas y configuración</p>
                </div>
              </div>

              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-2 rounded-full hover:bg-pink-50 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Options List */}
            <div className="space-y-2">
              {secondaryTabs.map(st => {
                const Icon = st.icon
                const isActive = activeTab === st.id
                return (
                  <Link
                    key={st.id}
                    href={`/${st.id}`}
                    onClick={() => handleSelectTab(st.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-pink-500 text-white border-pink-400 shadow-md font-bold'
                        : 'bg-white hover:bg-pink-50/70 border-pink-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-600'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight">{st.label}</p>
                        <p className={`text-xs ${isActive ? 'text-pink-100' : 'text-slate-500'}`}>{st.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  </Link>
                )
              })}
            </div>

            {/* Lock Session Option inside sheet */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false)
                  onLock()
                }}
                className="w-full p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center justify-center gap-2 transition-colors"
              >
                <Lock className="w-4 h-4 text-rose-600" />
                <span>Bloquear Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
