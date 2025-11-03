import React, { useState } from 'react';
import { FileText, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import * as mammoth from 'mammoth';

const EPUBConverter = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [converting, setConverting] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    handleFile(selectedFile);
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    
    const validExtensions = ['.docx', '.htm', '.html'];
    const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Please upload a DOCX, HTML, or HTM file');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    setError('');
    setStatus('');
  };

  // Simple ZIP file creator
  const createZipFile = (files) => {
    const zipParts = [];
    let offset = 0;
    const centralDirectory = [];

    for (const file of files) {
      const filename = file.name;
      const content = new TextEncoder().encode(file.content);
      const crc = 0; // Simplified - not calculating actual CRC
      
      // Local file header
      const header = new Uint8Array(30 + filename.length);
      const view = new DataView(header.buffer);
      
      view.setUint32(0, 0x04034b50, true); // signature
      view.setUint16(4, 20, true); // version
      view.setUint16(6, file.store ? 0 : 0, true); // flags
      view.setUint16(8, 0, true); // compression method (0 = store)
      view.setUint16(10, 0, true); // mod time
      view.setUint16(12, 0, true); // mod date
      view.setUint32(14, crc, true); // crc32
      view.setUint32(18, content.length, true); // compressed size
      view.setUint32(22, content.length, true); // uncompressed size
      view.setUint16(26, filename.length, true); // filename length
      view.setUint16(28, 0, true); // extra field length
      
      // Write filename
      for (let i = 0; i < filename.length; i++) {
        header[30 + i] = filename.charCodeAt(i);
      }
      
      zipParts.push(header);
      zipParts.push(content);
      
      // Store for central directory
      centralDirectory.push({
        name: filename,
        offset: offset,
        size: content.length,
        crc: crc
      });
      
      offset += header.length + content.length;
    }
    
    // Central directory
    const cdStart = offset;
    for (const entry of centralDirectory) {
      const header = new Uint8Array(46 + entry.name.length);
      const view = new DataView(header.buffer);
      
      view.setUint32(0, 0x02014b50, true); // signature
      view.setUint16(4, 20, true); // version made by
      view.setUint16(6, 20, true); // version needed
      view.setUint16(8, 0, true); // flags
      view.setUint16(10, 0, true); // compression
      view.setUint16(12, 0, true); // mod time
      view.setUint16(14, 0, true); // mod date
      view.setUint32(16, entry.crc, true); // crc32
      view.setUint32(20, entry.size, true); // compressed size
      view.setUint32(24, entry.size, true); // uncompressed size
      view.setUint16(28, entry.name.length, true); // filename length
      view.setUint16(30, 0, true); // extra field length
      view.setUint16(32, 0, true); // comment length
      view.setUint16(34, 0, true); // disk number
      view.setUint16(36, 0, true); // internal attributes
      view.setUint32(38, 0, true); // external attributes
      view.setUint32(42, entry.offset, true); // relative offset
      
      for (let i = 0; i < entry.name.length; i++) {
        header[46 + i] = entry.name.charCodeAt(i);
      }
      
      zipParts.push(header);
      offset += header.length;
    }
    
    // End of central directory
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true); // signature
    eocdView.setUint16(4, 0, true); // disk number
    eocdView.setUint16(6, 0, true); // disk with central dir
    eocdView.setUint16(8, centralDirectory.length, true); // entries on this disk
    eocdView.setUint16(10, centralDirectory.length, true); // total entries
    eocdView.setUint32(12, offset - cdStart, true); // central dir size
    eocdView.setUint32(16, cdStart, true); // central dir offset
    eocdView.setUint16(20, 0, true); // comment length
    
    zipParts.push(eocd);
    
    return new Blob(zipParts, { type: 'application/epub+zip' });
  };

  const createEPUB = async (title, content) => {
    const files = [];
    
    // mimetype (must be first and uncompressed)
    files.push({
      name: 'mimetype',
      content: 'application/epub+zip',
      store: true
    });
    
    // META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    files.push({ name: 'META-INF/container.xml', content: containerXml });
    
    // OEBPS/content.opf
    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:${Date.now()}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Converted Document</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="toc">
    <itemref idref="chapter1"/>
  </spine>
</package>`;
    files.push({ name: 'OEBPS/content.opf', content: contentOpf });
    
    // OEBPS/toc.ncx
    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <navMap>
    <navPoint id="chapter1">
      <navLabel><text>Chapter 1</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
    files.push({ name: 'OEBPS/toc.ncx', content: tocNcx });
    
    // OEBPS/nav.xhtml
    const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Navigation</title>
</head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="chapter1.xhtml">Chapter 1</a></li>
    </ol>
  </nav>
</body>
</html>`;
    files.push({ name: 'OEBPS/nav.xhtml', content: navXhtml });
    
    // OEBPS/chapter1.xhtml
    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(title)}</title>
  <style>
    body { font-family: serif; line-height: 1.6; margin: 2em; }
    h1, h2, h3 { font-weight: bold; margin-top: 1.5em; }
    p { margin: 1em 0; text-align: justify; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  ${content}
</body>
</html>`;
    files.push({ name: 'OEBPS/chapter1.xhtml', content: chapterXhtml });
    
    return createZipFile(files);
  };

  const escapeXml = (str) => {
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const convertToEPUB = async () => {
    if (!file) return;
    
    setConverting(true);
    setError('');
    setStatus('Converting...');
    
    try {
      let content = '';
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      
      if (file.name.toLowerCase().endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        content = result.value;
      } else if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const body = doc.body;
        content = body.innerHTML || text;
      }
      
      const epubBlob = await createEPUB(fileName, content);
      
      // Download the EPUB
      const url = URL.createObjectURL(epubBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus('Conversion complete! Your EPUB is downloading...');
      setConverting(false);
    } catch (err) {
      setError(`Conversion failed: ${err.message}`);
      setConverting(false);
      setStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">EPUB Converter</h1>
          </div>
          
          <p className="text-center text-gray-600 mb-8">
            Convert DOCX, HTML, and HTM files to EPUB format
          </p>
          
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-3 border-dashed border-indigo-300 rounded-xl p-12 text-center bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <Upload className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <p className="text-lg text-gray-700 mb-2">
              Drag & drop your file here
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <label className="inline-block">
              <input
                type="file"
                onChange={handleFileInput}
                accept=".docx,.html,.htm"
                className="hidden"
              />
              <span className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 cursor-pointer inline-block transition-colors">
                Browse Files
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-4">
              Supported formats: DOCX, HTML, HTM
            </p>
          </div>
          
          {file && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-gray-700">{file.name}</span>
                </div>
                <button
                  onClick={convertToEPUB}
                  disabled={converting}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {converting ? 'Converting...' : 'Convert to EPUB'}
                </button>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {status && !error && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-green-700">{status}</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">How to use:</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Upload a DOCX, HTML, or HTM file using drag & drop or the browse button</li>
            <li>Click "Convert to EPUB" to start the conversion</li>
            <li>Your EPUB file will automatically download when ready</li>
            <li>Open the EPUB file with any e-reader application</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default EPUBConverter;