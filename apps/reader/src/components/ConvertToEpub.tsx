import mammoth from 'mammoth'
import React, { useState } from 'react';

import { addBook } from '../file';


export default function ConvertToEpub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConvert(file: File) {
    setLoading(true);
    setError(null);
    try {
      let epubBlob: Blob | null = null;
      if (file.type === 'application/pdf') {
        // PDF: Use a PDF-to-HTML library, then package as EPUB
        // Placeholder: You need to implement PDF to HTML and then EPUB packaging
        setError('PDF conversion not implemented.');
        setLoading(false);
        return;
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        // DOCX: Use mammoth to convert to HTML
        const arrayBuffer = await file.arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        epubBlob = await htmlToEpub(html, file.name.replace(/\.docx$/, '.epub'));
      } else if (file.type === 'text/html' || file.name.endsWith('.htm') || file.name.endsWith('.html')) {
        // HTML: Directly package as EPUB
        const text = await file.text();
        epubBlob = await htmlToEpub(text, file.name.replace(/\.(html?|htm)$/, '.epub'));
      } else {
        setError('Unsupported file type.');
        setLoading(false);
        return;
      }
      if (epubBlob) {
        const epubFile = new File([epubBlob], file.name.replace(/\.[^.]+$/, '.epub'), {
          type: 'application/epub+zip',
        });
        await addBook(epubFile);
        setLoading(false);
        alert('EPUB created and added to library!');
      }
    } catch (e: any) {
      setError(e.message || 'Conversion failed.');
      setLoading(false);
    }
  }

  // Minimal EPUB packaging from HTML using JSZip
  async function htmlToEpub(html: string, filename: string): Promise<Blob> {
    // Dynamically import JSZip if not already available
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Required mimetype file (must be first, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // META-INF/container.xml
    zip.file('META-INF/container.xml',
      `<?xml version="1.0"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>`
    );

    // OEBPS/content.xhtml (main content)
    zip.file('OEBPS/content.xhtml',
      `<?xml version="1.0" encoding="utf-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>${filename.replace(/\.epub$/, '')}</title>
        </head>
        <body>${html}</body>
      </html>`
    );

    // OEBPS/content.opf (package file)
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

    // Generate the EPUB file as a Blob
    return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  }

  return (
    <div>
      <h3>Convert PDF, DOCX, or HTML to EPUB</h3>
      <input
        type="file"
        accept=".pdf,.docx,.htm,.html"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleConvert(file);
        }}
        disabled={loading}
      />
      {loading && <p>Converting...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
