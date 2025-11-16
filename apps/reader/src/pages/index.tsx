import { useBoolean } from '@literal-ui/hooks'
import clsx from 'clsx'
// import { useLiveQuery } from 'dexie-react-hooks'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import {
  MdCheckBox,
  MdCheckBoxOutlineBlank,
} from 'react-icons/md'
import { useSet } from 'react-use'
import { usePrevious } from 'react-use'

import { ReaderGridView, Button, TextField, DropZone } from '../components'
import { BookRecord, CoverRecord, db } from '../db'
import { addFile, fetchBook, handleFiles } from '../file'
import { useBookstoreLibrary } from '../hooks/remote/useBookstoreLibrary'
import {
  useDisablePinchZooming,
  useLibrary,
  useMobile,
  useRemoteBooks,
  useRemoteFiles,
  useTranslation,
} from '../hooks'
import { reader, useReaderSnapshot } from '../models'
import { lock } from '../styles'
import { pack } from '../sync'
import { copy } from '../utils'
import { useGetLibraryBookById } from '../hooks/remote/useGetLibraryBookById'


// Store auth_token from URL to localStorage if present, then remove it from the URL
if (typeof window !== 'undefined') {
  const url = new URL(window.location.href)
  const authToken = url.searchParams.get('auth_token')
  if (authToken) {
    localStorage.setItem('auth_token', authToken)
  // // Remove only auth_token from URL, keep other params
  // url.searchParams.delete('auth_token')
  // const newSearch = url.searchParams.toString()
  // const newUrl = url.pathname + (newSearch ? `?${newSearch}` : '') + url.hash
  // window.history.replaceState({}, '', newUrl)
  }
}


