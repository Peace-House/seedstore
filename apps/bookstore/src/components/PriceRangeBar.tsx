import React from 'react';
import { Input } from './ui/input';

interface PriceRangeBarProps {
  minPrice: string;
  maxPrice: string;
  setMinPrice: (value: string) => void;
  setMaxPrice: (value: string) => void;
  label?: string;
}

const PriceRangeBar: React.FC<PriceRangeBarProps> = ({ minPrice, maxPrice, setMinPrice, setMaxPrice, label = 'PRICE RANGE' }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs text-gray-500 font-medium">{label}</label>
    <div className="flex gap-2 items-center justify-between">
      <Input
        type="number"
        min={0}
        placeholder="Min"
        value={minPrice}
        onChange={e => setMinPrice(e.target.value)}
        className="w-1/2 bg-transparent text-xs placeholder:text-xs rounded-full text-center"
      />
      <span className="text-xs text-gray-400">-</span>
      <Input
        type="number"
        min={0}
        placeholder="Max"
        value={maxPrice}
        onChange={e => setMaxPrice(e.target.value)}
        className="w-1/2 bg-transparent text-xs placeholder:text-xs rounded-full text-center"
      />
      {(minPrice || maxPrice) && (
        <button
          className="text-xs hover:opacity-75 rounded-full bg-primary/10 px-1.5 py-0.5 ml-2"
          onClick={() => { setMinPrice(''); setMaxPrice(''); }}
          type="button"
        >
          Clear
        </button>
      )}
    </div>
  </div>
);

export default PriceRangeBar;
