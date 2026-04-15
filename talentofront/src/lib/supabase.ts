import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
const TIPOS_VIDEO  = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_IMAGEN   = 5 * 1024 * 1024   // 5 MB
const MAX_VIDEO    = 50 * 1024 * 1024  // 50 MB

export type ResultadoSubida = {
  url: string
  tipo: 'IMAGEN' | 'VIDEO'
}

/**
 * Valida el archivo, lo sube al bucket 'posts-media' y devuelve la URL pública.
 * Llama a onSubiendo(true/false) al inicio y al final para controlar el estado de carga.
 */
export async function subirMedia(
  archivo: File,
  autorTipo: string,
  usuarioId: number,
  onSubiendo: (estado: boolean) => void
): Promise<ResultadoSubida> {
  const esImagen = TIPOS_IMAGEN.includes(archivo.type)
  const esVideo  = TIPOS_VIDEO.includes(archivo.type)

  if (!esImagen && !esVideo) {
    throw new Error('Tipo no permitido. Usa JPG, PNG, WebP, MP4, MOV o WebM.')
  }

  const maxBytes = esImagen ? MAX_IMAGEN : MAX_VIDEO
  if (archivo.size > maxBytes) {
    throw new Error(`El archivo supera el límite de ${esImagen ? '5' : '50'} MB.`)
  }

  const tipo: 'IMAGEN' | 'VIDEO' = esImagen ? 'IMAGEN' : 'VIDEO'
  const nombreSanitizado = archivo.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const ruta = `${autorTipo}/${usuarioId}/${Date.now()}-${nombreSanitizado}`

  onSubiendo(true)
  const { error } = await supabase.storage
    .from('posts-media')
    .upload(ruta, archivo, { upsert: false })
  onSubiendo(false)

  if (error) throw new Error(`Error al subir: ${error.message}`)

  const { data } = supabase.storage.from('posts-media').getPublicUrl(ruta)
  return { url: data.publicUrl, tipo }
}