const placeholder = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="gray" fill-opacity="0" width="1" height="1"/></svg>`

const SOURCE = 'src'

export default function Index() {
  const { focusedTab } = useReaderSnapshot();
  const router = useRouter();
  useDisablePinchZooming();

  // Extract bookId and orderId from router.query or URL
  const bookId =router.query.bookId as string | undefined
  const orderId = router.query.orderId as string | undefined
  const [loading, setLoading] = useState(!!bookId);

  // Fetch book details from server using custom hook
  const { book: remoteBook, error: remoteBookError } = useGetLibraryBookById(
    orderId ?? undefined,
    bookId ?? undefined
  );

  // Only open the book once per visit
  const [hasOpenedBook, setHasOpenedBook] = useState(false);
  useEffect(() => {
    if (hasOpenedBook) return;
    if (!bookId || !orderId) return;
    setLoading(true);
    if (remoteBook && remoteBook.fileUrl) {
      fetch(remoteBook.fileUrl)
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to download book file');
          const blob = await res.blob();
          const file = new File([blob], remoteBook.name || 'book.epub', { type: 'application/epub+zip' });
          if (db?.files) await db.files.put({ id: remoteBook.id, file });
          reader.addTab({ ...remoteBook, file });
          setLoading(false);
          setHasOpenedBook(true);
          // Remove all URL search params for a clean URL
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.search) {
              const newUrl = url.pathname + url.hash;
              window.history.replaceState({}, '', newUrl);
            }
          }
        })
        .catch((err) => {
          setLoading(false);
          console.error(err);
        });
    } else if (remoteBookError) {
      setLoading(false);
      alert('Could not fetch book from server.');
      setHasOpenedBook(true);
    }
  }, [bookId, orderId, remoteBook, remoteBookError, hasOpenedBook]);
  useEffect(() => {
    if ('launchQueue' in window && 'LaunchParams' in window) {
      window.launchQueue.setConsumer((params) => {
        console.log('launchQueue', params)
        if (params.files.length) {
          Promise.all(params.files.map((f) => f.getFile()))
            .then((files) => handleFiles(files))
            .then((books) => books.forEach((b) => reader.addTab(b)))
        }
      })
    }
  }, [])

  useEffect(() => {
    router.beforePopState(({ url }) => {
      if (url === '/') {
        reader.clear()
      }
      return true
    })
  }, [router])

  return (
    <>
      <Head>
        {/* https://github.com/microsoft/vscode/blob/36fdf6b697cba431beb6e391b5a8c5f3606975a1/src/vs/code/browser/workbench/workbench.html#L16 */}
        {/* Disable pinch zooming */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <title>{focusedTab?.title ?? 'SeedStore'}</title>
      </Head>
      <ReaderGridView />
      {loading ? <div className='animate-pulse text-white dark:text-gray-400'>Loading...</div> : <Library />}
    </>
  )
}

const Library = () => {
  // const books = useLibrary()
  const books = useBookstoreLibrary()
  console.log('bookss', books);
  // const covers = useLiveQuery(() => db?.covers.toArray() ?? [])
  const t = useTranslation('home')

  // useRemoteBooks now fetches from server, not Dropbox
  const { data: remoteBooks, mutate: mutateRemoteBooks } = useRemoteBooks()
  const { data: remoteFiles, mutate: mutateRemoteFiles } = useRemoteFiles()
  const previousRemoteBooks = usePrevious(remoteBooks)
  const previousRemoteFiles = usePrevious(remoteFiles)

  const [select, toggleSelect] = useBoolean(false)
  const [selectedBookIds, { add, has, toggle, reset }] = useSet<string>()

  const [loading, setLoading] = useState<string | undefined>()
  const [readyToSync, setReadyToSync] = useState(false)

  const { groups } = useReaderSnapshot()



  useEffect(() => {
    if (!previousRemoteBooks && remoteBooks) {
      db?.books.bulkPut(remoteBooks).then(() => setReadyToSync(true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteBooks])



  useEffect(() => {
    if (!select) reset()
  }, [reset, select])

  if (groups.length) return null
  if (!books) return null

  // const selectedBooks = [...selectedBookIds].map(
  //   (id) => books.find((b: BookRecord) => b.id === id)!,
  // )
  // const allSelected = selectedBookIds.size === books.length

  return (
    <DropZone
      className="scroll-parent h-full p-4"
      onDrop={(e) => {
        const bookId = e.dataTransfer.getData('text/plain')
  const book = books.find((b: BookRecord) => b.id === bookId)
        if (book) reader.addTab(book)

        handleFiles(e.dataTransfer.files)
      }}
    >
       {/* <div className="mb-4 space-y-2.5">
        <div>
          <TextField
            name={SOURCE}
            placeholder="https://link.to/remote.epub"
            type="url"
            hideLabel
            actions={[
              {
                title: t('share'),
                Icon: MdOutlineShare,
                onClick(el) {
                  if (el?.reportValidity()) {
                    copy(`${window.location.origin}/?${SOURCE}=${el.value}`)
                  }
                },
              },
              {
                title: t('download'),
                Icon: MdOutlineFileDownload,
                onClick(el) {
                  if (el?.reportValidity()) fetchBook(el.value)
                },
              },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="space-x-2">
            {books.length ? (
              <Button variant="secondary" onClick={toggleSelect}>
                {t(select ? 'cancel' : 'select')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={!books}
                onClick={() => {
                  fetchBook(
                    'https://epubtest.org/books/Fundamental-Accessibility-Tests-Basic-Functionality-v1.0.0.epub',
                  )
                }}
              >
                {t('download_sample_book')}
              </Button>
            )}
            {select &&
              (allSelected ? (
                <Button variant="secondary" onClick={reset}>
                  {t('deselect_all')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => books.forEach((b: BookRecord) => add(b.id))}
                >
                  {t('select_all')}
                </Button>
              ))}
          </div>

          <div className="space-x-2">
  const remoteFile = remoteFiles.data?.find((f: { name: string }) => f.name === book.name)
              <>
                <Button
                  onClick={async () => {
                    toggleSelect()

                    for (const book of selectedBooks) {
                      const remoteFile = remoteFiles?.find(
                        (f) => f.name === book.name,
                      )
                      if (remoteFile) continue

                      const file = await db?.files.get(book.id)
                      if (!file) continue


                    }
                  }}
                >
                  {t('upload')}
                </Button>
                <Button
                  onClick={async () => {
                    toggleSelect()
                    const bookIds = [...selectedBookIds]

                    db?.books.bulkDelete(bookIds)
                    db?.covers.bulkDelete(bookIds)
                    db?.files.bulkDelete(bookIds)

                    // folder data is not updated after `filesDeleteBatch`

                  }}
                >
                  {t('delete')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  disabled={!books.length}
                  onClick={pack}
                >
                  {t('export')}
                </Button>
                <Button className="relative">
                  <input
                    type="file"
                    accept="application/epub+zip,application/epub,application/zip"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const files = e.target.files
                      if (files) handleFiles(files)
                    }}
                    multiple
                  />
                  {t('import')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>  */}

      <div className="scroll h-full p-2">
        <ul
          className="grid"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(calc(80px + 3vw), 1fr))`,
            columnGap: lock(16, 32),
            rowGap: lock(24, 40),
          }}
        >
          {books?.map((book:any) => (
            <Book
              key={book.id}
              book={book}
              covers={book?.coverImage || book.cover}
              select={select}
              selected={has(book.id)}
              loading={loading === book.id}
              toggle={toggle}
            />
          ))}
        </ul>
      </div>
    </DropZone>
  )
}

