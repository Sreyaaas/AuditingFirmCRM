import { useEffect, useState } from 'react';

/**
 * Computes how many 44px table rows fit comfortably in the current viewport
 * without leaving large empty gaps on tall monitors or overflowing short ones.
 */
export function useResponsivePageSize(options?: {
  reservedHeight?: number;
  rowHeight?: number;
  min?: number;
  max?: number;
}): number {
  const reservedHeight = options?.reservedHeight ?? 390;
  const rowHeight = options?.rowHeight ?? 44;
  const min = options?.min ?? 7;
  const max = options?.max ?? 24;

  const calc = () => {
    if (typeof window === 'undefined') return 10;
    const available = Math.max(0, window.innerHeight - reservedHeight);
    const count = Math.floor(available / rowHeight);
    return Math.max(min, Math.min(max, count));
  };

  const [pageSize, setPageSize] = useState<number>(calc);

  useEffect(() => {
    const onResize = () => setPageSize(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [reservedHeight, rowHeight, min, max]);

  return pageSize;
}
