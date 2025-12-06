import React from 'react'
import { IconType } from 'react-icons'
import {
  MdFormatUnderlined,
  MdOutlineImage,
  MdSearch,
  MdTimeline,
  MdOutlineLightMode,
  MdExitToApp,
  MdMenuBook,
  MdLibraryBooks,
} from 'react-icons/md'
import { RiFontSize } from 'react-icons/ri'

import { Action, Env } from '../../hooks'
import { AnnotationView } from '../viewlets/AnnotationView'
import { ImageView } from '../viewlets/ImageView'
import { SearchView } from '../viewlets/SearchView'
import { ThemeView } from '../viewlets/ThemeView'
import { TimelineView } from '../viewlets/TimelineView'
import { TocView } from '../viewlets/TocView'
import { TypographyView } from '../viewlets/TypographyView'

interface IAction {
  name: string
  title: string
  Icon: IconType
  env: number
}
interface IViewAction extends IAction {
  name: Action
  View: React.FC<any>
}
export const viewActions: IViewAction[] = [
  {
    name: 'store',
    title: 'Store',
    Icon: MdExitToApp,
    View: TocView,
    env: Env.Desktop | Env.Mobile,
  },
  {
    name: 'toc',
    title: 'toc',
    Icon: MdMenuBook,
    View: TocView,
    env: Env.Desktop | Env.Mobile,
  },
  {
    name: 'library',
    title: 'library',
    Icon: MdLibraryBooks,
    View: React.Fragment,
    env: Env.Desktop | Env.Mobile,
  },
  {
    name: 'search',
    title: 'search',
    Icon: MdSearch,
    View: SearchView,
    env: Env.Desktop | Env.Mobile,
  },
  {
    name: 'annotation',
    title: 'annotation',
    Icon: MdFormatUnderlined,
    View: AnnotationView,
    env: Env.Desktop | Env.Mobile,
  },
  {
    name: 'typography',
    title: 'typography',
    Icon: RiFontSize,
    View: TypographyView,
    env: Env.Desktop | Env.Mobile,
  },
  {
    name: 'theme',
    title: 'theme',
    Icon: MdOutlineLightMode,
    View: ThemeView,
    env: Env.Desktop | Env.Mobile,
  },
]

