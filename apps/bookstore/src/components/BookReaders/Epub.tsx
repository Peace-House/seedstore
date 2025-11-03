import ePub from 'epubjs';
import { useEffect, useRef } from 'react';

const EPUBReader = ({ bookUrl }) => {
  const viewerRef = useRef(null);
  const renditionRef = useRef(null);

  useEffect(() => {
    const book = ePub(bookUrl);
    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: 600,
      spread: 'none'
    });

    rendition.display();
    renditionRef.current = rendition;

    return () => {
      rendition.destroy();
    };
  }, [bookUrl]);

  const nextPage = () => renditionRef.current?.next();
  const prevPage = () => renditionRef.current?.prev();

  return (
    <div>
      <div ref={viewerRef}></div>
      <button onClick={prevPage}>Previous</button>
      <button onClick={nextPage}>Next</button>
    </div>
  );
};
export default EPUBReader;