import type { RapportStyle, Rapport, SectionImage } from '../types'

export type Command =
  | {
      type: 'UPDATE_TEXT'
      target: 'couverture' | 'entreprise' | 'sections' | 'sectionsGenerated'
      fieldKey: string
      subFieldKey?: string
      prevValue: string
      nextValue: string
      timestamp: number
    }
  | {
      type: 'UPDATE_STYLE'
      prev: Partial<RapportStyle>
      next: Partial<RapportStyle>
    }
  | {
      type: 'ADD_IMAGE'
      sectionId: string
      image: SectionImage
      index?: number
    }
  | {
      type: 'DELETE_IMAGE'
      sectionId: string
      image: SectionImage
      index: number
    }
  | {
      type: 'MOVE_IMAGE'
      fromSectionId: string
      fromIndex: number
      toSectionId: string
      toIndex: number
      image: SectionImage
    }
  | {
      type: 'RESIZE_IMAGE'
      sectionId: string
      imageId: string
      prevSize: 'S' | 'M' | 'L'
      nextSize: 'S' | 'M' | 'L'
    }
  | {
      type: 'UPDATE_IMAGE_CAPTION'
      sectionId: string
      imageId: string
      prevCaption: string
      nextCaption: string
    }
  | {
      type: 'UPDATE_IMAGE_POSITION'
      sectionId: string
      imageId: string
      prevPos: {
        positioning?: 'flow' | 'free'
        side?: 'left' | 'right' | 'center'
        x?: number
        y?: number
      }
      nextPos: {
        positioning?: 'flow' | 'free'
        side?: 'left' | 'right' | 'center'
        x?: number
        y?: number
      }
    }

/**
 * Produces the exact inverse of any command to undo it.
 */
export function invertCommand(cmd: Command): Command {
  switch (cmd.type) {
    case 'UPDATE_TEXT':
      return {
        ...cmd,
        prevValue: cmd.nextValue,
        nextValue: cmd.prevValue,
        timestamp: Date.now(),
      }
    case 'UPDATE_STYLE':
      return {
        type: 'UPDATE_STYLE',
        prev: cmd.next,
        next: cmd.prev,
      }
    case 'ADD_IMAGE':
      return {
        type: 'DELETE_IMAGE',
        sectionId: cmd.sectionId,
        image: cmd.image,
        index: cmd.index ?? 0,
      }
    case 'DELETE_IMAGE':
      return {
        type: 'ADD_IMAGE',
        sectionId: cmd.sectionId,
        image: cmd.image,
        index: cmd.index,
      }
    case 'MOVE_IMAGE':
      return {
        type: 'MOVE_IMAGE',
        fromSectionId: cmd.toSectionId,
        fromIndex: cmd.toIndex,
        toSectionId: cmd.fromSectionId,
        toIndex: cmd.fromIndex,
        image: cmd.image,
      }
    case 'RESIZE_IMAGE':
      return {
        type: 'RESIZE_IMAGE',
        sectionId: cmd.sectionId,
        imageId: cmd.imageId,
        prevSize: cmd.nextSize,
        nextSize: cmd.prevSize,
      }
    case 'UPDATE_IMAGE_CAPTION':
      return {
        type: 'UPDATE_IMAGE_CAPTION',
        sectionId: cmd.sectionId,
        imageId: cmd.imageId,
        prevCaption: cmd.nextCaption,
        nextCaption: cmd.prevCaption,
      }
    case 'UPDATE_IMAGE_POSITION':
      return {
        type: 'UPDATE_IMAGE_POSITION',
        sectionId: cmd.sectionId,
        imageId: cmd.imageId,
        prevPos: cmd.nextPos,
        nextPos: cmd.prevPos,
      }
  }
}

/**
 * Applies a command to a Rapport state immutably.
 */
