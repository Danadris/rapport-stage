import { useState, useCallback, useRef } from 'react'

export function useHistory<T>(initial: T, maxSize = 50) {
  const [state, setState] = useState(initial)
  const [availability, setAvailability] = useState({ canUndo: false, canRedo: false })
  const past = useRef<T[]>([])
  const future = useRef<T[]>([])

  const set = useCallback((updater: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
      if (next === prev) return prev
      past.current = [...past.current.slice(-(maxSize - 1)), prev]
      future.current = []
      setAvailability({ canUndo: true, canRedo: false })
      return next
    })
  }, [maxSize])

  const undo = useCallback(() => {
    setState((prev) => {
      if (past.current.length === 0) return prev
      const previous = past.current[past.current.length - 1]
      past.current = past.current.slice(0, -1)
      future.current = [prev, ...future.current]
      setAvailability({ canUndo: past.current.length > 0, canRedo: true })
      return previous
    })
  }, [])

  const redo = useCallback(() => {
    setState((prev) => {
      if (future.current.length === 0) return prev
      const next = future.current[0]
      future.current = future.current.slice(1)
      past.current = [...past.current, prev]
      setAvailability({ canUndo: true, canRedo: future.current.length > 0 })
      return next
    })
  }, [])

  return { state, set, undo, redo, canUndo: availability.canUndo, canRedo: availability.canRedo }
}
