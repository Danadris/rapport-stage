import { MeasuredPages } from './MeasuredPages'

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  startPageNum?: number
  headerLogo?: string | null
}

/**
 * One page of the report: A4 on screen, and paginated exactly the same way in
 * print, because MeasuredPages renders the same content once per window.
 */
export function Page({ children, className, style, startPageNum, headerLogo, ...rest }: PageProps) {
  return (
    <MeasuredPages className={className} style={style} startPageNum={startPageNum} headerLogo={headerLogo} {...rest}>
      {children}
    </MeasuredPages>
  )
}
