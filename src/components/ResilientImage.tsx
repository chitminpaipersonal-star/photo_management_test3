import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ResilientImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm text-stone-400 dark:text-stone-500 p-2 text-center select-none"
        aria-label={alt}
      >
        <BookOpen className="w-5 h-5 stroke-[1.5]" aria-hidden="true" />
        {fallbackLabel && (
          <span className="mt-1 text-[10px] leading-tight line-clamp-2 text-stone-500 dark:text-stone-400">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