interface BookProps {
  book: BookRecord
  covers?: CoverRecord[]
  select?: boolean
  selected?: boolean
  loading?: boolean
  toggle: (id: string) => void
}
const Book = ({
  book,
  // covers,
  select,
  selected,
  loading,
  toggle,
}: BookProps) => {
  const remoteFiles = useRemoteFiles()
  const router = useRouter()
  const mobile = useMobile()
  const remoteFile = remoteFiles.data?.find((f: { name: string }) => f.name === book.name)
  const Icon = selected ? MdCheckBox : MdCheckBoxOutlineBlank

  async function handleBookOpen() {
    if (select) {
      toggle(book.id)
      return
    }
    // Check for local file
    const fileRecord = await db?.files.get(book.id)
    if (fileRecord) {
      if (mobile) await router.push('/_')
      reader.addTab(book)
      return
    }
    // If not present, try to download from fileUrl (Cloudinary link)
    try {
      if (!book.fileUrl) throw new Error('No fileUrl for this book')
      const res = await fetch(book.fileUrl)
      if (!res.ok) throw new Error('Failed to download book file')
      const blob = await res.blob()
      const file = new File([blob], book.name, { type: 'application/epub+zip' })
      await addFile(book.id, file)
      if (mobile) await router.push('/_')
      reader.addTab(book)
    } catch (err) {
      alert('Could not download book file from server.')
      console.error(err)
    }
  }

  return (
    <div className="relative flex flex-col">
      <div
        role="button"
        className="border-inverse-on-surface relative border"
        onClick={handleBookOpen}
      >
        <div
          className={clsx(
            'absolute bottom-0 h-1 bg-blue-500',
            loading && 'progress-bit w-[5%]',
          )}
        />
        {book.percentage !== undefined && (
          <div className="typescale-body-large absolute right-0 bg-gray-500/60 px-2 text-gray-100">
            {(book.percentage * 100).toFixed()}%
          </div>
        )}
        <img
          src={book?.cover ?? placeholder}
          alt="Cover"
          className="mx-auto aspect-[9/12] object-cover"
          draggable={false}
        />
        {select && (
          <div className="absolute bottom-1 right-1">
            <Icon
              size={24}
              className={clsx(
                '-m-1',
                selected ? 'text-tertiary' : 'text-outline',
              )}
            />
          </div>
        )}
      </div>
      {/* <div
        className="line-clamp-2 text-on-surface-variant typescale-body-small lg:typescale-body-medium mt-2 w-full"
        title={book.name}
      >
        {book.name}
      </div> */}
    </div>
  )
}
