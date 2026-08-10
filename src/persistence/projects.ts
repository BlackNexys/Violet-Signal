import { cloneComposition, type Composition } from '../model/composition'

const DATABASE_NAME = 'violet-signal'
const STORE_NAME = 'projects'
const DATABASE_VERSION = 1

export interface SavedProject {
  id: string
  name: string
  updatedAt: number
  composition: Composition
  automatic: boolean
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveProject(project: SavedProject): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put({ ...project, composition: cloneComposition(project.composition) })
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export async function listProjects(): Promise<SavedProject[]> {
  const database = await openDatabase()
  const projects = await new Promise<SavedProject[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result as SavedProject[])
    request.onerror = () => reject(request.error)
  })
  database.close()
  return projects.sort((left, right) => right.updatedAt - left.updatedAt)
}

export async function deleteProject(id: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}
