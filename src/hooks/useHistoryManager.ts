import { useCallback, useRef, useState } from 'react'
import type { Rapport, SectionImage, RapportStyle } from '../types'
import { applyCommand, invertCommand, type Command } from '../lib/historyCommands'

const TEXT_COALESCE_MS = 600

export function useHistoryManager(initialRapport: Rapport | null) {
  const [rapport, setRapportState] = useState<Rapport | null>(initialRapport)
  const undoStack = useRef<Command[]>([])
  const redoStack = useRef<Command[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncFlags = useCallback(() => {
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(redoStack.current.length > 0)
  }, [])

  const setRapportDirect = useCallback((r: Rapport | null) => {
    setRapportState(r)
    undoStack.current = []
    redoStack.current = []
    syncFlags()
  }, [syncFlags])

  const execute = useCallback((cmd: Command) => {
    setRapportState((prev) => {
      if (!prev) return prev

      // Check if we can coalesce text edits
      if (cmd.type === 'UPDATE_TEXT' && undoStack.current.length > 0) {
        const lastCmd = undoStack.current[undoStack.current.length - 1]
        if (
          lastCmd.type === 'UPDATE_TEXT' &&
          lastCmd.target === cmd.target &&
          lastCmd.fieldKey === cmd.fieldKey &&
          lastCmd.subFieldKey === cmd.subFieldKey &&
          Date.now() - lastCmd.timestamp < TEXT_COALESCE_MS
        ) {
          // Coalesce: keep the original prevValue, update to newest nextValue
          lastCmd.nextValue = cmd.nextValue
          lastCmd.timestamp = Date.now()
          return applyCommand(prev, cmd)
        }
      }

      undoStack.current = [...undoStack.current.slice(-99), cmd]
      redoStack.current = []
      syncFlags()
      return applyCommand(prev, cmd)
    })
  }, [syncFlags])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    setRapportState((prev) => {
      if (!prev) return prev
      const cmd = undoStack.current[undoStack.current.length - 1]
      undoStack.current = undoStack.current.slice(0, -1)
      const inverse = invertCommand(cmd)
      redoStack.current = [cmd, ...redoStack.current]
      syncFlags()
      return applyCommand(prev, inverse)
    })
  }, [syncFlags])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return
    setRapportState((prev) => {
      if (!prev) return prev
      const cmd = redoStack.current[0]
      redoStack.current = redoStack.current.slice(1)
      undoStack.current = [...undoStack.current, cmd]
      syncFlags()
      return applyCommand(prev, cmd)
    })
  }, [syncFlags])

  // Helper dispatchers
  const updateText = useCallback(
    (
      target: 'couverture' | 'entreprise' | 'sections' | 'sectionsGenerated',
      fieldKey: string,
      nextValue: string,
      prevValue: string,
      subFieldKey?: string,
    ) => {
      execute({
        type: 'UPDATE_TEXT',
        target,
        fieldKey,
        subFieldKey,
        prevValue,
        nextValue,
        timestamp: Date.now(),
      })
    },
    [execute],
  )

  const updateStyle = useCallback(
    (prev: Partial<RapportStyle>, next: Partial<RapportStyle>) => {
      execute({
        type: 'UPDATE_STYLE',
        prev,
        next,
      })
    },
    [execute],
  )

  const addImage = useCallback(
    (sectionId: string, image: SectionImage, index?: number) => {
      execute({
        type: 'ADD_IMAGE',
        sectionId,
        image,
        index,
      })
    },
    [execute],
  )

  const deleteImage = useCallback(
    (sectionId: string, image: SectionImage, index: number) => {
      execute({
        type: 'DELETE_IMAGE',
        sectionId,
        image,
        index,
      })
    },
    [execute],
  )

  const moveImage = useCallback(
    (
      fromSectionId: string,
      fromIndex: number,
      toSectionId: string,
      toIndex: number,
      image: SectionImage,
    ) => {
      execute({
        type: 'MOVE_IMAGE',
        fromSectionId,
        fromIndex,
        toSectionId,
        toIndex,
        image,
      })
    },
    [execute],
  )

  const resizeImage = useCallback(
    (sectionId: string, imageId: string, prevSize: 'S' | 'M' | 'L', nextSize: 'S' | 'M' | 'L') => {
      execute({
        type: 'RESIZE_IMAGE',
        sectionId,
        imageId,
        prevSize,
        nextSize,
      })
    },
    [execute],
  )

  const updateImageCaption = useCallback(
    (sectionId: string, imageId: string, prevCaption: string, nextCaption: string) => {
      execute({
        type: 'UPDATE_IMAGE_CAPTION',
        sectionId,
        imageId,
        prevCaption,
        nextCaption,
      })
    },
    [execute],
  )

  const updateImagePosition = useCallback(
    (
      sectionId: string,
      imageId: string,
      prevPos: { positioning?: 'flow' | 'free'; side?: 'left' | 'right' | 'center'; x?: number; y?: number },
      nextPos: { positioning?: 'flow' | 'free'; side?: 'left' | 'right' | 'center'; x?: number; y?: number },
    ) => {
      execute({
        type: 'UPDATE_IMAGE_POSITION',
        sectionId,
        imageId,
        prevPos,
        nextPos,
      })
    },
    [execute],
  )

  return {
    rapport,
    setRapport: setRapportState,
    setRapportDirect,
    canUndo,
    canRedo,
    undo,
    redo,
    execute,
    updateText,
    updateStyle,
    addImage,
    deleteImage,
    moveImage,
    resizeImage,
    updateImageCaption,
    updateImagePosition,
  }
}