export function applyCommand(rapport: Rapport, cmd: Command): Rapport {
  switch (cmd.type) {
    case 'UPDATE_TEXT': {
      const { target, fieldKey, subFieldKey, nextValue } = cmd
      if (target === 'couverture') {
        return {
          ...rapport,
          updatedAt: Date.now(),
          couverture: {
            ...rapport.couverture,
            [fieldKey]: nextValue,
          },
        }
      }
      if (target === 'entreprise') {
        return {
          ...rapport,
          updatedAt: Date.now(),
          entreprise: {
            ...rapport.entreprise,
            [fieldKey]: nextValue,
          },
        }
      }
      if (target === 'sections' && subFieldKey) {
        return {
          ...rapport,
          updatedAt: Date.now(),
          sections: {
            ...rapport.sections,
            [fieldKey]: {
              ...(rapport.sections[fieldKey] ?? {}),
              [subFieldKey]: nextValue,
            },
          },
        }
      }
      if (target === 'sectionsGenerated' && subFieldKey) {
        return {
          ...rapport,
          updatedAt: Date.now(),
          sectionsGenerated: {
            ...(rapport.sectionsGenerated ?? {}),
            [fieldKey]: {
              ...(rapport.sectionsGenerated?.[fieldKey] ?? {}),
              [subFieldKey]: nextValue,
            },
          },
        }
      }
      return rapport
    }

    case 'UPDATE_STYLE': {
      return {
        ...rapport,
        updatedAt: Date.now(),
        style: {
          ...(rapport.style ?? { primaryColor: '#2b579a', titleFont: 'serif', bodyFont: 'sans' }),
          ...cmd.next,
        },
      }
    }

    case 'ADD_IMAGE': {
      const sectionImages = [...(rapport.images?.[cmd.sectionId] ?? [])]
      const insertAt = cmd.index !== undefined && cmd.index >= 0 ? cmd.index : sectionImages.length
      sectionImages.splice(insertAt, 0, cmd.image)
      return {
        ...rapport,
        updatedAt: Date.now(),
        images: {
          ...(rapport.images ?? {}),
          [cmd.sectionId]: sectionImages,
        },
      }
    }

    case 'DELETE_IMAGE': {
      const sectionImages = (rapport.images?.[cmd.sectionId] ?? []).filter((img) => img.id !== cmd.image.id)
      return {
        ...rapport,
        updatedAt: Date.now(),
        images: {
          ...(rapport.images ?? {}),
          [cmd.sectionId]: sectionImages,
        },
      }
    }

    case 'MOVE_IMAGE': {
      const fromList = [...(rapport.images?.[cmd.fromSectionId] ?? [])].filter((img) => img.id !== cmd.image.id)
      const toList =
        cmd.fromSectionId === cmd.toSectionId
          ? fromList
          : [...(rapport.images?.[cmd.toSectionId] ?? [])]
      toList.splice(cmd.toIndex, 0, cmd.image)

      return {
        ...rapport,
        updatedAt: Date.now(),
        images: {
          ...(rapport.images ?? {}),
          [cmd.fromSectionId]: fromList,
          [cmd.toSectionId]: toList,
        },
      }
    }

    case 'RESIZE_IMAGE': {
      const list = (rapport.images?.[cmd.sectionId] ?? []).map((img) =>
        img.id === cmd.imageId ? { ...img, size: cmd.nextSize } : img,
      )
      return {
        ...rapport,
        updatedAt: Date.now(),
        images: {
          ...(rapport.images ?? {}),
          [cmd.sectionId]: list,
        },
      }
    }

    case 'UPDATE_IMAGE_CAPTION': {
      const list = (rapport.images?.[cmd.sectionId] ?? []).map((img) =>
        img.id === cmd.imageId ? { ...img, caption: cmd.nextCaption } : img,
      )
      return {
        ...rapport,
        updatedAt: Date.now(),
        images: {
          ...(rapport.images ?? {}),
          [cmd.sectionId]: list,
        },
      }
    }

    case 'UPDATE_IMAGE_POSITION': {
      const list = (rapport.images?.[cmd.sectionId] ?? []).map((img) =>
        img.id === cmd.imageId ? { ...img, ...cmd.nextPos } : img,
      )
      return {
        ...rapport,
        updatedAt: Date.now(),
        images: {
          ...(rapport.images ?? {}),
          [cmd.sectionId]: list,
        },
      }
    }
  }
}
