# 🍰 Dulces Mía — App de Control de Gestión & Postres Caseros

Sistema moderno y completo de gestión de productos, costos, ventas y ganancias para la repostería **Dulces Mía**.

![Dulces Mía Badge](public/badge-preview.png)

## 🌟 Características Principales

- 🔐 **Protección por PIN**: Acceso seguro a la aplicación mediante pantalla PIN interactiva. PIN predeterminado: **`4321`** (configurable en `.env.local`).
- 📦 **Catálogo de Productos**: Alta, baja, modificación y pausado de postres. Cálculo automático de costo por insumos, precio de venta y margen de ganancia individual.
- 💰 **Registro de Ventas**: Selección rápida con un click (+1, +2, +3, +5), cálculo instantáneo de costo base y ganancia neta, filtro por rango de fechas e historial completo.
- 📋 **Control de Gastos**: Registro categorizado en Insumos (materia prima) y Gastos Generales (packaging, luz, servicios).
- 📊 **Dashboard Ejecutivo & Metas**:
  - Resumen de Ingresos, Costos, Ganancia Neta, Margen % y Ticket Promedio.
  - Gráfico interactivo de tendencia de ventas (Recharts).
  - Barra de progreso interactiva hacia la meta mensual de ventas.
  - Bloc de notas integrado para recetas y pedidos pendientes.
  - Opción para imprimir / exportar reporte ejecutivo.
- ⚡ **Base de Datos Supabase**: Persistencia real de datos en PostgreSQL mediante cliente Supabase (con sincronización en la nube + fallback local offline).

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Estilos**: Tailwind CSS + Glassmorphism personalizado + Google Fonts (Playfair Display & Outfit)
- **Iconos & Gráficos**: Lucide React + Recharts
- **Efectos**: Canvas Confetti + Framer Motion

---

## 🚀 Instalación y Ejecución Local

1. Clonas o descargas el repositorio:
```bash
git clone https://github.com/tu-usuario/dulces-mia.git
cd dulces-mia
```

2. Instalas las dependencias:
```bash
npm install
```

3. Las variables de entorno ya están configuradas en `.env.local` con las claves de Supabase.

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

Abre `http://localhost:3000` en tu navegador.

---

## ☁️ Despliegue en Vercel

1. Subir este proyecto a un nuevo repositorio de GitHub (ej: `NicoStocchero/dulces-mia`).
2. En [Vercel](https://vercel.com/), seleccionar **"Add New Project"** e importar el repositorio.
3. Agregar las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ACCESS_PIN` (`4321`)
4. Hacer click en **Deploy**. ¡Listo! 🚀
