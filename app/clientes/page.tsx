import { MainDashboard } from '@/components/MainDashboard'

export const metadata = {
  title: 'CRM & Clientes | Dulces Mía Pastelería',
  description: 'Gestión de fichas de clientes, historial de compras, cumpleaños y preferencias alimentarias.'
}

export default function ClientesPage() {
  return <MainDashboard initialTab="clientes" />
}
