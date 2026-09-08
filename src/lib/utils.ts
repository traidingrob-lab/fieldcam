import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy', { locale: es })
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

export function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = ratio < 1 ? img.width * ratio : img.width
      canvas.height = ratio < 1 ? img.height * ratio : img.height
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

export function createThumbnail(file: File): Promise<Blob> {
  return compressImage(file, 400, 0.75)
}

export const PROJECT_TYPES = [
  'Techos e impermeabilización',
  'Plomería e instalaciones hidráulicas',
  'Electricidad',
  'Remodelación interior',
  'Pintura y acabados',
  'Construcción nueva',
  'Jardines y exteriores',
  'Aire acondicionado y climatización',
  'Pisos y azulejos',
  'Carpintería',
  'Otro'
]

export const PHOTO_TAGS = [
  'Fachada', 'Interior', 'Techo', 'Detalle', 'Avance',
  'Final', 'Problema', 'Material', 'Antes', 'Después'
]
