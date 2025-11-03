import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Settings, Bookmark, Sun, Moon, X, List } from 'lucide-react';
import ePub from 'epubjs';

const EPUBReader = ({ bookUrl, bookId = '1' }) => {
  const [theme, setTheme] = useState('light');
  const [showSettings, setShowSettings] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [bookData, setBookData] = useState(null);
  const [fontSize, setFontSize] = useState(18);
  const [rendition, setRendition] = useState(null);
  const [toc, setToc] = useState([]);
  const [epubReady, setEpubReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  const viewerRef = useRef(null);
  const bookRef = useRef(null);

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('reader-theme');
    if (savedTheme) setTheme(savedTheme);

    const savedFontSize = localStorage.getItem('reader-fontSize');
    if (savedFontSize) setFontSize(parseInt(savedFontSize));

    const savedBookmarks = localStorage.getItem(`book-${bookId}-bookmarks`);
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
  }, [bookId]);

  // Save theme
  useEffect(() => {
    localStorage.setItem('reader-theme', theme);
  }, [theme]);

  // Save font size
  useEffect(() => {
    localStorage.setItem('reader-fontSize', fontSize.toString());
  }, [fontSize]);

  // Load EPUB book
  useEffect(() => {
    if (!bookUrl || !viewerRef.current) return;
    
    loadEPUBBook();

    return () => {
      if (rendition) {
        rendition.destroy();
      }
    };
  }, [bookUrl, viewerRef.current]);

  // Apply EPUB theme and font size
  useEffect(() => {
    if (rendition && epubReady) {
      const themes = {
        light: { body: { background: '#ffffff', color: '#000000' } },
        sepia: { body: { background: '#fef9f0', color: '#5c4a2e' } },
        dark: { body: { background: '#1a1a1a', color: '#e5e5e5' } }
      };
      
      rendition.themes.register('light', themes.light);
      rendition.themes.register('sepia', themes.sepia);
      rendition.themes.register('dark', themes.dark);
      rendition.themes.select(theme);
      
      // Apply font size
      rendition.themes.fontSize(`${fontSize}px`);
    }
  }, [theme, fontSize, rendition, epubReady]);

  const loadEPUBBook = async () => {
    try {
      setLoading(true);
      setError(null);

      const book = ePub(bookUrl);
      bookRef.current = book;

      const renditionInstance = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none',
        snap: true
      });

      setRendition(renditionInstance);

      // Load saved location
      const savedLocation = localStorage.getItem(`book-${bookId}-location`);
      if (savedLocation) {
        await renditionInstance.display(savedLocation);
      } else {
        await renditionInstance.display();
      }

      setEpubReady(true);

      // Get table of contents
      book.loaded.navigation.then((nav) => {
        setToc(nav.toc);
      });

      // Get book metadata
      book.loaded.metadata.then((metadata) => {
        setBookData({
          title: metadata.title,
          author: metadata.creator,
          publisher: metadata.publisher
        });
      });

      // Track location changes
      renditionInstance.on('relocated', (location) => {
        setCurrentLocation(location.start.cfi);
        const percent = book.locations.percentageFromCfi(location.start.cfi);
        setProgress(percent * 100);
        localStorage.setItem(`book-${bookId}-location`, location.start.cfi);
      });

      // Generate locations for progress tracking
      book.ready.then(() => {
        return book.locations.generate(1024);
      });

      setLoading(false);
    } catch (err) {
      console.error('EPUB loading error:', err);
      setError(`Failed to load EPUB: ${err.message}`);
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (rendition) {
      rendition.next();
    }
  };

  const handlePrev = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  const toggleBookmark = () => {
    if (!currentLocation) return;
    
    const newBookmarks = bookmarks.some(b => b.cfi === currentLocation)
      ? bookmarks.filter(b => b.cfi !== currentLocation)
      : [...bookmarks, { cfi: currentLocation, progress: Math.round(progress) }];
    
    setBookmarks(newBookmarks);
    localStorage.setItem(`book-${bookId}-bookmarks`, JSON.stringify(newBookmarks));
  };

  const isBookmarked = () => {
    return currentLocation && bookmarks.some(b => b.cfi === currentLocation);
  };

  const goToBookmark = (cfi) => {
    if (rendition) {
      rendition.display(cfi);
      setShowSettings(false);
    }
  };

  const goToTOCItem = (href) => {
    if (rendition) {
      rendition.display(href);
      setShowTOC(false);
    }
  };

  const themes = {
    light: { bg: 'bg-white', text: 'text-gray-900', secondary: 'text-gray-600', border: 'border-gray-200' },
    sepia: { bg: 'bg-amber-50', text: 'text-amber-900', secondary: 'text-amber-700', border: 'border-amber-200' },
    dark: { bg: 'bg-gray-900', text: 'text-gray-100', secondary: 'text-gray-400', border: 'border-gray-700' }
  };

  const currentTheme = themes[theme];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [rendition]);

  if (loading) {
    return (
      <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-xl">Loading EPUB book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Error Loading Book</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} transition-colors duration-300`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b ${currentTheme.border} backdrop-blur bg-opacity-95`}>
        <div className={`${currentTheme.bg} px-4 py-3`}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="font-semibold text-sm md:text-base">
                  {bookData?.title || 'Loading...'}
                </h1>
                <p className={`text-xs ${currentTheme.secondary}`}>
                  {bookData?.author || 'Author'} • EPUB
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleBookmark}
                className={`p-2 rounded-lg transition ${
                  isBookmarked() ? 'text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={isBookmarked() ? 'Remove bookmark' : 'Add bookmark'}
              >
                <Bookmark className="w-5 h-5" fill={isBookmarked() ? 'currentColor' : 'none'} />
              </button>

              {toc.length > 0 && (
                <button
                  onClick={() => setShowTOC(!showTOC)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Table of contents"
                >
                  <List className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="max-w-7xl mx-auto mt-2">
            <div className={`w-full ${currentTheme.bg} rounded-full h-1.5 border ${currentTheme.border}`}>
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={`text-xs text-center mt-1 ${currentTheme.secondary}`}>
              {Math.round(progress)}% complete
            </p>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`${currentTheme.bg} border-b ${currentTheme.border} px-4 py-4`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Reader Settings</h3>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                      theme === 'light' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Sun className="w-4 h-4" /> Light
                  </button>
                  <button
                    onClick={() => setTheme('sepia')}
                    className={`px-4 py-2 rounded-lg transition ${
                      theme === 'sepia' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    Sepia
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                      theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
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
                  max="32"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Bookmarks Section */}
            {bookmarks.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">
                  Bookmarks ({bookmarks.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bookmarks.map((bookmark, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToBookmark(bookmark.cfi)}
                      className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-between`}
                    >
                      <span>Bookmark {idx + 1}</span>
                      <span className={`text-xs ${currentTheme.secondary}`}>
                        {bookmark.progress}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table of Contents */}
      {showTOC && (
        <div className={`${currentTheme.bg} border-b ${currentTheme.border}`}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Table of Contents</h3>
              <button onClick={() => setShowTOC(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {toc.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => goToTOCItem(item.href)}
                  className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main EPUB Reader */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div 
          ref={viewerRef}
          className="mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm"
          style={{ 
            height: 'calc(100vh - 250px)',
            maxWidth: '900px',
            minHeight: '400px'
          }}
        />

        {/* Navigation Controls */}
        <div className={`flex items-center justify-between mt-8 pt-6 border-t ${currentTheme.border}`}>
          <button
            onClick={handlePrev}
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className={`text-sm ${currentTheme.secondary}`}>
            {Math.round(progress)}% complete
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default EPUBReader;

// import React, { useState, useEffect, useRef } from 'react';
// import { ChevronLeft, ChevronRight, BookOpen, Settings, Bookmark, Sun, Moon, X, List } from 'lucide-react';
// import ePub from 'epubjs';

// const EPUBReader = ({ bookUrl, bookId = '1' }) => {
//   const [theme, setTheme] = useState('light');
//   const [showSettings, setShowSettings] = useState(false);
//   const [showTOC, setShowTOC] = useState(false);
//   const [bookmarks, setBookmarks] = useState([]);
//   const [progress, setProgress] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   const [bookData, setBookData] = useState(null);
//   const [fontSize, setFontSize] = useState(18);
//   const [rendition, setRendition] = useState(null);
//   const [toc, setToc] = useState([]);
//   const [epubReady, setEpubReady] = useState(false);
//   const [currentLocation, setCurrentLocation] = useState(null);
  
//   const viewerRef = useRef(null);
//   const bookRef = useRef(null);

//   // Load saved preferences
//   useEffect(() => {
//     const savedTheme = localStorage.getItem('reader-theme');
//     if (savedTheme) setTheme(savedTheme);

//     const savedFontSize = localStorage.getItem('reader-fontSize');
//     if (savedFontSize) setFontSize(parseInt(savedFontSize));

//     const savedBookmarks = localStorage.getItem(`book-${bookId}-bookmarks`);
//     if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
//   }, [bookId]);

//   // Save theme
//   useEffect(() => {
//     localStorage.setItem('reader-theme', theme);
//   }, [theme]);

//   // Save font size
//   useEffect(() => {
//     localStorage.setItem('reader-fontSize', fontSize.toString());
//   }, [fontSize]);

//   // Load EPUB book
//   useEffect(() => {
//     if (!bookUrl) return;
    
//     loadEPUBBook();

//     return () => {
//       if (rendition) {
//         rendition.destroy();
//       }
//     };
//   }, [bookUrl]);

//   // Apply EPUB theme and font size
//   useEffect(() => {
//     if (rendition && epubReady) {
//       const themes = {
//         light: { body: { background: '#ffffff', color: '#000000' } },
//         sepia: { body: { background: '#fef9f0', color: '#5c4a2e' } },
//         dark: { body: { background: '#1a1a1a', color: '#e5e5e5' } }
//       };
      
//       rendition.themes.register('light', themes.light);
//       rendition.themes.register('sepia', themes.sepia);
//       rendition.themes.register('dark', themes.dark);
//       rendition.themes.select(theme);
      
//       // Apply font size
//       rendition.themes.fontSize(`${fontSize}px`);
//     }
//   }, [theme, fontSize, rendition, epubReady]);

//   const loadEPUBBook = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // if (!viewerRef.current) {
//       //   // Wait for the ref to be attached
//       //   setTimeout(loadEPUBBook, 50);
//       //   return;
//       // }

//       const book = ePub(bookUrl);
//       console.log(book, "response from epub")
//       bookRef.current = book;

//       const renditionInstance = book?.renderTo(viewerRef.current, {
//         width: '100%',
//         height: '100%',
//         spread: 'none',
//         snap: true
//       });

//       setRendition(renditionInstance);

//       // Load saved location
//       const savedLocation = localStorage.getItem(`book-${bookId}-location`);
//       if (savedLocation) {
//         await renditionInstance.display(savedLocation);
//       } else {
//         await renditionInstance.display();
//       }

//       setEpubReady(true);

//       // Get table of contents
//       book.loaded.navigation.then((nav) => {
//         setToc(nav.toc);
//       });

//       // Get book metadata
//       book.loaded.metadata.then((metadata) => {
//         setBookData({
//           title: metadata.title,
//           author: metadata.creator,
//           publisher: metadata.publisher
//         });
//       });

//       // Track location changes
//       renditionInstance.on('relocated', (location) => {
//         setCurrentLocation(location.start.cfi);
//         const percent = book.locations.percentageFromCfi(location.start.cfi);
//         setProgress(percent * 100);
//         localStorage.setItem(`book-${bookId}-location`, location.start.cfi);
//       });

//       // Generate locations for progress tracking
//       book.ready.then(() => {
//         return book.locations.generate(1024);
//       });

//       setLoading(false);
//     } catch (err) {
//       console.error('EPUB loading error:', err);
//       setError(`Failed to load EPUB: ${err.message}`);
//       setLoading(false);
//     }
//   };

//   // Navigation handlers
//   const handleNext = () => {
//     if (rendition) {
//       rendition.next();
//     }
//   };

//   const handlePrev = () => {
//     if (rendition) {
//       rendition.prev();
//     }
//   };

//   const toggleBookmark = () => {
//     if (!currentLocation) return;
    
//     const newBookmarks = bookmarks.some(b => b.cfi === currentLocation)
//       ? bookmarks.filter(b => b.cfi !== currentLocation)
//       : [...bookmarks, { cfi: currentLocation, progress: Math.round(progress) }];
    
//     setBookmarks(newBookmarks);
//     localStorage.setItem(`book-${bookId}-bookmarks`, JSON.stringify(newBookmarks));
//   };

//   const isBookmarked = () => {
//     return currentLocation && bookmarks.some(b => b.cfi === currentLocation);
//   };

//   const goToBookmark = (cfi) => {
//     if (rendition) {
//       rendition.display(cfi);
//       setShowSettings(false);
//     }
//   };

//   const goToTOCItem = (href) => {
//     if (rendition) {
//       rendition.display(href);
//       setShowTOC(false);
//     }
//   };

//   const themes = {
//     light: { bg: 'bg-white', text: 'text-gray-900', secondary: 'text-gray-600', border: 'border-gray-200' },
//     sepia: { bg: 'bg-amber-50', text: 'text-amber-900', secondary: 'text-amber-700', border: 'border-amber-200' },
//     dark: { bg: 'bg-gray-900', text: 'text-gray-100', secondary: 'text-gray-400', border: 'border-gray-700' }
//   };

//   const currentTheme = themes[theme];

//   // Keyboard navigation
//   useEffect(() => {
//     const handleKeyPress = (e) => {
//       if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
//         handleNext();
//       } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
//         handlePrev();
//       }
//     };

//     window.addEventListener('keydown', handleKeyPress);
//     return () => window?.removeEventListener('keydown', handleKeyPress);
//   }, [rendition]);

//   if (loading) {
//     return (
//       <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
//         <div className="text-center">
//           <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse" />
//           <p className="text-xl animate-pulse">Loading EPUB book...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
//         <div className="text-center max-w-md p-6">
//           <div className="text-red-500 text-6xl mb-4">⚠️</div>
//           <h2 className="text-2xl font-bold mb-2">Error Loading Book</h2>
//           <p className="text-gray-600 mb-4">{error}</p>
//           <button
//             onClick={() => window.location.reload()}
//             className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//           >
//             Retry
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} transition-colors duration-300`}>
//       {/* Header */}
//       <header className={`sticky top-0 z-50 border-b ${currentTheme.border} backdrop-blur bg-opacity-95`}>
//         <div className={`${currentTheme.bg} px-4 py-3`}>
//           <div className="flex items-center justify-between max-w-7xl mx-auto">
//             <div className="flex items-center gap-3">
//               <BookOpen className="w-6 h-6" />
//               <div>
//                 <h1 className="font-semibold text-sm md:text-base">
//                   {bookData?.title || 'Loading...'}
//                 </h1>
//                 <p className={`text-xs ${currentTheme.secondary}`}>
//                   {bookData?.author || 'Author'} • EPUB
//                 </p>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={toggleBookmark}
//                 className={`p-2 rounded-lg transition ${
//                   isBookmarked() ? 'text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
//                 }`}
//                 title={isBookmarked() ? 'Remove bookmark' : 'Add bookmark'}
//               >
//                 <Bookmark className="w-5 h-5" fill={isBookmarked() ? 'currentColor' : 'none'} />
//               </button>

//               {toc.length > 0 && (
//                 <button
//                   onClick={() => setShowTOC(!showTOC)}
//                   className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
//                   title="Table of contents"
//                 >
//                   <List className="w-5 h-5" />
//                 </button>
//               )}

//               <button
//                 onClick={() => setShowSettings(!showSettings)}
//                 className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
//                 title="Settings"
//               >
//                 <Settings className="w-5 h-5" />
//               </button>
//             </div>
//           </div>

//           {/* Progress Bar */}
//           <div className="max-w-7xl mx-auto mt-2">
//             <div className={`w-full ${currentTheme.bg} rounded-full h-1.5 border ${currentTheme.border}`}>
//               <div
//                 className="bg-blue-600 h-full rounded-full transition-all duration-300"
//                 style={{ width: `${progress}%` }}
//               />
//             </div>
//             <p className={`text-xs text-center mt-1 ${currentTheme.secondary}`}>
//               {Math.round(progress)}% complete
//             </p>
//           </div>
//         </div>
//       </header>

//       {/* Settings Panel */}
//       {showSettings && (
//         <div className={`${currentTheme.bg} border-b ${currentTheme.border} px-4 py-4`}>
//           <div className="max-w-7xl mx-auto">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="font-semibold">Reader Settings</h3>
//               <button onClick={() => setShowSettings(false)}>
//                 <X className="w-5 h-5" />
//               </button>
//             </div>
            
//             <div className="grid md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium mb-2">Theme</label>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => setTheme('light')}
//                     className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
//                       theme === 'light' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
//                     }`}
//                   >
//                     <Sun className="w-4 h-4" /> Light
//                   </button>
//                   <button
//                     onClick={() => setTheme('sepia')}
//                     className={`px-4 py-2 rounded-lg transition ${
//                       theme === 'sepia' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
//                     }`}
//                   >
//                     Sepia
//                   </button>
//                   <button
//                     onClick={() => setTheme('dark')}
//                     className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
//                       theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
//                     }`}
//                   >
//                     <Moon className="w-4 h-4" /> Dark
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-2">
//                   Font Size: {fontSize}px
//                 </label>
//                 <input
//                   type="range"
//                   min="14"
//                   max="32"
//                   value={fontSize}
//                   onChange={(e) => setFontSize(parseInt(e.target.value))}
//                   className="w-full"
//                 />
//               </div>
//             </div>

//             {/* Bookmarks Section */}
//             {bookmarks.length > 0 && (
//               <div className="mt-6">
//                 <h4 className="text-sm font-medium mb-3">
//                   Bookmarks ({bookmarks.length})
//                 </h4>
//                 <div className="space-y-2 max-h-48 overflow-y-auto">
//                   {bookmarks.map((bookmark, idx) => (
//                     <button
//                       key={idx}
//                       onClick={() => goToBookmark(bookmark.cfi)}
//                       className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-between`}
//                     >
//                       <span>Bookmark {idx + 1}</span>
//                       <span className={`text-xs ${currentTheme.secondary}`}>
//                         {bookmark.progress}%
//                       </span>
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Table of Contents */}
//       {showTOC && (
//         <div className={`${currentTheme.bg} border-b ${currentTheme.border}`}>
//           <div className="max-w-7xl mx-auto px-4 py-4">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="font-semibold">Table of Contents</h3>
//               <button onClick={() => setShowTOC(false)}>
//                 <X className="w-5 h-5" />
//               </button>
//             </div>
//             <div className="space-y-2 max-h-96 overflow-y-auto">
//               {toc.map((item, idx) => (
//                 <button
//                   key={idx}
//                   onClick={() => goToTOCItem(item.href)}
//                   className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
//                 >
//                   {item.label}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Main EPUB Reader */}
//       <main className="max-w-7xl mx-auto px-4 py-6">
//         <div 
//           ref={viewerRef}
//           className="mx-auto"
//           style={{ 
//             height: 'calc(100vh - 250px)',
//             maxWidth: '900px'
//           }}
//         />

//         {/* Navigation Controls */}
//         <div className={`flex items-center justify-between mt-8 pt-6 border-t ${currentTheme.border}`}>
//           <button
//             onClick={handlePrev}
//             className="flex items-center gap-2 px-6 py-3 rounded-lg transition hover:bg-gray-200 dark:hover:bg-gray-800"
//           >
//             <ChevronLeft className="w-5 h-5" />
//             <span className="hidden sm:inline">Previous</span>
//           </button>

//           <div className={`text-sm ${currentTheme.secondary}`}>
//             {Math.round(progress)}% complete
//           </div>

//           <button
//             onClick={handleNext}
//             className="flex items-center gap-2 px-6 py-3 rounded-lg transition hover:bg-gray-200 dark:hover:bg-gray-800"
//           >
//             <span className="hidden sm:inline">Next</span>
//             <ChevronRight className="w-5 h-5" />
//           </button>
//         </div>
//       </main>
//     </div>
//   );
// };

// export default EPUBReader;

// import React, { useState, useEffect, useRef } from 'react';
// import { ChevronLeft, ChevronRight, BookOpen, Settings, Bookmark, Sun, Moon, Menu, X, ZoomIn, ZoomOut, List } from 'lucide-react';
// import ePub from 'epubjs';
// import { Document, Page, pdfjs } from 'react-pdf';
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// import 'react-pdf/dist/Page/TextLayer.css';

// // Set up PDF.js worker
// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// const MyBookReader = ({ bookUrl, bookFormat = 'json', bookId = '1' }) => {
//   const [theme, setTheme] = useState('light');
//   const [showSettings, setShowSettings] = useState(false);
//   const [showTOC, setShowTOC] = useState(false);
//   const [bookmarks, setBookmarks] = useState([]);
//   const [progress, setProgress] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   // Common states
//   const [bookData, setBookData] = useState(null);
//   const [currentLocation, setCurrentLocation] = useState(0);
  
//   // JSON-specific states
//   const [fontSize, setFontSize] = useState(18);
//   const [fontFamily, setFontFamily] = useState('serif');
//   const [lineHeight, setLineHeight] = useState(1.8);
  
//   // PDF-specific states
//   const [numPages, setNumPages] = useState(null);
//   const [pageNumber, setPageNumber] = useState(1);
//   const [pdfScale, setPdfScale] = useState(1.2);
  
//   // EPUB-specific states
//   const [rendition, setRendition] = useState(null);
//   const [toc, setToc] = useState([]);
//   const [epubReady, setEpubReady] = useState(false);
  
//   const viewerRef = useRef(null);
//   const bookRef = useRef(null);

//   // Load saved preferences
//   useEffect(() => {
//     const savedTheme = localStorage.getItem('reader-theme');
//     if (savedTheme) setTheme(savedTheme);

//     const savedFontSize = localStorage.getItem('reader-fontSize');
//     if (savedFontSize) setFontSize(parseInt(savedFontSize));

//     const savedBookmarks = localStorage.getItem(`book-${bookId}-bookmarks`);
//     if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
//   }, [bookId]);

//   // Save theme
//   useEffect(() => {
//     localStorage.setItem('reader-theme', theme);
//   }, [theme]);

//   // Save font size
//   useEffect(() => {
//     localStorage.setItem('reader-fontSize', fontSize.toString());
//   }, [fontSize]);

//   // Load book based on format
//   useEffect(() => {
//     if (!bookUrl) return;
    
//     setLoading(true);
//     setError(null);

//     if (bookFormat === 'epub') {
//       loadEPUBBook();
//     } else if (bookFormat === 'json') {
//       loadJSONBook();
//     }
//     // PDF loading is handled by react-pdf component
//     else if (bookFormat === 'pdf') {
//       setLoading(false);
//     }

//     return () => {
//       if (rendition) {
//         rendition.destroy();
//       }
//     };
//   }, [bookUrl, bookFormat]);

//   // Apply EPUB theme
//   useEffect(() => {
//     if (rendition && epubReady) {
//       const themes = {
//         light: { body: { background: '#ffffff', color: '#000000' } },
//         sepia: { body: { background: '#fef9f0', color: '#5c4a2e' } },
//         dark: { body: { background: '#1a1a1a', color: '#e5e5e5' } }
//       };
      
//       rendition.themes.register('light', themes.light);
//       rendition.themes.register('sepia', themes.sepia);
//       rendition.themes.register('dark', themes.dark);
//       rendition.themes.select(theme);
      
//       // Apply font size
//       rendition.themes.fontSize(`${fontSize}px`);
//     }
//   }, [theme, fontSize, rendition, epubReady]);

//   const loadJSONBook = async () => {
//     try {
//       const response = await fetch(bookUrl);
//       if (!response.ok) throw new Error('Failed to load book');
//       const data = await response.json();
//       setBookData(data);
      
//       const savedProgress = localStorage.getItem(`book-${bookId}-progress`);
//       if (savedProgress) {
//         setCurrentLocation(parseInt(savedProgress));
//       }
      
//       setLoading(false);
//     } catch (err) {
//       setError(err.message);
//       setLoading(false);
//     }
//   };

//   const loadEPUBBook = async () => {
//     try {
//       const book = ePub(bookUrl);
//       bookRef.current = book;

//       const renditionInstance = book.renderTo(viewerRef.current, {
//         width: '100%',
//         height: '100%',
//         spread: 'none',
//         snap: true
//       });

//       setRendition(renditionInstance);

//       // Load saved location
//       const savedLocation = localStorage.getItem(`book-${bookId}-location`);
//       if (savedLocation) {
//         await renditionInstance.display(savedLocation);
//       } else {
//         await renditionInstance.display();
//       }

//       setEpubReady(true);

//       // Get table of contents
//       book.loaded.navigation.then((nav) => {
//         setToc(nav.toc);
//       });

//       // Get book metadata
//       book.loaded.metadata.then((metadata) => {
//         setBookData({
//           title: metadata.title,
//           author: metadata.creator,
//           publisher: metadata.publisher
//         });
//       });

//       // Track location changes
//       renditionInstance.on('relocated', (location) => {
//         const percent = book.locations.percentageFromCfi(location.start.cfi);
//         setProgress(percent * 100);
//         localStorage.setItem(`book-${bookId}-location`, location.start.cfi);
//       });

//       // Generate locations for progress tracking
//       book.ready.then(() => {
//         return book.locations.generate(1024);
//       });

//       setLoading(false);
//     } catch (err) {
//       setError(`EPUB Error: ${err.message}`);
//       setLoading(false);
//     }
//   };

//   // Navigation handlers
//   const handleNext = () => {
//     if (bookFormat === 'json') {
//       if (currentLocation < bookData.content.length - 1) {
//         const newLocation = currentLocation + 1;
//         setCurrentLocation(newLocation);
//         localStorage.setItem(`book-${bookId}-progress`, newLocation.toString());
//         setProgress(((newLocation + 1) / bookData.content.length) * 100);
//       }
//     } else if (bookFormat === 'epub' && rendition) {
//       rendition.next();
//     } else if (bookFormat === 'pdf') {
//       if (pageNumber < numPages) {
//         setPageNumber(pageNumber + 1);
//         localStorage.setItem(`book-${bookId}-page`, (pageNumber + 1).toString());
//         setProgress(((pageNumber + 1) / numPages) * 100);
//       }
//     }
//   };

//   const handlePrev = () => {
//     if (bookFormat === 'json') {
//       if (currentLocation > 0) {
//         const newLocation = currentLocation - 1;
//         setCurrentLocation(newLocation);
//         localStorage.setItem(`book-${bookId}-progress`, newLocation.toString());
//         setProgress(((newLocation + 1) / bookData.content.length) * 100);
//       }
//     } else if (bookFormat === 'epub' && rendition) {
//       rendition.prev();
//     } else if (bookFormat === 'pdf') {
//       if (pageNumber > 1) {
//         setPageNumber(pageNumber - 1);
//         localStorage.setItem(`book-${bookId}-page`, (pageNumber - 1).toString());
//         setProgress(((pageNumber - 1) / numPages) * 100);
//       }
//     }
//   };

//   const canGoNext = () => {
//     if (bookFormat === 'json') return currentLocation < bookData?.content.length - 1;
//     if (bookFormat === 'pdf') return pageNumber < numPages;
//     return true; // EPUB doesn't have clear end
//   };

//   const canGoPrev = () => {
//     if (bookFormat === 'json') return currentLocation > 0;
//     if (bookFormat === 'pdf') return pageNumber > 1;
//     return true; // EPUB doesn't have clear start
//   };

//   const toggleBookmark = () => {
//     const location = bookFormat === 'pdf' ? pageNumber : currentLocation;
//     const newBookmarks = bookmarks.includes(location)
//       ? bookmarks.filter(b => b !== location)
//       : [...bookmarks, location];
    
//     setBookmarks(newBookmarks);
//     localStorage.setItem(`book-${bookId}-bookmarks`, JSON.stringify(newBookmarks));
//   };

//   const isBookmarked = () => {
//     const location = bookFormat === 'pdf' ? pageNumber : currentLocation;
//     return bookmarks.includes(location);
//   };

//   const goToTOCItem = (href) => {
//     if (bookFormat === 'epub' && rendition) {
//       rendition.display(href);
//       setShowTOC(false);
//     } else if (bookFormat === 'json') {
//       const item = bookData.tableOfContents.find(t => t.href === href);
//       if (item) {
//         setCurrentLocation(item.page);
//         setShowTOC(false);
//       }
//     }
//   };

//   const onPDFLoadSuccess = ({ numPages }) => {
//     setNumPages(numPages);
//     const savedPage = localStorage.getItem(`book-${bookId}-page`);
//     if (savedPage) {
//       setPageNumber(parseInt(savedPage));
//     }
//     setLoading(false);
//   };

//   const themes = {
//     light: { bg: 'bg-white', text: 'text-gray-900', secondary: 'text-gray-600', border: 'border-gray-200' },
//     sepia: { bg: 'bg-amber-50', text: 'text-amber-900', secondary: 'text-amber-700', border: 'border-amber-200' },
//     dark: { bg: 'bg-gray-900', text: 'text-gray-100', secondary: 'text-gray-400', border: 'border-gray-700' }
//   };

//   const currentTheme = themes[theme];

//   // Keyboard navigation
//   useEffect(() => {
//     const handleKeyPress = (e) => {
//       if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
//         handleNext();
//       } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
//         handlePrev();
//       }
//     };

//     window.addEventListener('keydown', handleKeyPress);
//     return () => window.removeEventListener('keydown', handleKeyPress);
//   }, [bookFormat, currentLocation, pageNumber, rendition]);

//   if (loading) {
//     return (
//       <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
//         <div className="text-center">
//           <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse" />
//           <p className="text-xl">Loading {bookFormat.toUpperCase()} book...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center`}>
//         <div className="text-center max-w-md p-6">
//           <div className="text-red-500 text-6xl mb-4">⚠️</div>
//           <h2 className="text-2xl font-bold mb-2">Error Loading Book</h2>
//           <p className="text-gray-600 mb-4">{error}</p>
//           <button
//             onClick={() => window.location.reload()}
//             className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//           >
//             Retry
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} transition-colors duration-300`}>
//       {/* Header */}
//       <header className={`sticky top-0 z-50 border-b ${currentTheme.border} backdrop-blur bg-opacity-95`}>
//         <div className={`${currentTheme.bg} px-4 py-3`}>
//           <div className="flex items-center justify-between max-w-7xl mx-auto">
//             <div className="flex items-center gap-3">
//               <BookOpen className="w-6 h-6" />
//               <div>
//                 <h1 className="font-semibold text-sm md:text-base">
//                   {bookData?.title || 'Loading...'}
//                 </h1>
//                 <p className={`text-xs ${currentTheme.secondary}`}>
//                   {bookData?.author || 'Author'} • {bookFormat.toUpperCase()}
//                 </p>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={toggleBookmark}
//                 className={`p-2 rounded-lg transition ${
//                   isBookmarked() ? 'text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
//                 }`}
//                 title={isBookmarked() ? 'Remove bookmark' : 'Add bookmark'}
//               >
//                 <Bookmark className="w-5 h-5" fill={isBookmarked() ? 'currentColor' : 'none'} />
//               </button>

//               {bookFormat === 'pdf' && (
//                 <>
//                   <button
//                     onClick={() => setPdfScale(Math.max(pdfScale - 0.1, 0.5))}
//                     className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
//                     title="Zoom out"
//                   >
//                     <ZoomOut className="w-5 h-5" />
//                   </button>
//                   <span className="text-xs">{Math.round(pdfScale * 100)}%</span>
//                   <button
//                     onClick={() => setPdfScale(Math.min(pdfScale + 0.1, 3.0))}
//                     className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
//                     title="Zoom in"
//                   >
//                     <ZoomIn className="w-5 h-5" />
//                   </button>
//                 </>
//               )}

//               {(toc.length > 0 || bookData?.tableOfContents) && (
//                 <button
//                   onClick={() => setShowTOC(!showTOC)}
//                   className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
//                   title="Table of contents"
//                 >
//                   <List className="w-5 h-5" />
//                 </button>
//               )}

//               <button
//                 onClick={() => setShowSettings(!showSettings)}
//                 className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
//                 title="Settings"
//               >
//                 <Settings className="w-5 h-5" />
//               </button>
//             </div>
//           </div>

//           {/* Progress Bar */}
//           <div className="max-w-7xl mx-auto mt-2">
//             <div className={`w-full ${currentTheme.bg} rounded-full h-1.5 border ${currentTheme.border}`}>
//               <div
//                 className="bg-blue-600 h-full rounded-full transition-all duration-300"
//                 style={{ width: `${progress}%` }}
//               />
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Settings Panel */}
//       {showSettings && (
//         <div className={`${currentTheme.bg} border-b ${currentTheme.border} px-4 py-4`}>
//           <div className="max-w-7xl mx-auto">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="font-semibold">Reader Settings</h3>
//               <button onClick={() => setShowSettings(false)}>
//                 <X className="w-5 h-5" />
//               </button>
//             </div>
            
//             <div className="grid md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-2">Theme</label>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => setTheme('light')}
//                     className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
//                       theme === 'light' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
//                     }`}
//                   >
//                     <Sun className="w-4 h-4" /> Light
//                   </button>
//                   <button
//                     onClick={() => setTheme('sepia')}
//                     className={`px-4 py-2 rounded-lg transition ${
//                       theme === 'sepia' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
//                     }`}
//                   >
//                     Sepia
//                   </button>
//                   <button
//                     onClick={() => setTheme('dark')}
//                     className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
//                       theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
//                     }`}
//                   >
//                     <Moon className="w-4 h-4" /> Dark
//                   </button>
//                 </div>
//               </div>

//               {bookFormat !== 'pdf' && (
//                 <div>
//                   <label className="block text-sm font-medium mb-2">
//                     Font Size: {fontSize}px
//                   </label>
//                   <input
//                     type="range"
//                     min="14"
//                     max="32"
//                     value={fontSize}
//                     onChange={(e) => setFontSize(parseInt(e.target.value))}
//                     className="w-full"
//                   />
//                 </div>
//               )}

//               {bookFormat === 'json' && (
//                 <>
//                   <div>
//                     <label className="block text-sm font-medium mb-2">Font Family</label>
//                     <select
//                       value={fontFamily}
//                       onChange={(e) => setFontFamily(e.target.value)}
//                       className={`w-full px-4 py-2 rounded-lg border ${currentTheme.bg} ${currentTheme.text}`}
//                     >
//                       <option value="serif">Serif</option>
//                       <option value="sans-serif">Sans Serif</option>
//                       <option value="monospace">Monospace</option>
//                     </select>
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium mb-2">
//                       Line Height: {lineHeight.toFixed(1)}
//                     </label>
//                     <input
//                       type="range"
//                       min="1.2"
//                       max="2.5"
//                       step="0.1"
//                       value={lineHeight}
//                       onChange={(e) => setLineHeight(parseFloat(e.target.value))}
//                       className="w-full"
//                     />
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Table of Contents */}
//       {showTOC && (
//         <div className={`${currentTheme.bg} border-b ${currentTheme.border}`}>
//           <div className="max-w-7xl mx-auto px-4 py-4">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="font-semibold">Table of Contents</h3>
//               <button onClick={() => setShowTOC(false)}>
//                 <X className="w-5 h-5" />
//               </button>
//             </div>
//             <div className="space-y-2 max-h-96 overflow-y-auto">
//               {bookFormat === 'epub' && toc.map((item, idx) => (
//                 <button
//                   key={idx}
//                   onClick={() => goToTOCItem(item.href)}
//                   className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
//                 >
//                   {item.label}
//                 </button>
//               ))}
              
//               {bookFormat === 'json' && bookData?.tableOfContents?.map((item, idx) => (
//                 <button
//                   key={idx}
//                   onClick={() => goToTOCItem(item.href)}
//                   className={`w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
//                     currentLocation === item.page ? 'bg-blue-100 dark:bg-blue-900' : ''
//                   }`}
//                 >
//                   {item.title}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Main Content Area */}
//       <main className="max-w-7xl mx-auto px-4 py-6">
//         {/* JSON Reader */}
//         {bookFormat === 'json' && bookData?.content && (
//           <div className="max-w-4xl mx-auto">
//             <h2 className="text-2xl font-bold mb-6">
//               {bookData.content[currentLocation]?.title}
//             </h2>
//             <div
//               className="prose prose-lg max-w-none"
//               style={{
//                 fontSize: `${fontSize}px`,
//                 fontFamily: fontFamily,
//                 lineHeight: lineHeight
//               }}
//             >
//               {bookData.content[currentLocation]?.content.split('\n\n').map((para, i) => (
//                 <p key={i} className="mb-4">{para}</p>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* EPUB Reader */}
//         {bookFormat === 'epub' && (
//           <div 
//             ref={viewerRef}
//             className="mx-auto"
//             style={{ 
//               height: 'calc(100vh - 250px)',
//               maxWidth: '900px'
//             }}
//           />
//         )}

//         {/* PDF Reader */}
//         {bookFormat === 'pdf' && (
//           <div className="flex justify-center">
//             <Document
//               file={bookUrl}
//               onLoadSuccess={onPDFLoadSuccess}
//               loading={
//                 <div className="text-center py-20">
//                   <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse" />
//                   <p>Loading PDF...</p>
//                 </div>
//               }
//               error={
//                 <div className="text-center py-20 text-red-500">
//                   <p>Failed to load PDF</p>
//                 </div>
//               }
//             >
//               <Page
//                 pageNumber={pageNumber}
//                 scale={pdfScale}
//                 renderTextLayer={true}
//                 renderAnnotationLayer={true}
//               />
//             </Document>
//           </div>
//         )}

//         {/* Navigation Controls */}
//         <div className={`flex items-center justify-between mt-8 pt-6 border-t ${currentTheme.border}`}>
//           <button
//             onClick={handlePrev}
//             disabled={!canGoPrev()}
//             className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
//               !canGoPrev()
//                 ? 'opacity-50 cursor-not-allowed'
//                 : 'hover:bg-gray-200 dark:hover:bg-gray-800'
//             }`}
//           >
//             <ChevronLeft className="w-5 h-5" />
//             <span className="hidden sm:inline">Previous</span>
//           </button>

//           <div className={`text-sm ${currentTheme.secondary}`}>
//             {bookFormat === 'json' && bookData && (
//               <>Page {currentLocation + 1} of {bookData.content.length}</>
//             )}
//             {bookFormat === 'pdf' && numPages && (
//               <>Page {pageNumber} of {numPages}</>
//             )}
//             {bookFormat === 'epub' && (
//               <>{Math.round(progress)}% complete</>
//             )}
//           </div>

//           <button
//             onClick={handleNext}
//             disabled={!canGoNext()}
//             className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
//               !canGoNext()
//                 ? 'opacity-50 cursor-not-allowed'
//                 : 'hover:bg-gray-200 dark:hover:bg-gray-800'
//             }`}
//           >
//             <span className="hidden sm:inline">Next</span>
//             <ChevronRight className="w-5 h-5" />
//           </button>
//         </div>

//         {/* Bookmarks Info */}
//         {bookmarks.length > 0 && (
//           <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
//             <p className="text-sm">
//               <strong>Bookmarks:</strong> {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved
//             </p>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// };

// export default MyBookReader;