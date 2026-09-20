'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LogoHeader } from '@/components/LogoHeader'
import { SidebarNav } from '@/components/SidebarNav'
import { PinScreen } from '@/components/PinScreen'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { SpeedDialFAB } from '@/components/ui/SpeedDialFAB'
import { VentasTab } from '@/components/tabs/VentasTab'
import { PedidosTab } from '@/components/tabs/PedidosTab'
import { ComercialTab } from '@/components/tabs/ComercialTab'
import { GastosTab } from '@/components/tabs/GastosTab'
import { CatalogoTab } from '@/components/tabs/CatalogoTab'
import { RecetasTab } from '@/components/tabs/RecetasTab'
import { InsumosTab } from '@/components/tabs/InsumosTab'
import { ClientesTab } from '@/components/tabs/ClientesTab'
import { ResumenTab } from '@/components/tabs/ResumenTab'
import { VoiceAssistantModal } from '@/components/ui/VoiceAssistantModal'
import { CommandPaletteModal } from '@/components/ui/CommandPaletteModal'
import { UniversalScannerModal } from '@/components/ui/UniversalScannerModal'
import { Product, Sale, Expense, Order, Recipe, IngredientMaster, InsumoHistoryItem, ActiveTab, Customer } from '@/lib/types'
import {
  fetchProducts, saveProduct, deleteProduct,
  fetchSales, recordSale, updateSalePaid, deleteSale,
  fetchExpenses, recordExpense, deleteExpense,
  fetchOrders, saveOrder, deleteOrder,
  fetchRecipes, saveRecipe, deleteRecipe,
  fetchMasterIngredients, saveMasterIngredient, recordInsumoPurchase, deleteMasterIngredient, deductRecipeStock,
  fetchCustomers, saveCustomer, deleteCustomer,
  fetchSetting, saveSetting, isSupabaseConfigured
} from '@/lib/supabase'
import { CheckCircle, Mic, Sparkles } from 'lucide-react'

const AUTH_KEY = 'dulcesmia_auth_session'

