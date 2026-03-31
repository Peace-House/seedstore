import { CSSProperties } from 'react'

import { Contents } from '@flow/epubjs'

import { Settings } from './state'
import { keys } from './utils'

export const activeClass = 'bg-primary70'

// Default link color - will be overridden by theme
let themeLinkColor = '#3b82f6'
let themeSelectionColor = 'rgba(3, 102, 214, 0.2)'

export function setThemeLinkColor(color: string) {
  themeLinkColor = color
  // Calculate a lighter version for selection
  themeSelectionColor = `${color}33` // 20% opacity
}

export const getDefaultStyle = () => ({
  html: {
    padding: '0 !important',
  },
  body: {
    background: 'transparent',
  },
  'a:any-link': {
    color: `${themeLinkColor} !important`,
    'text-decoration': 'none !important',
  },
  '::selection': {
    'background-color': themeSelectionColor,
  },
})

// Keep for backwards compatibility
export const defaultStyle = {
  html: {
    padding: '0 !important',
  },
  body: {
    background: 'transparent',
  },
  'a:any-link': {
    color: '#3b82f6 !important',
    'text-decoration': 'none !important',
  },
  '::selection': {
    'background-color': 'rgba(3, 102, 214, 0.2)',
  },
}

const camelToSnake = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

function mapToCss(o: CSSProperties) {
  return keys(o)
    .filter((k) => o[k] !== undefined)
    .map((k) => `${camelToSnake(k)}: ${o[k]} !important;`)
    .join('\n')
}

enum Style {
  Custom = 'custom',
}

export function updateCustomStyle(
  contents: Contents | undefined,
  settings: Settings | undefined,
  themeColor?: string,
) {
  if (!contents || !settings) return

  const { zoom, ...other } = settings
  let css = `a, article, cite, div, li, p, pre, span, table, body {
    ${mapToCss(other)}
  }`

  if (zoom) {
    const body = contents.content as HTMLBodyElement
    const scale = (p: keyof CSSStyleDeclaration) => ({
      [p]: `${parseInt(body.style[p] as string) / zoom}px`,
    })
    css += `body {
      ${mapToCss({
        transformOrigin: 'top left',
        transform: `scale(${zoom})`,
        ...scale('width'),
        ...scale('height'),
        ...scale('columnWidth'),
        ...scale('columnGap'),
        ...scale('paddingTop'),
        ...scale('paddingBottom'),
        ...scale('paddingLeft'),
        ...scale('paddingRight'),
      })}
    }`
  }

  contents.addStylesheetCss(css, Style.Custom)

  // Apply theme colors if provided
  if (themeColor) {
    applyThemeToContents(contents, themeColor)
  }
}

export function lock(l: number, r: number, unit = 'px') {
  const minw = 400
  const maxw = 2560

  return `calc(${l}${unit} + ${r - l} * (100vw - ${minw}px) / ${maxw - minw})`
}

enum ThemeStyle {
  Theme = 'theme-colors',
}

export function applyThemeToContents(
  contents: Contents | undefined,
  themeColor: string,
) {
  if (!contents) return

  // Update the link color
  setThemeLinkColor(themeColor)

  const selectionBg = `${themeColor}33` // 20% opacity

  const css = `
    a, a:link, a:visited, a:hover, a:active, a:any-link {
      color: ${themeColor} !important;
    }
    ::selection {
      background-color: ${selectionBg} !important;
    }
    ::-moz-selection {
      background-color: ${selectionBg} !important;
    }
  `

  return contents.addStylesheetCss(css, ThemeStyle.Theme)
}
