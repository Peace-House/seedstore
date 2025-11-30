import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { MdCheckCircle, MdLogout } from 'react-icons/md'

import { db } from '../db'
import { addBook } from '../file'
import { useMobile, useSetAction } from '../hooks'
import { useBookstoreLibrary } from '../hooks/remote/useBookstoreLibrary'
import { useLibrarySync } from '../hooks/useLibrarySync'
import { reader } from '../models'
import { logout } from '../services/librarySyncService'

const placeholder = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="gray" fill-opacity="0" width="1" height="1"/></svg>`

export default function LibraryPage() {
  //   const books = useLibrary()
  const router = useRouter()
  const mobile = useMobile()
  const setAction = useSetAction()
  const books = useBookstoreLibrary()

  // Sync local library with remote - removes books not in remote library
  useLibrarySync(books)

  // Hide sidebar when on library page
  useEffect(() => {
    setAction('library')
  }, [setAction])

  if (!books) return null

  // Helper: Convert file to EPUB if needed
  async function convertIfNeeded(book: any) {
    const ext = book.name.split('.').pop()?.toLowerCase();
    if (["pdf", "docx", "htm", "html"].includes(ext)) {
      // Fetch the file from db or remote (assume db.files.get)
      const fileRecord = await db?.files.get(book.id);
      if (!fileRecord) return;
      const file = fileRecord.file;
      let epubBlob = null;
      if (ext === "docx") {
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await file.arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        epubBlob = await htmlToEpub(html, book.name.replace(/\.docx$/, '.epub'));
      } else if (["htm", "html"].includes(ext)) {
        const text = await file.text();
        epubBlob = await htmlToEpub(text, book.name.replace(/\.(html?|htm)$/, '.epub'));
      } else if (ext === "pdf") {
        // PDF conversion not implemented
        alert('PDF conversion not implemented.');
        return;
      }
      if (epubBlob) {
        const epubFile = new File([epubBlob], book.name.replace(/\.[^.]+$/, '.epub'), {
          type: 'application/epub+zip',
        });
        const newBook = await addBook(epubFile);
        openBookInReader(newBook);
        return;
      }
    } else {
      openBookInReader(book);
    }
  }

  // Helper function to navigate to reader after adding tab
  function openBookInReader(book: any) {
    reader.addTab(book)
    router.push('/')
  }

  // Minimal EPUB packaging from HTML using JSZip
  async function htmlToEpub(html: string, filename: string): Promise<Blob> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    zip.file('META-INF/container.xml',
      `<?xml version="1.0"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>`
    );
    zip.file('OEBPS/content.xhtml',
      `<?xml version="1.0" encoding="utf-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>${filename.replace(/\.epub$/, '')}</title>
        </head>
        <body>${html}</body>
      </html>`
    );
    zip.file('OEBPS/content.opf',
      `<?xml version="1.0" encoding="utf-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:identifier id="BookId">urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}</dc:identifier>
          <dc:title>${filename.replace(/\.epub$/, '')}</dc:title>
          <dc:language>en</dc:language>
        </metadata>
        <manifest>
          <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
        </manifest>
        <spine>
          <itemref idref="content"/>
        </spine>
      </package>`
    );
    return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  }

  const handleLogout = async () => {
    const bookstoreUrl = process.env.NEXT_PUBLIC_BOOKSTORE_URL || 'http://localhost:7117'
    await logout(bookstoreUrl)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Library</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-surface-variant hover:bg-outline/20 transition-colors"
          title="Logout"
        >
          <MdLogout size={18} />
          <span>Logout</span>
        </button>
      </div>
      <ul className="grid" style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(calc(80px + 3vw), 1fr))`,
        columnGap: 16,
        rowGap: 24,
      }}>
        {books.map((book: any) => (
          <li key={book.id}>
            <LibraryBookCard book={book} onClick={async () => {
              setAction('toc')
              convertIfNeeded(book)
            }} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function LibraryBookCard({ book, onClick }: { book: any, onClick: () => void }) {
  return (
    <div className="relative flex flex-col cursor-pointer" onClick={onClick}>
      <img
        src={book?.cover ?? placeholder}
        alt="Cover"
        className="mx-auto aspect-[9/12] object-cover"
        draggable={false}
      />
    </div>
  )
}
