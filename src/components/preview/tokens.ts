/** Presentation tokens the preview DOM reads out of the report's CSS variables. */

/** The institute's names, as printed on the cover. */
export const INSTITUT_FR = 'Instituts de Formation aux Métiers de la Boulangerie et la Pâtisserie'
export const INSTITUT_AR = 'مـعـهـد الـتـكـويـن فـي مهن الخبازة والحلويات بالدار البيضاء'

/** Level-1 headings (part titles, sommaire, matériel). */
export const TITLE_COLOR = 'var(--doc-title-color)'
/** Level-2 headings (sub-sections) and the a/, b/, c/ prefixes. */
export const SUBTITLE_COLOR = 'var(--doc-subtitle-color)'

/** CSS-var text alignment for body text, typed once. */
const DOC_TEXT_ALIGN = 'var(--doc-text-align)' as React.CSSProperties['textAlign']

export const DOC_BODY_STYLE: React.CSSProperties = {
  fontSize: 'var(--doc-body-size)',
  lineHeight: 'var(--doc-line-spacing)',
  textAlign: DOC_TEXT_ALIGN,
}
