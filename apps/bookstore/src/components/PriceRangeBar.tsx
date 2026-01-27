import React, { useState, useEffect, useCallback } from 'react';
import { Input } from './ui/input';
import { useCountry } from '@/hooks/useCountry';

interface PriceRangeBarProps {
  minPrice: string;
  maxPrice: string;
  setMinPrice: (value: string) => void;
  setMaxPrice: (value: string) => void;
  label?: string;
  min?: number;
  max?: number;
}

const PriceRangeBar: React.FC<PriceRangeBarProps> = ({ 
  minPrice, 
  maxPrice, 
  setMinPrice, 
  setMaxPrice, 
  label = 'PRICE RANGE',
  min = 0,
  max = 5000
}) => {
  
  const { selectedSymbol } = useCountry();
  const [sliderMin, setSliderMin] = useState(minPrice ? Number(minPrice) : min);
  const [sliderMax, setSliderMax] = useState(maxPrice ? Number(maxPrice) : max);

  // Sync slider with input values
  useEffect(() => {
    setSliderMin(minPrice ? Number(minPrice) : min);
  }, [minPrice, min]);

  useEffect(() => {
    setSliderMax(maxPrice ? Number(maxPrice) : max);
  }, [maxPrice, max]);

  const handleMinSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), sliderMax - 100);
    setSliderMin(value);
    setMinPrice(value === min ? '' : String(value));
  }, [sliderMax, min, setMinPrice]);

  const handleMaxSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), sliderMin + 100);
    setSliderMax(value);
    setMaxPrice(value === max ? '' : String(value));
  }, [sliderMin, max, setMaxPrice]);

  // Calculate percentage for slider track styling
  const minPercent = ((sliderMin - min) / (max - min)) * 100;
  const maxPercent = ((sliderMax - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className='flex justify-between'>
      <label className="text-xs text-gray-500 font-medium">{label}</label>
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
      
      {/* Dual Range Slider */}
      <div className="relative h-4 flex items-center">
        {/* Track background */}
        <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />
        
        {/* Active track */}
        <div 
          className="absolute h-1.5 text-xs bg-primary rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`
          }}
        />
        
        {/* Min slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={sliderMin}
          onChange={handleMinSliderChange}
          className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:shadow-md"
        />
        
        {/* Max slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={sliderMax}
          onChange={handleMaxSliderChange}
          className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:shadow-md"
        />
      </div>

      {/* Price labels under slider */}
      <div className="flex justify-between text-xs text-gray-400">
        <span className='text-xs'>{selectedSymbol}{sliderMin.toLocaleString()}</span>
        <span className='text-xs'>{selectedSymbol}{sliderMax.toLocaleString()}</span>
      </div>

      {/* Input fields */}
      <div className="flex gap-1 items-center justify-between">
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
      </div>
    </div>
  );
};

export default PriceRangeBar;
