import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore, useToastStore } from '@/store'
import { analyzePhoto } from '@/lib/ai'
import { compressImage, createThumbnail, fileToBase64, formatDate, PHOTO_TAGS } from '@/lib/utils'
import { Camera, Upload, Sparkles, Tag, Download, X, ZoomIn, MapPin } from 'lucide-react'

type Photo = {
  id: string; url: string; thumbnail_url: string | null; caption: string | null
  tags: string[]; taken_at: string; lat: number | null; lng: number | null
  ai_description: string | null; project_id: string
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>(DEMO_PHOTOS)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAppStore()
  const { addToast } = useToastStore()

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file)
        const thumb = await createThumbnail(file)
        const fileName = `${user?.id || 'demo'}/${Date.now()}-${file.name}`

        const [{ data: imgData }, { data: thumbData }] = await Promise.all([
          supabase.storage.from('photos').upload(fileName, compressed),
          supabase.storage.from('photos').upload(`thumb-${fileName}`, thumb)
        ])

        const url = supabase.storage.from('photos').getPublicUrl(fileName).data.publicUrl
        const thumbUrl = thumbData ? supabase.storage.from('photos').getPublicUrl(`thumb-${fileName}`).data.publicUrl : null

        // Get location
        let lat: number | null = null, lng: number | null = null
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
          )
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch {}

        const { data: photo } = await supabase.from('photos').insert({
          project_id: 'demo',
          user_id: user!.id,
          url,
          thumbnail_url: thumbUrl,
          tags: [],
          lat, lng,
          taken_at: new Date().toISOString()
        }).select().single()

        if (photo) {
          setPhotos((prev) => [photo as Photo, ...prev])
          addToast('Foto subida', 'success')

          // Auto-analyze with AI
          setAnalyzing(photo.id)
          try {
            const b64 = await fileToBase64(file)
            const result = await analyzePhoto(b64, file.type as 'image/jpeg')
            await supabase.from('photos').update({
              ai_description: result.description,
              tags: result.tags || [],
              caption: result.description
            }).eq('id', photo.id)
            setPhotos((prev) => prev.map((p) =>
              p.id === photo.id ? { ...p, ai_description: result.description, tags: result.tags || [] } : p
            ))
            addToast('Foto analizada con IA', 'success')
          } catch {
            addToast('Foto subida (sin análisis IA)', 'info')
          } finally {
            setAnalyzing(null)
          }
        }
      }
    } catch {
      // Demo mode: add fake photo
      const url = URL.createObjectURL(files[0])
      const newPhoto: Photo = {
        id: Math.random().toString(36).slice(2),
        url, thumbnail_url: url, caption: null, tags: [],
        taken_at: new Date().toISOString(), lat: null, lng: null,
        ai_description: null, project_id: 'demo'
      }
      setPhotos((prev) => [newPhoto, ...prev])
      addToast('Foto agregada (modo demo)', 'info')
    } finally {
      setUploading(false)
    }
  }

  const filtered = selectedTag
    ? photos.filter((p) => p.tags.includes(selectedTag))
    : photos

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fotos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{photos.length} fotos documentadas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => cameraInputRef.current?.click()} className="btn-ghost">
            <Camera className="w-4 h-4" /> Cámara
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary" disabled={uploading}>
            {uploading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Upload className="w-4 h-4" /> Subir fotos</>
            }
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)} />

      {/* Tag filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-3 py-1.5 text-sm rounded-full border flex-shrink-0 transition-colors ${
            !selectedTag ? 'bg-brand-400 text-white border-brand-400' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >Todas</button>
        {PHOTO_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`px-3 py-1.5 text-sm rounded-full border flex-shrink-0 transition-colors ${
              selectedTag === tag ? 'bg-brand-400 text-white border-brand-400' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >{tag}</button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {filtered.map((photo) => (
          <div
            key={photo.id}
            className="photo-thumb aspect-square relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => setLightbox(photo)}
          >
            {photo.thumbnail_url || photo.url
              ? <img src={photo.thumbnail_url || photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Camera className="w-8 h-8 text-gray-300" /></div>
            }
            {analyzing === photo.id && (
              <div className="absolute inset-0 bg-brand-400/80 flex flex-col items-center justify-center gap-1">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
                <span className="text-xs text-white">Analizando...</span>
              </div>
            )}
            <div className="photo-overlay absolute inset-0 bg-black/40 opacity-0 flex flex-col justify-between p-2">
              <div className="flex flex-wrap gap-1">
                {photo.tags.slice(0, 2).map((t) => (
                  <span key={t} className="text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/80">{formatDate(photo.taken_at)}</span>
                <ZoomIn className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Camera className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No hay fotos. ¡Captura la primera!</p>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt="" className="w-full max-h-[70vh] object-contain rounded-lg" />
            <div className="mt-3 text-white">
              {lightbox.ai_description && (
                <div className="flex items-start gap-2 bg-white/10 rounded-lg p-3 mb-3">
                  <Sparkles className="w-4 h-4 text-brand-200 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-white/90">{lightbox.ai_description}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-white/60">
                {lightbox.tags.length > 0 && (
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{lightbox.tags.join(', ')}</span>
                )}
                {lightbox.lat && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lightbox.lat.toFixed(4)}, {lightbox.lng?.toFixed(4)}</span>
                )}
                <span>{formatDate(lightbox.taken_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DEMO_PHOTOS: Photo[] = Array.from({ length: 12 }, (_, i) => ({
  id: `demo-${i}`,
  url: `https://picsum.photos/seed/${i + 10}/600/600`,
  thumbnail_url: `https://picsum.photos/seed/${i + 10}/300/300`,
  caption: null,
  tags: [PHOTO_TAGS[i % PHOTO_TAGS.length]],
  taken_at: new Date(Date.now() - 86400000 * (i + 1)).toISOString(),
  lat: null, lng: null, ai_description: null, project_id: 'demo'
}))