export function MainDashboard({ initialTab = 'pedidos' }: { initialTab?: ActiveTab }) {
  const [authed, setAuthed] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab)
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ingredients, setIngredients] = useState<IngredientMaster[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [goal, setGoal] = useState<number>(300000)
  const [notes, setNotes] = useState<string>('')
  const [toastMsg, setToastMsg] = useState<string>('')
  const [loadingData, setLoadingData] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isUniversalScannerOpen, setIsUniversalScannerOpen] = useState(false)

  // Toast notification trigger
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg('')
    }, 2500)
  }, [])

  // Check auth session
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_KEY)
      if (savedAuth === 'true') {
        setAuthed(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingAuth(false)
    }
  }, [])

  const handleAuthenticate = () => {
    try {
      localStorage.setItem(AUTH_KEY, 'true')
    } catch (e) {}
    setAuthed(true)
    showToast('🔓 Sesión iniciada con éxito!')
  }

  const handleLockSession = () => {
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch (e) {}
    setAuthed(false)
    showToast('🔒 Sesión bloqueada')
  }

  const isFirstLoadRef = useRef(true)

  // Load all app data from Supabase / LocalStorage
  const loadAllData = useCallback(async () => {
    if (isFirstLoadRef.current) {
      setLoadingData(true)
    }
    try {
      const [prodsData, salesData, expData, ordData, recData, ingData, custData, goalStr, notesStr] = await Promise.all([
        fetchProducts(),
        fetchSales(),
        fetchExpenses(),
        fetchOrders(),
        fetchRecipes(),
        fetchMasterIngredients(),
        fetchCustomers(),
        fetchSetting('monthly_goal', '300000'),
        fetchSetting('general_notes', '')
      ])

      setProducts(prodsData)
      setSales(salesData)
      setExpenses(expData)
      setOrders(ordData)
      setRecipes(recData)
      setIngredients(ingData)
      setCustomers(custData)

      if (goalStr) {
        const parsedG = parseFloat(goalStr)
        if (!isNaN(parsedG)) setGoal(parsedG)
      }
      if (notesStr) {
        setNotes(notesStr)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoadingData(false)
      isFirstLoadRef.current = false
    }
  }, [])

  useEffect(() => {
    if (authed) {
      loadAllData()
    }
  }, [authed, loadAllData])

  // Confirmation modal state for safe non-alert deletions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title?: string
    message: string
    onConfirm: () => Promise<void> | void
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  })

  const requestConfirm = (title: string, message: string, onConfirmAction: () => Promise<void> | void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        await onConfirmAction()
      }
    })
  }

  // Handlers for Customers CRM
  const handleSaveCustomer = async (customerData: Omit<Customer, 'id'> & { id?: string }) => {
    const saved = await saveCustomer(customerData)
    const custData = await fetchCustomers()
    setCustomers(custData)
    showToast('✨ Cliente guardado en el CRM!')
    return saved
  }

  const handleDeleteCustomer = async (id: string) => {
    requestConfirm('¿Eliminar cliente?', '¿Seguro que querés eliminar este cliente del CRM?', async () => {
      await deleteCustomer(id)
      await loadAllData()
      showToast('✓ Cliente eliminado')
    })
  }

  // Handlers for Products
  const handleSaveProduct = async (productData: Omit<Product, 'id'> & { id?: string }) => {
    await saveProduct(productData)
    await loadAllData()
  }

  const handleDeleteProduct = async (id: string) => {
    requestConfirm('¿Eliminar producto?', '¿Seguro que querés eliminar este producto del catálogo?', async () => {
      await deleteProduct(id)
      await loadAllData()
      showToast('✓ Producto eliminado')
    })
  }

  // Handlers for Sales
  const handleRecordSale = async (saleData: Omit<Sale, 'id'>) => {
    await recordSale(saleData)
    
    // Auto-deduct ingredient stock if recipe linked
    if (saleData.product_name) {
      const product = products.find(p => p.id === saleData.product_id || p.name.toLowerCase() === saleData.product_name.toLowerCase())
      const recipe = recipes.find(r => r.id === product?.recipe_id || r.title.toLowerCase() === saleData.product_name.toLowerCase())
      if (recipe && recipe.id) {
        const updated = await deductRecipeStock(recipe.id, saleData.quantity || 1, recipes, ingredients)
        setIngredients(updated)
      }
    }

    await loadAllData()
  }

  const handleToggleSalePaid = async (id: string, paid: boolean, paid_at?: string) => {
    await updateSalePaid(id, paid, paid_at)
    await loadAllData()
    showToast(paid ? '✓ Venta marcada como COBRADA' : '📌 Venta marcada como PENDIENTE')
  }

  const handleDeleteSale = async (id: string) => {
    requestConfirm('¿Eliminar venta?', '¿Seguro que querés eliminar esta venta del registro?', async () => {
      await deleteSale(id)
      await loadAllData()
      showToast('✓ Venta eliminada')
    })
  }

  // Handlers for Expenses
  const handleRecordExpense = async (expenseData: Omit<Expense, 'id'>) => {
    await recordExpense(expenseData)
    await loadAllData()
  }

  const handleDeleteExpense = async (id: string) => {
    requestConfirm('¿Eliminar gasto?', '¿Seguro que querés eliminar este gasto?', async () => {
      await deleteExpense(id)
      await loadAllData()
      showToast('✓ Gasto eliminado')
    })
  }

  // Handlers for Orders
  const handleSaveOrder = async (orderData: Omit<Order, 'id'> & { id?: string }) => {
    await saveOrder(orderData)
    await loadAllData()
  }

  const handleDeleteOrder = async (id: string) => {
    requestConfirm('¿Eliminar pedido?', '¿Seguro que querés eliminar este pedido?', async () => {
      await deleteOrder(id)
      await loadAllData()
      showToast('✓ Pedido eliminado')
    })
  }

  // Handlers for Recipes
  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'> & { id?: string }) => {
    await saveRecipe(recipeData)
    await loadAllData()
  }

  const handleDeleteRecipe = async (id: string) => {
    requestConfirm('¿Eliminar receta?', '¿Seguro que querés eliminar esta receta?', async () => {
      await deleteRecipe(id)
      await loadAllData()
      showToast('✓ Receta eliminada')
    })
  }

  // Handlers for Ingredients / Insumos
  const handleSaveIngredient = async (ingredientData: Omit<IngredientMaster, 'id'> & { id?: string }) => {
    await saveMasterIngredient(ingredientData)
    await loadAllData()
  }

  const handleRecordPurchase = async (insumoId: string, purchaseData: Omit<InsumoHistoryItem, 'id'>) => {
    await recordInsumoPurchase(insumoId, purchaseData)
    await loadAllData()
  }

  const handleDeleteIngredient = async (id: string) => {
    requestConfirm('¿Eliminar insumo?', '¿Seguro que querés eliminar este insumo?', async () => {
      await deleteMasterIngredient(id)
      await loadAllData()
      showToast('✓ Insumo eliminado')
    })
  }

  // Handlers for Settings
  const handleSaveGoal = async (newGoal: number) => {
    setGoal(newGoal)
    await saveSetting('monthly_goal', newGoal.toString())
    showToast('✓ Meta mensual actualizada!')
  }

  const handleSaveNotes = async (newNotes: string) => {
    setNotes(newNotes)
    await saveSetting('general_notes', newNotes)
    showToast('✓ Notas guardadas')
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-pink-50/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    )
  }

  if (!authed) {
    return <PinScreen onSuccess={handleAuthenticate} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50/60 to-amber-50/40 text-slate-800 font-sans selection:bg-pink-500 selection:text-white pb-24 lg:pb-8 flex">
      {/* Collapsible SaaS Sidebar Navigation */}
      <SidebarNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLock={handleLockSession}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        isSynced={isSupabaseConfigured()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <LogoHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLock={handleLockSession}
          isOnline={isSupabaseConfigured()}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl w-full mx-auto px-4 pt-6 flex-1">
          {loadingData && products.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-3" />
              <p>Sincronizando datos con Supabase...</p>
            </div>
          ) : (
            <>
              {activeTab === 'pedidos' && (
                <ComercialTab
                  products={products}
                  sales={sales}
                  orders={orders}
                  customers={customers}
                  recipes={recipes}
                  ingredients={ingredients}
                  initialMode="pedidos"
                  onRecordSale={handleRecordSale}
                  onToggleSalePaid={handleToggleSalePaid}
                  onDeleteSale={handleDeleteSale}
                  onSaveOrder={handleSaveOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onSaveCustomer={handleSaveCustomer}
                  showToast={showToast}
                />
              )}
              {activeTab === 'ventas' && (
                <ComercialTab
                  products={products}
                  sales={sales}
                  orders={orders}
                  customers={customers}
                  recipes={recipes}
                  ingredients={ingredients}
                  initialMode="ventas"
                  onRecordSale={handleRecordSale}
                  onToggleSalePaid={handleToggleSalePaid}
                  onDeleteSale={handleDeleteSale}
                  onSaveOrder={handleSaveOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onSaveCustomer={handleSaveCustomer}
                  showToast={showToast}
                />
              )}
              {activeTab === 'gastos' && (
                <GastosTab
                  expenses={expenses}
                  products={products}
                  ingredients={ingredients}
                  onRecordExpense={handleRecordExpense}
                  onDeleteExpense={handleDeleteExpense}
                  showToast={showToast}
                />
              )}
              {activeTab === 'insumos' && (
                <InsumosTab
                  ingredients={ingredients}
                  onSaveIngredient={handleSaveIngredient}
                  onRecordPurchase={handleRecordPurchase}
                  onDeleteIngredient={handleDeleteIngredient}
                  showToast={showToast}
                />
              )}
              {activeTab === 'clientes' && (
                <ClientesTab
                  customers={customers}
                  orders={orders}
                  sales={sales}
                  onSaveCustomer={handleSaveCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  showToast={showToast}
                />
              )}
              {activeTab === 'catalogo' && (
                <CatalogoTab
                  products={products}
                  recipes={recipes}
                  ingredients={ingredients}
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                  showToast={showToast}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}
              {activeTab === 'recetas' && (
                <RecetasTab
                  recipes={recipes}
                  ingredients={ingredients}
                  products={products}
                  onSaveRecipe={handleSaveRecipe}
                  onDeleteRecipe={handleDeleteRecipe}
                  showToast={showToast}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}
              {activeTab === 'resumen' && (
                <ResumenTab
                  sales={sales}
                  expenses={expenses}
                  products={products}
                  recipes={recipes}
                  orders={orders}
                  customers={customers}
                  ingredients={ingredients}
                  goal={goal}
                  notes={notes}
                  onSaveGoal={handleSaveGoal}
                  onSaveNotes={handleSaveNotes}
                  onSaveCustomer={handleSaveCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global SpeedDial Floating Action Button */}
      <SpeedDialFAB
        onOpenNewOrder={() => setActiveTab('pedidos')}
        onOpenNewSale={() => setActiveTab('ventas')}
        onOpenNewExpense={() => setActiveTab('gastos')}
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
        onOpenUniversalScanner={() => setIsUniversalScannerOpen(true)}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onExecuteActions={async (res) => {
          for (const act of res.actions) {
            if (act.type === 'RECORD_EXPENSE') {
              await handleRecordExpense({
                description: act.data.description || 'Gasto por voz',
                amount: act.data.amount || 1000,
                type: act.data.expense_type || 'Variable',
                date: new Date().toISOString()
              })
            } else if (act.type === 'ADD_ORDER') {
              const p = products.find(prod => prod.name.toLowerCase().includes((act.data.product_name || '').toLowerCase()))
              await handleSaveOrder({
                customer_name: act.data.customer_name || 'Cliente (Dictado por Voz)',
                product_id: p?.id,
                product_name: act.data.product_name || p?.name || 'Postre Variado',
                quantity: act.data.quantity || 1,
                total_price: act.data.price || ((p?.price || 4500) * (act.data.quantity || 1)),
                status: 'Pendiente'
              })
            } else if (act.type === 'RECORD_SALE') {
              const p = products.find(prod => prod.name.toLowerCase().includes((act.data.product_name || '').toLowerCase()))
              const price = act.data.price || p?.price || 4500
              const cost = p?.cost || price * 0.4
              await handleRecordSale({
                product_id: p?.id,
                product_name: act.data.product_name || p?.name || 'Postre Vendido',
                quantity: act.data.quantity || 1,
                revenue: price * (act.data.quantity || 1),
                cost: cost * (act.data.quantity || 1),
                profit: (price - cost) * (act.data.quantity || 1),
                paid: true,
                date: new Date().toISOString()
              })
            } else if (act.type === 'ADD_INGREDIENT') {
              await handleSaveIngredient({
                name: act.data.ingredient_name || 'Insumo Dictado',
                unit: 'gr',
                package_size: act.data.quantity || 1000,
                package_cost: act.data.amount || 1500,
                stock_qty: act.data.quantity || 1000
              })
            } else if (act.type === 'DELIVER_TO_FAMILY_STORE') {
              const p = products.find(prod => prod.name.toLowerCase().includes((act.data.product_name || '').toLowerCase()))
              await handleSaveOrder({
                customer_name: 'Local Familiar (Dictado por Voz)',
                product_id: p?.id,
                product_name: act.data.product_name || p?.name || 'Postre en Pote',
                quantity: act.data.quantity || 1,
                total_price: ((p?.price || 4500) * (act.data.quantity || 1)),
                status: 'En Local'
              })
            }
          }
        }}
        showToast={showToast}
      />

      {/* Toast Popup */}
      {toastMsg && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 animate-bounce-subtle">
          <div className="glass-panel-glow px-4 py-3 rounded-2xl border border-pink-300 flex items-center gap-2.5 text-xs font-bold text-slate-800 shadow-xl bg-white/95">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Global Universal Camera Scanner Modal */}
      <UniversalScannerModal
        isOpen={isUniversalScannerOpen}
        onClose={() => setIsUniversalScannerOpen(false)}
        onExecuteScan={async (res) => {
          if (res.type === 'RECEIPT' && res.receipt_data) {
            await handleRecordExpense({
              description: `Compra en ${res.receipt_data.merchant_name || 'Comercio'} (Escaneado)`,
              amount: res.receipt_data.total_amount || 0,
              type: 'Variable',
              date: new Date().toISOString()
            })
          } else if (res.type === 'PRODUCTION_BATCH' && res.batch_data) {
            for (const d of res.batch_data.desserts) {
              const p = products.find(prod => prod.name.toLowerCase().includes(d.product_name.toLowerCase()))
              await handleSaveOrder({
                customer_name: 'Local Familiar (Lote Escaneado)',
                product_id: p?.id,
                product_name: d.product_name || p?.name || 'Postre en Pote',
                quantity: d.count || 1,
                total_price: (p?.price || 4500) * (d.count || 1),
                status: 'En Local'
              })
            }
          } else if (res.type === 'ORDER_NOTE' && res.order_data) {
            const p = products.find(prod => prod.name.toLowerCase().includes((res.order_data?.product_name || '').toLowerCase()))
            await handleSaveOrder({
              customer_name: res.order_data.customer_name || 'Cliente Escaneado',
              product_id: p?.id,
              product_name: res.order_data.product_name || p?.name || 'Postre por Nota',
              quantity: res.order_data.quantity || 1,
              total_price: res.order_data.total_price || (p?.price || 4500),
              status: 'Pendiente',
              notes: res.order_data.notes
            })
          }
        }}
        showToast={showToast}
      />

      {/* Global Command Palette Quick Search Modal */}
      <CommandPaletteModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        setActiveTab={setActiveTab}
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
      />

      {/* Global Safe Delete Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
