import { useEffect } from 'react'

/** Título de la pestaña para cada pantalla de la app: "<título> · Bolsillo". */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Bolsillo`
  }, [title])
}
