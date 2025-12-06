import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

import { ReaderGridView, 
} from '../components'
import {
  db } from '../db'
import { 
  handleFiles } from '../file'
import {
  useDisablePinchZooming,
} from '../hooks'
import { useBookstoreLibrary } from '../hooks/remote/useBookstoreLibrary'
import { useGetLibraryBookById } from '../hooks/remote/useGetLibraryBookById'
import { useLibrarySync } from '../hooks/useLibrarySync'
import { reader, useReaderSnapshot } from '../models'


// Store auth_token from URL to localStorage if present, then remove it from the URL
if (typeof window !== 'undefined') {
  const url = new URL(window.location.href)
  const authToken = url.searchParams.get('auth_token')
  if (authToken) {
    localStorage.setItem('auth_token', authToken)
  }
}

export default function Index() {
  const { focusedTab, groups } = useReaderSnapshot();
  const router = useRouter();
  useDisablePinchZooming();

  // Fetch library for syncing local DB with remote
  const libraryBooks = useBookstoreLibrary()
  useLibrarySync(libraryBooks)

  // Track if a book was ever opened in this session
  const [hadOpenTabs, setHadOpenTabs] = useState(false);

  // Extract bookId and orderId from router.query or URL
  const bookId = router.query.bookId as string | undefined
  const orderId = router.query.orderId as string | undefined
  const [loading, setLoading] = useState(!!bookId);

  // Track when tabs are opened
  useEffect(() => {
    if (groups.length > 0) {
      setHadOpenTabs(true);
    }
  }, [groups.length]);

  // Navigate to library when all tabs are closed (only if tabs were previously open)
  useEffect(() => {
    if (hadOpenTabs && groups.length === 0) {
      router.push('/library');
    }
  }, [hadOpenTabs, groups.length, router]);

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
      {loading ? <div className='animate-pulse text-white dark:text-gray-400'>Loading...</div> : 
      // <Library />
      <div>No book opened</div>
      }
    </>
  )
}
