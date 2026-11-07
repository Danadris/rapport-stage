import { createContext } from 'react'
import logo from '../../assets/ifmbp-logo-official.png'

/** The institute's logo as shipped with the app. */
export const IFMBP_LOGO = logo

/**
 * The logo drawn on the cover and on every page header. A report can replace it
 * from the cover page; until then it stays the official one.
 *
 * Context rather than a prop because every page in the document draws it, and
 * the call sites (Page, MaterielPage, Sommaire, the fiches) would otherwise each
 * need it threaded through. Everything rendered outside the document — the app
 * shell, for one — keeps importing IFMBP_LOGO directly and is unaffected.
 */
export const IfmbpLogoContext = createContext(IFMBP_LOGO)
