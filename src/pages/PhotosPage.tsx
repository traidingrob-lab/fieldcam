import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore, useToastStore } from '@/store'
import { analyzePhoto } from '@/lib/ai'
import { compressImage, createThumbnail, fileToBase64, formatDate, PHOTO_TAGS } from '@/lib/utils'
import { Camera, Upload, Sparkles, Tag, X, ZoomIn, MapPin, Trash2 } from 'lucide-react'

type Photo = {
  id: string; url: string; thumbnail_url: string | null; caption: string | null
  tags: string[]; taken_at: string; lat: number | null; lng: number | null
  ai_description: string | null; project_id: string
}

type ProjectOption = { id: string; name: string }

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAppStore()
  const { addToast } = useToastStore()

  useEffect(() => { loadProjects() }, [])

  useEffect(() => {
    if (selectedProjectId) loadPhotos()
    else setPhotos([])
  }, [selectedProjectId])

  async function loadProjects() {
    try {
      const { data, error } = await supabase.from('projects').select('id, name').order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
      if (data && data.length > 0) setSelectedProjectId(data[0].id)
    } catch {
      setProjects(DEMO_PROJECT_OPTIONS)
      setSelectedProjectId(DEMO_PROJECT_OPTIONS[0].id)
    }
  }

  async function loadPhotos() {
    setPhotosLoading(true)
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('taken_at', { ascending: false })
      if (error) throw error
      setPhotos(data || [])
    } catch (err: unknown) {
      setPhotos([])
      addToast((err as Error).message || 'Error al cargar fotos', 'error')
    } finally {
      setPhotosLoading(false)
    }
  }

  function extractStoragePath(publicUrl: string): string | null {
    const marker = '/photos/'
    const idx = publicUrl.indexOf(marker)
    return idx >= 0 ? publicUrl.slice(idx + marker.length) : null
  }

  async function handleDeletePhoto(photo: Photo) {
    if (!window.confirm('¿Eliminar esta foto?')) return
    try {
      const paths = [photo.url, photo.thumbnail_url]
        .filter((u): u is string => !!u)
        .map(extractStoragePath)
        .filter((p): p is string => !!p)
      if (paths.length > 0) {
        await supabase.storage.from('photos').remove(paths)
      }
      const { error } = await supabase.from('photos').delete().eq('id', photo.id)
      if (error) throw error
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      if (lightbox?.id === photo.id) setLightbox(null)
      addToast('Foto eliminada', 'info')
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al eliminar foto', 'error')
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!selectedProjectId) {
      addToast('Selecciona un proyecto antes de subir fotos', 'error')
      return
    }
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
          project_id: selectedProjectId,
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
    } catch (err: unknown) {
      addToast((err as Error).message || 'Error al subir la foto', 'error')
    } finally {
      setUploading(false)
    }
  }

  const filtered = selectedTag
    ? photos.filter((p) => p.tags.includes(selectedTag))
    : photos

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fotos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{photos.length} fotos documentadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="input w-auto min-w-40"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={projects.length === 0}
          >
            {projects.length === 0
              ? <option value="">Sin proyectos</option>
              : projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
            }
          </select>
          <button onClick={() => cameraInputRef.current?.click()} className="btn-ghost" disabled={!selectedProjectId}>
            <Camera className="w-4 h-4" /> Cámara
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary" disabled={uploading || !selectedProjectId}>
            {uploading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Upload className="w-4 h-4" /> Subir fotos</>
            }
          </button>
        </div>
      </div>

      {projects.length === 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Necesitas crear un proyecto antes de subir fotos. <Link to="/app/projects" className="underline font-medium">Crear proyecto</Link>
        </div>
      )}

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
      {photosLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square skeleton rounded-lg" />
          ))}
        </div>
      ) : (
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
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo) }}
                className="photo-overlay absolute top-1.5 right-1.5 p-1.5 bg-black/50 hover:bg-red-500 rounded-md opacity-0 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
              <div className="photo-overlay absolute inset-0 bg-black/40 opacity-0 flex flex-col justify-between p-2 pointer-events-none">
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
      )}

      {!photosLoading && filtered.length === 0 && (
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
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm text-white/60">
                  {lightbox.tags.length > 0 && (
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{lightbox.tags.join(', ')}</span>
                  )}
                  {lightbox.lat && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lightbox.lat.toFixed(4)}, {lightbox.lng?.toFixed(4)}</span>
                  )}
                  <span>{formatDate(lightbox.taken_at)}</span>
                </div>
                <button
                  onClick={() => handleDeletePhoto(lightbox)}
                  className="btn-ghost text-red-400 border-white/20 hover:bg-white/10 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DEMO_PROJECT_OPTIONS: ProjectOption[] = [
  { id: '1', name: 'Remodelación López' },
  { id: '2', name: 'Techo Martínez' },
  { id: '3', name: 'Plomería Sánchez' },
  { id: '4', name: 'Eléctrico García' },
  { id: '5', name: 'Pintura Oficina Flores' }
]

