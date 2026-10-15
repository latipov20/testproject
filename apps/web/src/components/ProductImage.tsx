// Rasm bo'lmasa, neytral belgi ko'rsatiladi.
export function ProductImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`w-full bg-white object-contain ${className}`} />;
  }
  return (
    <div className={`flex w-full items-center justify-center bg-brand-50 ${className}`} aria-label={alt}>
      <svg viewBox="0 0 48 48" className="h-1/3 w-1/3 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="14" y="10" width="20" height="30" rx="4" />
        <path d="M18 6h12v4H18z" />
        <path d="M24 19v12M18 25h12" strokeLinecap="round" />
      </svg>
    </div>
  );
}
