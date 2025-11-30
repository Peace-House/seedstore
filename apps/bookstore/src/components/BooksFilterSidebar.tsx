import { capitalizeWords } from '@/lib/utils';
import { Input } from './ui/input';
import { Search, Check } from 'lucide-react';
import React from 'react';
import PriceRangeBar from './PriceRangeBar';
import LiquidGlassWrapper from './LiquidGlassWrapper';

interface BooksFilterSidebarProps {
    activeTab: 'categories' | 'authors';
    setActiveTab: (tab: 'categories' | 'authors') => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    minPrice: string;
    setMinPrice: (v: string) => void;
    maxPrice: string;
    setMaxPrice: (v: string) => void;
    categoryFilter: (string | number)[];
    setCategoryFilter: (v: (string | number)[]) => void;
    categories: { id: string; name: string }[];
    authorFilter: string[];
    setAuthorFilter: (v: string[]) => void;
    uniqueAuthors: string[];
}

const BooksFilterSidebar: React.FC<BooksFilterSidebarProps> = ({
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    categoryFilter,
    setCategoryFilter,
    categories,
    authorFilter,
    setAuthorFilter,
    uniqueAuthors,
}) => (
    <LiquidGlassWrapper className="hidden md:flex flex-row md:flex-col gap-4 md:w-1/5 p-4 max-h-[max-content] sticky top-20">

        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
                placeholder="Search title or author..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-7 text-xs placeholder:text-xs rounded-full bg-transparent  backdrop-blur-md"
            />
        </div>
        <hr className="md:my-0 my-2 border-gray-100 " />

        <PriceRangeBar minPrice={minPrice} maxPrice={maxPrice} setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} />
        <hr className="md:my-0 my-2 border-gray-100 " />
        <div className="flex gap-2">
            {[
                { key: 'categories', label: 'Categories' },
                { key: 'authors', label: 'Authors' }
            ].map(tab => (
                <button
                    key={tab.key}
                    className={` text-xs uppercase font-medium py-0.5 transition-all ease-in-out ${activeTab === tab.key ? 'border-b text-primary border-primary' : 'text-gray-500'}`}
                    onClick={() => setActiveTab(tab.key as 'categories' | 'authors')}
                >
                    {tab.label}
                </button>
            ))}
        </div>
        {(authorFilter.length > 0 || categoryFilter.length > 0) && <div className='flex items-center justify-between w-full'>
            {<button className='text-xs w-full hover:opacity-75 rounded-full bg-primary/10 px-1.5 py-0.5' onClick={() => { setAuthorFilter([]); setCategoryFilter([]); }}>Clear</button>}
        </div>}
        {activeTab === 'categories' && (
            <ul className='grid'>
                {categories?.map((cat, idx) => {
                    const catId = cat.id || 'uncategorized';
                    const isSelected = categoryFilter.includes(catId);
                    return (
                        <li
                            key={idx}
                            onClick={() => {
                                setCategoryFilter(
                                    isSelected
                                        ? categoryFilter.filter(id => id !== catId)
                                        : [...categoryFilter, catId]
                                );
                            }}
                            className={`py-1 px-2 text-sm rounded-sm cursor-pointer hover:bg-muted-foreground/10 transition-colors ${isSelected ? 'font-semibold bg-[#8FB51C15]' : 'font-light'}`}
                        >
                            {cat.name || 'Uncategorized'} {isSelected && <Check className='inline-block w-5 h-5 text-black float-right' />}
                        </li>
                    );
                })}
            </ul>
        )}
        {activeTab === 'authors' && (
            <ul className='grid'>
                {uniqueAuthors.map((author, idx) => {
                    const isSelected = authorFilter.includes(author);
                    return (
                        <li
                            key={idx}
                            onClick={() => {
                                setAuthorFilter(
                                    isSelected
                                        ? authorFilter.filter(a => a !== author)
                                        : [...authorFilter, author]
                                );
                            }}
                            className={`py-1 px-2 text-sm cursor-pointer rounded-sm hover:bg-muted-foreground/10 transition-colors ${isSelected ? 'font-semibold bg-[#8FB51C15]' : 'font-light'}`}
                        >
                            {capitalizeWords(author)} {isSelected && <Check className='inline-block w-5 h-5 text-black float-right' />}
                        </li>
                    );
                })}
            </ul>
        )}
    </LiquidGlassWrapper>
);

export default BooksFilterSidebar;
