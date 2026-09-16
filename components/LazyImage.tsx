'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.avi', '.m4v', '.ogg'];

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
  }
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  sizes?: string;
  /** Show native video controls on hover/focus (storefront product hero usage) */
  videoControls?: boolean;
  /** Override autoplay (defaults to true for muted loop video). */
  autoPlay?: boolean;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  videoControls = false,
  autoPlay = true,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const isVideo = src ? isVideoUrl(src) : false;

  // Lazy-mount the <video> only when it enters the viewport (with 200px lead).
  useEffect(() => {
    if (!isVideo || !containerRef.current) return;
    if (priority) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVideo, priority]);

  // Autoplay (muted), with a fallback tap-to-play if the browser blocks it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible || !autoPlay) return;

    const tryPlay = () => {
      const p = video.play();
      if (p !== undefined) {
        p.catch(() => setAutoplayFailed(true));
      }
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
      return () => video.removeEventListener('canplay', tryPlay);
    }
  }, [isVisible, src, autoPlay]);

  const handleTapPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(() => setAutoplayFailed(false)).catch(() => {});
  }, []);

  if (!src || (hasError && !isVideo)) {
    return (
      <div
        className={`relative overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs">No Image</span>
      </div>
    );
  }

  if (hasError && isVideo) {
    return (
      <div
        className={`relative overflow-hidden bg-gray-100 flex flex-col items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <i className="ri-video-off-line text-3xl text-gray-400 mb-1"></i>
        <span className="text-gray-400 text-[10px]">Video unavailable</span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse z-10"></div>
        )}
        {isVisible && (
          <video
            ref={videoRef}
            src={src}
            muted
            autoPlay={autoPlay}
            loop
            playsInline
            controls={videoControls}
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoadedData={handleLoad}
            onError={handleError}
          />
        )}
        {isLoaded && autoplayFailed && (
          <button
            onClick={handleTapPlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
            aria-label="Play video"
          >
            <span className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
              <i className="ri-play-fill text-slate-900 text-2xl"></i>
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse z-10"></div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        quality={75}
      />
    </div>
  );
}
