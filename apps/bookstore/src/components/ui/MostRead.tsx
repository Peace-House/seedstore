import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Book } from '@/services';
import LiquidGlassWrapper from "../LiquidGlassWrapper";

const MostRead = ({ books, title }: { books: Book[], title: string }) => {
    const scrollRef = useRef<HTMLUListElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', checkScroll);
        return () => el.removeEventListener('scroll', checkScroll);
    }, [books?.length]);

    if (!books || books?.length === 0) return null;

    return (
        <LiquidGlassWrapper
            liquidGlass={true}
            className="flex flex-col py-6 px-4 shadow-sm rounded-md w-full md:w-1/2"
        >
            <div className='w-full relative overflow-hidden'>
                <p className='font-medium mb-3 px-2'>{title}</p>

                <div className="relative group">
                    <button
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full shadow p-1.5 hover:bg-primary/10 transition disabled:opacity-0 opacity-0 group-hover:opacity-100"
                        style={{ marginLeft: '0.25rem' }}
                        onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                        disabled={!canScrollLeft}
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <ul
                        ref={scrollRef}
                        className='overflow-x-auto scroll-smooth scrollbar-hide flex gap-4 pb-2 px-2'
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        {books.map((book: Book) => (
                            <li key={book.id} className="bg-transparent flex-shrink-0 h-[180px] w-[120px] rounded-none flex flex-col items-center transition-transform hover:scale-105">
                                <img
                                    src={book.coverImage}
                                    alt={book.title}
                                    className="h-full w-full object-contain object-top shadow-sm"
                                />
                            </li>
                        ))}
                    </ul>

                    <button
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full shadow p-1.5 hover:bg-primary/10 transition disabled:opacity-0 opacity-0 group-hover:opacity-100"
                        style={{ marginRight: '0.25rem' }}
                        onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                        disabled={!canScrollRight}
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </LiquidGlassWrapper>
    )
}

export default MostRead;