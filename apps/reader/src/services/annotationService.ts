import axios from 'axios'

import { Annotation, AnnotationColor, AnnotationType } from '../annotation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface RemoteAnnotation {
  id: string
  bookId: number
  cfi: string
  text: string
  notes?: string | null
  type: string
  color: string
  spineIndex: number
  spineTitle: string
  createdAt: string
  updatedAt: string
}

// Convert remote annotation to local format
export function remoteToLocal(remote: RemoteAnnotation): Annotation {
  return {
    id: remote.id,
    bookId: String(remote.bookId),
    cfi: remote.cfi,
    text: remote.text,
    notes: remote.notes || undefined,
    type: remote.type as AnnotationType,
    color: remote.color as AnnotationColor,
    spine: {
      index: remote.spineIndex,
      title: remote.spineTitle,
    },
    createAt: new Date(remote.createdAt).getTime(),
    updatedAt: new Date(remote.updatedAt).getTime(),
  }
}

// Convert local annotation to remote format
export function localToRemote(local: Annotation, bookId: number) {
  return {
    bookId,
    cfi: local.cfi,
    text: local.text,
    notes: local.notes || null,
    type: local.type,
    color: local.color,
    spineIndex: local.spine.index,
    spineTitle: local.spine.title,
  }
}

// Get all annotations for a book from the server
export async function fetchAnnotations(bookId: number): Promise<Annotation[]> {
  try {
    const res = await api.get(`/annotations/book/${bookId}`)
    return (res.data as RemoteAnnotation[]).map(remoteToLocal)
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return []
  }
}

// Save/update a single annotation to the server
export async function saveAnnotation(annotation: Annotation, bookId: number): Promise<RemoteAnnotation | null> {
  try {
    const data = localToRemote(annotation, bookId)
    const res = await api.post('/annotations', data)
    return res.data
  } catch (error) {
    console.error('Error saving annotation:', error)
    return null
  }
}

// Delete an annotation from the server
export async function deleteAnnotation(bookId: number, cfi: string): Promise<boolean> {
  try {
    await api.post('/annotations/delete-by-cfi', { bookId, cfi })
    return true
  } catch (error) {
    console.error('Error deleting annotation:', error)
    return false
  }
}

// Bulk sync annotations for a book
export async function syncAnnotationsToServer(
  bookId: number,
  annotations: Annotation[]
): Promise<{ success: boolean; annotations: Annotation[] }> {
  try {
    const res = await api.post('/annotations/sync', {
      bookId,
      annotations: annotations.map((a) => localToRemote(a, bookId)),
    })
    return {
      success: true,
      annotations: (res.data.annotations as RemoteAnnotation[]).map(remoteToLocal),
    }
  } catch (error) {
    console.error('Error syncing annotations:', error)
    return { success: false, annotations }
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('auth_token')
}
