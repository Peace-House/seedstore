import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Settings, Bookmark, Search, Sun, Moon, Menu, X, ZoomIn, ZoomOut } from 'lucide-react';

// This component supports JSON, EPUB, and PDF formats
const BookReader = ({ bookUrl, bookFormat = 'json', bookId }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('serif');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Format-specific states
  const [book, setBook] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [rendition, setRendition] = useState(null);
  
  const viewerRef = useRef(null);
  const epubRef = useRef(null);
  const pdfDocRef = useRef(null);

  // Load book based on format
  useEffect(() => {
    loadBook();
  }, [bookUrl, bookFormat]);

  const loadBook = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (bookFormat === 'json') {
        await loadJSONBook();
      } else if (bookFormat === 'epub') {
        await loadEPUBBook();
      } else if (bookFormat === 'pdf') {
        await loadPDFBook();
      }
    } catch (err) {
      setError(`Failed to load book: ${err.message}`);
      console.error('Book loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // JSON Book Loader
  const loadJSONBook = async () => {
    const response = await fetch(bookUrl);
    const data = await response.json();
    setBook(data);
    setTotalPages(data.content?.length || 0);
  };

  // EPUB Book Loader
  const loadEPUBBook = async () => {
    // In a real implementation, you'd use epub.js library
    // npm install epubjs
    
    try {
      // Simulated EPUB loading - replace with actual epub.js implementation
      const mockEPUB = {
        title: "EPUB Book",
        author: "Author Name",
        content: [
          { chapter: 1, title: "Chapter 1", content: "EPUB content would be rendered here using epub.js library" }
        ],
        tableOfContents: [
          { chapter: 1, title: "Chapter 1", page: 0 }
        ]
      };
      
      setBook(mockEPUB);
      setTotalPages(mockEPUB.content.length);
      
      /* Real EPUB.js implementation would look like:
      const ePub = window.ePub || require('epubjs');
      const epubBook = ePub(bookUrl);
      epubRef.current = epubBook;
      
      const rendition = epubBook.renderTo(viewerRef.current, {
        width: '100%',
        height: '600px',
        spread: 'none'
      });
      
      await rendition.display();
      setRendition(rendition);
      
      const navigation = await epubBook.loaded.navigation;
      setBook({
        title: epubBook.packaging.metadata.title,
        author: epubBook.packaging.metadata.creator,
        tableOfContents: navigation.toc
      });
      */
    } catch (err) {
      throw new Error('EPUB loading failed. Install epubjs: npm install epubjs');
    }
  };

  // PDF Book Loader
  const loadPDFBook = async () => {
    // In a real implementation, you'd use react-pdf or pdf.js
    // npm install react-pdf pdfjs-dist
    
    try {
      // Simulated PDF loading - replace with actual PDF.js implementation
      const mockPDF = {
        title: "PDF Book",
        author: "Author Name",
        numPages: 10,
        currentPage: 1
      };
      
      setBook(mockPDF);
      setTotalPages(mockPDF.numPages);
      
      /* Real PDF.js implementation would look like:
      const pdfjsLib = window.pdfjsLib || require('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js`;
      
      const loadingTask = pdfjsLib.getDocument(bookUrl);
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      
      setTotalPages(pdf.numPages);
      setBook({
        title: 'PDF Document',
        author: 'Unknown',
        numPages: pdf.numPages
      });
      
      await renderPDFPage(1);
      */
    } catch (err) {
      throw new Error('PDF loading failed. Install react-pdf: npm install react-pdf pdfjs-dist');
    }
  };

  // Render PDF page (mock)
  const renderPDFPage = async (pageNum) => {
    // Real implementation would render PDF canvas here
    console.log(`Rendering PDF page ${pageNum}`);
  };

  // Load saved progress
  useEffect(() => {
    if (!bookId) return;
    
    const savedProgress = localStorage.getItem(`book-${bookId}-progress`);
    if (savedProgress) {
      setCurrentPage(parseInt(savedProgress));
    }

    const savedBookmarks = localStorage.getItem(`book-${bookId}-bookmarks`);
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }

    const savedTheme = localStorage.getItem('reader-theme');
    if (savedTheme) setTheme(savedTheme);

    const savedFontSize = localStorage.getItem('reader-fontSize');
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
  }, [bookId]);

  // Save progress
  useEffect(() => {
    if (!bookId || !totalPages) return;
    
    localStorage.setItem(`book-${bookId}-progress`, currentPage.toString());
    setProgress(((currentPage + 1) / totalPages) * 100);
    
    if (bookFormat === 'pdf') {
      renderPDFPage(currentPage + 1);
    }
  }, [currentPage, bookId, totalPages, bookFormat]);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('reader-theme', theme);
  }, [theme]);

  // Save font size preference
  useEffect(() => {
    localStorage.setItem('reader-fontSize', fontSize.toString());
  }, [fontSize]);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      
      if (bookFormat === 'epub' && rendition) {
        rendition.next();
      }
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      
      if (bookFormat === 'epub' && rendition) {
        rendition.prev();
      }
    }
  };

  const toggleBookmark = () => {
    const newBookmarks = bookmarks.includes(currentPage)
      ? bookmarks.filter(b => b !== currentPage)
      : [...bookmarks, currentPage];
    
    setBookmarks(newBookmarks);
    localStorage.setItem(`book-${bookId}-bookmarks`, JSON.stringify(newBookmarks));
  };

  const goToChapter = (page) => {
    setCurrentPage(page);
    setShowTOC(false);
    
    if (bookFormat === 'pdf') {
      renderPDFPage(page + 1);
    }
  };

  const zoomIn = () => {
    if (bookFormat === 'pdf') {
      setPdfScale(prev => Math.min(prev + 0.1, 2.0));
    }
  };

  const zoomOut = () => {
    if (bookFormat === 'pdf') {
      setPdfScale(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  const themes = {
    light: { bg: 'bg-white', text: 'text-gray-900', secondary: 'text-gray-600' },
    sepia: { bg: 'bg-amber-50', text: 'text-amber-900', secondary: 'text-amber-700' },
    dark: { bg: 'bg-gray-900', text: 'text-gray-100', secondary: 'text-gray-400' }
  };

  const currentTheme = themes[theme];

  const highlightSearch = (text) => {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-300">{part}</mark> : part
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-xl">Loading book...</p>
          <p className="text-sm mt-2 text-gray-500">Format: {bookFormat.toUpperCase()}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Error Loading Book</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadBook}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} transition-colors duration-300`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-opacity-95 backdrop-blur">
        <div className={`${currentTheme.bg} px-4 py-3`}>
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="font-semibold text-sm md:text-base">{book?.title || 'Book Title'}</h1>
                <p className={`text-xs ${currentTheme.secondary}`}>
                  {book?.author || 'Author'} • {bookFormat.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {bookFormat === 'pdf' && (
                <>
                  <button
                    onClick={zoomOut}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button
                    onClick={zoomIn}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </>
              )}
              {bookFormat === 'json' && (
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowTOC(!showTOC)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="max-w-6xl mx-auto mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      {showSearch && bookFormat === 'json' && (
        <div className={`${currentTheme.bg} border-b border-gray-200 dark:border-gray-700 px-4 py-3`}>
          <div className="max-w-6xl mx-auto">
            <input
              type="text"
              placeholder="Search in book..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${currentTheme.bg} ${currentTheme.text}`}
            />
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className={`${currentTheme.bg} border-b border-gray-200 dark:border-gray-700 px-4 py-4`}>
          <div className="max-w-6xl mx-auto space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${theme === 'light' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <Sun className="w-4 h-4" /> Light
                </button>
                <button
                  onClick={() => setTheme('sepia')}
                  className={`px-4 py-2 rounded-lg ${theme === 'sepia' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  Sepia
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <Moon className="w-4 h-4" /> Dark
                </button>
              </div>
            </div>

            {bookFormat === 'json' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="14"
                    max="28"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${currentTheme.bg} ${currentTheme.text}`}
                  >
                    <option value="serif">Serif</option>
                    <option value="sans-serif">Sans Serif</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Line Height: {lineHeight}
                  </label>
                  <input
                    type="range"
                    min="1.2"
                    max="2.5"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            )}

            {bookFormat === 'pdf' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Zoom: {Math.round(pdfScale * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={pdfScale}
                  onChange={(e) => setPdfScale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table of Contents */}
      {showTOC && book?.tableOfContents && (
        <div className={`${currentTheme.bg} border-b border-gray-200 dark:border-gray-700`}>
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Table of Contents</h2>
              <button onClick={() => setShowTOC(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {book.tableOfContents.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => goToChapter(item.page)}
                  className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
                    currentPage === item.page ? 'bg-blue-100 dark:bg-blue-900' : ''
                  }`}
                >
                  <div className="font-medium">{item.title}</div>
                  <div className={`text-sm ${currentTheme.secondary}`}>
                    Page {item.page + 1} of {totalPages}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* JSON Format Reader */}
        {bookFormat === 'json' && book?.content && (
          <div className="min-h-[60vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold">
                {book.content[currentPage]?.title}
              </h2>
              <button
                onClick={toggleBookmark}
                className={`p-2 rounded-lg transition ${
                  bookmarks.includes(currentPage)
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Bookmark
                  className="w-6 h-6"
                  fill={bookmarks.includes(currentPage) ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div
              className="prose prose-lg max-w-none"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily,
                lineHeight: lineHeight
              }}
            >
              {book.content[currentPage]?.content.split('\n\n').map((para, i) => (
                <p key={i} className="mb-4">
                  {highlightSearch(para)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* EPUB Format Reader */}
        {bookFormat === 'epub' && (
          <div className="min-h-[60vh]">
            <div ref={viewerRef} className="w-full h-full min-h-[600px] border border-gray-300 rounded-lg">
              {/* EPUB.js will render here */}
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4" />
                  <p>EPUB rendering requires epub.js library</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 block">
                    npm install epubjs
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF Format Reader */}
        {bookFormat === 'pdf' && (
          <div className="min-h-[60vh]">
            <div 
              ref={viewerRef} 
              className="w-full border border-gray-300 rounded-lg overflow-auto"
              style={{ transform: `scale(${pdfScale})`, transformOrigin: 'top left' }}
            >
              <canvas id="pdf-canvas" className="mx-auto"></canvas>
              {/* PDF.js will render here */}
              <div className="flex items-center justify-center min-h-[600px] text-gray-500">
                <div className="text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4" />
                  <p>PDF rendering requires PDF.js library</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 block">
                    npm install react-pdf pdfjs-dist
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
              currentPage === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden md:inline">Previous</span>
          </button>

          <div className={`text-sm ${currentTheme.secondary}`}>
            Page {currentPage + 1} of {totalPages}
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
              currentPage === totalPages - 1
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <span className="hidden md:inline">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmarks Info */}
        {bookmarks.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <div className="text-sm">
              <strong>Bookmarks:</strong> You have {bookmarks.length} bookmark(s) in this book
            </div>
          </div>
        )}
      </main>
    </div>
  );
};


// Reusable MultiBookReader component
// Accepts a books prop: array of { id, url, format, title, author }
const MultiBookReader = ({ books }) => {
  const [selectedBook, setSelectedBook] = useState(books?.[0] || null);

  if (!books || books.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No books available.</div>;
  }

  return (
    <div>
      {/* Book Selector */}
      <div className="p-4 bg-gray-100 border-b">
        <div className="max-w-6xl mx-auto flex gap-4 flex-wrap">
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                selectedBook?.id === book.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-blue-100'
              }`}
            >
              {book.title || `Book ${book.id}`} ({book.format?.toUpperCase()})
            </button>
          ))}
        </div>
      </div>

      {selectedBook && (
        <BookReader
          bookUrl={selectedBook.url}
          bookFormat={selectedBook.format}
          bookId={selectedBook.id}
        />
      )}
    </div>
  );
};

export default MultiBookReader;