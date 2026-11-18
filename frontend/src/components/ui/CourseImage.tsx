import Image from 'next/image';

import { courseImageSrc, isUnoptimizedCourseImage } from '@/lib/course-image';
import { cn } from '@/lib/utils';

interface CourseImageProps {
  /** `imageUrl` z API kurzu; null = výchozí obrázek. */
  imageUrl?: string | null;
  /** Hotové src místo `imageUrl` (např. blob URL náhledu před uložením). */
  src?: string;
  alt: string;
  className?: string;
  /** `sizes` pro next/image — výchozí obrázek se optimalizuje podle šířky slotu. */
  sizes?: string;
}

/**
 * Náhledový obrázek kurzu přes celý (relativně pozicovaný) rodič. Ukládá se
 * v 16:9, v jinak tvarovaných kartách ho `object-cover` ořízne na střed.
 */
export function CourseImage({ imageUrl, src, alt, className, sizes }: CourseImageProps) {
  const resolved = src ?? courseImageSrc(imageUrl);
  const unoptimized = isUnoptimizedCourseImage(resolved);
  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      // Bez srcset (unoptimized) by `sizes` jen zkreslil naturalWidth v Chromiu.
      sizes={unoptimized ? undefined : sizes}
      unoptimized={unoptimized}
      className={cn('object-cover', className)}
    />
  );
}
