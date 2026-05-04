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
  // Download progress (0-100). Null while we're not downloading or while
  // the cache hit means there's nothing to show. Surfaced in the loading
  // UI so the user sees motion instead of a frozen "Loading..." text on
  // multi-MB books over slow networks.
  const [downloadPct, setDownloadPct] = useState<number | null>(null);

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

    let cancelled = false;
    const cleanUrl = () => {
      // Strip ?bookId=...&orderId=... so the address bar reflects the
      // user's actual location after a successful open.
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.search) {
          window.history.replaceState({}, '', url.pathname + url.hash);
        }
      }
    };

    const finalize = (file: File) => {
      if (cancelled) return;
      reader.addTab({ ...remoteBook!, file });
      setLoading(false);
      setDownloadPct(null);
      setHasOpenedBook(true);
      cleanUrl();
    };

    /** Stream the EPUB from the network and surface byte-level progress.
     *  Falls back to res.blob() if the server didn't send Content-Length
     *  (some CDNs strip it on chunked transfers) so we always end with a
     *  usable File. */
    const streamingDownload = async (url: string): Promise<File> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to download book file');

      const total = Number(res.headers.get('Content-Length')) || 0;
      const stream = res.body;
      if (!stream) {
        // Older browsers without ReadableStream — fall back to blob().
        const blob = await res.blob();
        return new File([blob], remoteBook!.name || 'book.epub', {
          type: 'application/epub+zip',
        });
      }

      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      // Show 1% immediately so the bar isn't pinned at 0 during TLS / TTFB.
      setDownloadPct(total > 0 ? 1 : null);

      while (true) {
        if (cancelled) {
          // Stop pulling — the user navigated away or unmounted.
          await reader.cancel().catch(() => {});
          throw new Error('cancelled');
        }
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total > 0) {
            const pct = Math.min(99, Math.floor((received / total) * 100));
            setDownloadPct(pct);
          }
        }
      }

      setDownloadPct(100);
      const blob = new Blob(chunks, { type: 'application/epub+zip' });
      return new File([blob], remoteBook!.name || 'book.epub', {
        type: 'application/epub+zip',
      });
    };

    setLoading(true);
    setDownloadPct(null);

    (async () => {
      try {
        if (!remoteBook || !remoteBook.fileUrl) {
          if (remoteBookError) {
            setLoading(false);
            alert('Could not fetch book from server.');
            setHasOpenedBook(true);
          }
          return;
        }

        // Cache hit: skip the network entirely and reuse the previously
        // downloaded File from IndexedDB. Books that have been opened
        // before become near-instant on subsequent opens.
        const cached = db?.files ? await db.files.get(String(remoteBook.id)) : undefined;
        if (cached?.file) {
          // Preserve a non-null file reference for the .addTab call but
          // keep finalize generic. Touch percentage as a sentinel so the
          // loading UI knows there's no download to display.
          finalize(cached.file);
          return;
        }

        // Cache miss → stream the file with progress, persist to
        // IndexedDB for next time, then open the tab.
        const file = await streamingDownload(remoteBook.fileUrl);
        if (cancelled) return;
        if (db?.files) {
          await db.files.put({ id: String(remoteBook.id), file });
        }
        finalize(file);
      } catch (err: any) {
        if (cancelled || err?.message === 'cancelled') return;
        setLoading(false);
        setDownloadPct(null);
        console.error('[Reader] open book failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
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
      {loading ? (
        <div className='flex flex-col items-center justify-center gap-3 p-6 text-white dark:text-gray-400'>
          <div className='animate-pulse text-sm'>
            {downloadPct === null
              ? 'Loading...'
              : downloadPct < 100
                ? `Downloading book... ${downloadPct}%`
                : 'Opening...'}
          </div>
          {downloadPct !== null && (
            // Slim progress bar; only shown while we have meaningful
            // progress data (Content-Length was sent and we're streaming).
            <div className='h-1 w-48 overflow-hidden rounded bg-white/10'>
              <div
                className='h-full bg-white/70 transition-[width] duration-150'
                style={{ width: `${downloadPct}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        // <Library />
        <div>No book opened</div>
      )}
    </>
  )
}
