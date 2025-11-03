import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Settings, Bookmark, Search, Sun, Moon, Type, Menu, X } from 'lucide-react';

// Mock book data - replace with your API data
const mockBook = {
  id: 1,
  title: "Sample Book Title",
  author: "John Doe",
  content: [
    {
      chapter: 1,
      title: "Chapter 1: The Beginning",
      content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`
    },
    {
      chapter: 2,
      title: "Chapter 2: The Journey",
      content: `Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.

Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.`
    },
    {
      chapter: 3,
      title: "Chapter 3: The Discovery",
      content: `At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.

Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.

Omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.`
    }
  ],
  tableOfContents: [
    { chapter: 1, title: "Chapter 1: The Beginning", page: 0 },
    { chapter: 2, title: "Chapter 2: The Journey", page: 1 },
    { chapter: 3, title: "Chapter 3: The Discovery", page: 2 }
  ]
};

const BookReader = () => {
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

  const book = mockBook;
  const totalPages = book.content.length;

  useEffect(() => {
    const savedProgress = localStorage.getItem(`book-${book.id}-progress`);
    if (savedProgress) {
      setCurrentPage(parseInt(savedProgress));
    }

    const savedBookmarks = localStorage.getItem(`book-${book.id}-bookmarks`);
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }

    const savedTheme = localStorage.getItem('reader-theme');
    if (savedTheme) setTheme(savedTheme);

    const savedFontSize = localStorage.getItem('reader-fontSize');
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
  }, [book.id]);

  useEffect(() => {
    localStorage.setItem(`book-${book.id}-progress`, currentPage.toString());
    setProgress(((currentPage + 1) / totalPages) * 100);
  }, [currentPage, book.id, totalPages]);

  useEffect(() => {
    localStorage.setItem('reader-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('reader-fontSize', fontSize.toString());
  }, [fontSize]);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const toggleBookmark = () => {
    const newBookmarks = bookmarks.includes(currentPage)
      ? bookmarks.filter(b => b !== currentPage)
      : [...bookmarks, currentPage];
    
    setBookmarks(newBookmarks);
    localStorage.setItem(`book-${book.id}-bookmarks`, JSON.stringify(newBookmarks));
  };

  const goToChapter = (page) => {
    setCurrentPage(page);
    setShowTOC(false);
  };

  const themes = {
    light: { bg: 'bg-white', text: 'text-gray-900', secondary: 'text-gray-600' },
    sepia: { bg: 'bg-amber-50', text: 'text-amber-900', secondary: 'text-amber-700' },
    dark: { bg: 'bg-gray-900', text: 'text-gray-100', secondary: 'text-gray-400' }
  };

  const currentTheme = themes[theme];

  const highlightSearch = (text) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-300">{part}</mark> : part
    );
  };

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} transition-colors duration-300`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-opacity-95 backdrop-blur">
        {/* go back */}
        <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition absolute left-4 top-4">
            <ChevronLeft className="w-6 h-6" />
        </button>
        <div className={`${currentTheme.bg} px-4 py-3`}>
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="font-semibold text-sm md:text-base">{book.title}</h1>
                <p className={`text-xs ${currentTheme.secondary}`}>{book.author}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <Search className="w-5 h-5" />
              </button>
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
          <div className="max-w-4xl mx-auto mt-2">
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
      {showSearch && (
        <div className={`${currentTheme.bg} border-b border-gray-200 dark:border-gray-700 px-4 py-3`}>
          <div className="max-w-4xl mx-auto">
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
          <div className="max-w-4xl mx-auto space-y-4">
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
          </div>
        </div>
      )}

      {/* Table of Contents */}
      {showTOC && (
        <div className={`${currentTheme.bg} border-b border-gray-200 dark:border-gray-700`}>
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Table of Contents</h2>
              <button onClick={() => setShowTOC(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {book.tableOfContents.map((item) => (
                <button
                  key={item.chapter}
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
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="min-h-[60vh]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">
              {book.content[currentPage].title}
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
            {highlightSearch(book.content[currentPage].content).split('\n\n').map((para, i) => (
              <p key={i} className="mb-4">
                {para}
              </p>
            ))}
          </div>
        </div>

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

export default BookReader;