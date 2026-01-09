import React from 'react';
import LiquidGlassWrapper from './LiquidGlassWrapper';

type ComingSoonBookTileProps = {
  variant: 'grid' | 'list';
};

const ComingSoonBookTile: React.FC<ComingSoonBookTileProps> = ({ variant }) => {
  if (variant === 'list') {
    return (
      <LiquidGlassWrapper className="flex flex-row items-center !bg-white/70 rounded-md justify-between gap-2 border-none hover:shadow-md h-max shadow-none w-full overflow-hidden">
        <div className="relative w-24 h-32 flex-shrink-0 bg-muted overflow-hidden">
          <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Coming Soon
          </span>
          <img src="/sl.png" alt="Coming soon book cover" className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col gap-1 text-right w-full">
          <p className="text-xs font-semibold text-gray-800">This book will be available soon</p>
          <p className="text-[11px] text-muted-foreground">Stay tuned for the official release.</p>
        </div>
      </LiquidGlassWrapper>
    );
  }

  return (
    <LiquidGlassWrapper className="overflow border-none !bg-white/70 overflow-hidden transition-shadow group h-max md:min-w-[180px]">
      <div className="relative overflow-hidden bg-muted flex-1 w-full">
        <div className="relative h-[220px] w-full md:w-[200px] overflow-hidden">
          <img
            src="/sl.png"
            alt="Coming soon book cover"
            className="object-fill w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Coming Soon
          </span>
        </div>
      </div>
      <div className="border-t pt-2 px-2 pb-3 flex flex-col items-center text-center">
        <p className="text-xs font-semibold text-gray-800">This book will be available soon</p>
        <p className="text-[11px] text-muted-foreground">Check back shortly for the live copy.</p>
      </div>
    </LiquidGlassWrapper>
  );
};

export default ComingSoonBookTile;
