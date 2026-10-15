'use client';
import { useState } from 'react';
import { ProductImage } from './ProductImage';

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) return <ProductImage src={null} alt={alt} className="aspect-square rounded-3xl bg-surface" />;
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:max-h-[520px] sm:flex-col sm:overflow-y-auto">
          {images.map((src, k) => (
            <button
              key={src + k}
              onMouseEnter={() => setI(k)}
              onClick={() => setI(k)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface p-1 ring-2 transition sm:h-20 sm:w-20 ${k === i ? 'ring-brand-600' : 'ring-transparent hover:ring-slate-300'}`}
            >
              <ProductImage src={src} alt="" className="h-full mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-hidden rounded-3xl bg-surface">
        <ProductImage src={images[i]} alt={alt} className="aspect-square p-6 mix-blend-multiply" />
      </div>
    </div>
  );
}
