import { useEffect, useRef, useState, type TouchEvent, type WheelEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import type { AppStrings } from '../i18n/translations';
import type { PhotoItem } from '../types/archive';
import { formatFileSize } from '../utils/archiveLogic';
import {
  clampZoomPan,
  computeDoubleTapZoomTransform,
  computePinchZoomTransform,
  getTouchDistance,
  getTouchMidpoint,
  ZOOM_ACTIVE_EPSILON,
  type PinchSessionSnapshot,
  type ZoomTransform,
} from '../utils/zoomGesture';
import { ResilientImage } from './ResilientImage';

interface PhotoLightboxProps {
  folderName: string;
  photos: PhotoItem[];
  currentIndex: number | null;
  t: AppStrings;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
  onSharePhoto: (photo: PhotoItem, pageNumber: number) => void;
  onDownloadPhoto: (photo: PhotoItem, pageNumber: number) => void;
  onRequestDeletePhoto: (photo: PhotoItem, pageNumber: number) => void;
}

const IDENTITY_ZOOM: ZoomTransform = { scale: 1, panX: 0, panY: 0 };

export function PhotoLightbox({
  folderName,
  photos,
  currentIndex,
  t,
  onClose,
  onChangeIndex,
  onSharePhoto,
  onDownloadPhoto,
  onRequestDeletePhoto,
}: PhotoLightboxProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gestureModeRef = useRef<'idle' | 'pinch' | 'pan' | 'swipe'>('idle');
  const pinchSessionRef = useRef<PinchSessionSnapshot | null>(null);
  const panAnchorRef = useRef<{
    startX: number;
    startY: number;
    basePanX: number;
    basePanY: number;
  } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const zoomRef = useRef<ZoomTransform>(IDENTITY_ZOOM);

  const [zoom, setZoom] = useState<ZoomTransform>(IDENTITY_ZOOM);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const isOpen = currentIndex !== null && currentIndex >= 0 && currentIndex < photos.length;

  const updateZoomState = (next: ZoomTransform) => {
    zoomRef.current = next;
    setZoom(next);
  };

  useEffect(() => {
    zoomRef.current = IDENTITY_ZOOM;
    setZoom(IDENTITY_ZOOM);
    setDragOffsetX(0);
    setIsInteracting(false);
    gestureModeRef.current = 'idle';
    pinchSessionRef.current = null;
    panAnchorRef.current = null;
    swipeStartRef.current = null;
  }, [currentIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || currentIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onChangeIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        onChangeIndex(currentIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose, onChangeIndex]);

  if (!isOpen || currentIndex === null) return null;

  const photo = photos[currentIndex];
  const pageNumber = currentIndex + 1;
  const formattedSize = formatFileSize(photo.size);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;
  const isZoomed = zoom.scale >= ZOOM_ACTIVE_EPSILON;

  const getStageMetrics = () => {
    const rect = stageRef.current?.getBoundingClientRect();
    const width = rect?.width ?? window.innerWidth;
    const height = rect?.height ?? window.innerHeight;
    const centerX = (rect?.left ?? 0) + width / 2;
    const centerY = (rect?.top ?? 0) + height / 2;
    return { width, height, centerX, centerY };
  };

  const startPinchSession = (t0: { clientX: number; clientY: number }, t1: { clientX: number; clientY: number }) => {
    const { centerX, centerY } = getStageMetrics();
    const p1 = { x: t0.clientX, y: t0.clientY };
    const p2 = { x: t1.clientX, y: t1.clientY };
    const mid = getTouchMidpoint(p1, p2);
    gestureModeRef.current = 'pinch';
    swipeStartRef.current = null;
    panAnchorRef.current = null;
    setDragOffsetX(0);
    setIsInteracting(true);
    pinchSessionRef.current = {
      startDistance: getTouchDistance(p1, p2),
      startScale: zoomRef.current.scale,
      startPanX: zoomRef.current.panX,
      startPanY: zoomRef.current.panY,
      startRelMidX: mid.x - centerX,
      startRelMidY: mid.y - centerY,
    };
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement | null)?.closest('button')) {
      return;
    }

    if (e.touches.length >= 2) {
      lastTapRef.current = null;
      startPinchSession(e.touches[0], e.touches[1]);
      return;
    }

    if (e.touches.length === 1) {
      const t0 = e.touches[0];
      const now = Date.now();
      const prevTap = lastTapRef.current;

      if (
        prevTap &&
        now - prevTap.time < 280 &&
        Math.hypot(t0.clientX - prevTap.x, t0.clientY - prevTap.y) < 26
      ) {
        const { width, height, centerX, centerY } = getStageMetrics();
        const toggled = computeDoubleTapZoomTransform(
          zoomRef.current,
          t0.clientX - centerX,
          t0.clientY - centerY,
          width,
          height
        );
        lastTapRef.current = null;
        gestureModeRef.current = 'idle';
        setIsInteracting(false);
        setDragOffsetX(0);
        updateZoomState(toggled);
        return;
      }

      lastTapRef.current = { time: now, x: t0.clientX, y: t0.clientY };

      if (zoomRef.current.scale >= ZOOM_ACTIVE_EPSILON) {
        gestureModeRef.current = 'pan';
        setIsInteracting(true);
        panAnchorRef.current = {
          startX: t0.clientX,
          startY: t0.clientY,
          basePanX: zoomRef.current.panX,
          basePanY: zoomRef.current.panY,
        };
      } else {
        gestureModeRef.current = 'swipe';
        setIsInteracting(true);
        swipeStartRef.current = { x: t0.clientX, y: t0.clientY };
        setDragOffsetX(0);
      }
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length >= 2) {
      if (gestureModeRef.current !== 'pinch' || !pinchSessionRef.current) {
        startPinchSession(e.touches[0], e.touches[1]);
        return;
      }
      const { width, height, centerX, centerY } = getStageMetrics();
      const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const mid = getTouchMidpoint(p1, p2);
      const dist = getTouchDistance(p1, p2);

      const next = computePinchZoomTransform(
        pinchSessionRef.current,
        mid.x - centerX,
        mid.y - centerY,
        dist,
        width,
        height
      );
      updateZoomState(next);
      return;
    }

    if (e.touches.length === 1) {
      const t0 = e.touches[0];

      // Smooth handoff if one finger was lifted during a 2-finger pinch
      if (gestureModeRef.current === 'pinch') {
        pinchSessionRef.current = null;
        if (zoomRef.current.scale >= ZOOM_ACTIVE_EPSILON) {
          gestureModeRef.current = 'pan';
          panAnchorRef.current = {
            startX: t0.clientX,
            startY: t0.clientY,
            basePanX: zoomRef.current.panX,
            basePanY: zoomRef.current.panY,
          };
        } else {
          gestureModeRef.current = 'idle';
        }
        return;
      }

      if (gestureModeRef.current === 'pan' && panAnchorRef.current) {
        const { width, height } = getStageMetrics();
        const dx = t0.clientX - panAnchorRef.current.startX;
        const dy = t0.clientY - panAnchorRef.current.startY;
        const next = clampZoomPan(
          zoomRef.current.scale,
          panAnchorRef.current.basePanX + dx,
          panAnchorRef.current.basePanY + dy,
          width,
          height
        );
        updateZoomState(next);
        return;
      }

      if (gestureModeRef.current === 'swipe' && swipeStartRef.current) {
        const dx = t0.clientX - swipeStartRef.current.x;
        const dy = t0.clientY - swipeStartRef.current.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          setDragOffsetX(dx * 0.45);
        }
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    // One finger remains on screen after lifting the second pinch finger
    if (e.touches.length === 1 && gestureModeRef.current === 'pinch') {
      pinchSessionRef.current = null;
      const t0 = e.touches[0];
      if (zoomRef.current.scale >= ZOOM_ACTIVE_EPSILON) {
        gestureModeRef.current = 'pan';
        panAnchorRef.current = {
          startX: t0.clientX,
          startY: t0.clientY,
          basePanX: zoomRef.current.panX,
          basePanY: zoomRef.current.panY,
        };
      } else {
        gestureModeRef.current = 'idle';
      }
      return;
    }

    if (e.touches.length > 0) return;

    setIsInteracting(false);

    if (
      gestureModeRef.current === 'swipe' &&
      swipeStartRef.current &&
      zoomRef.current.scale < ZOOM_ACTIVE_EPSILON
    ) {
      const endX = e.changedTouches[0]?.clientX ?? swipeStartRef.current.x;
      const endY = e.changedTouches[0]?.clientY ?? swipeStartRef.current.y;
      const dx = endX - swipeStartRef.current.x;
      const dy = endY - swipeStartRef.current.y;

      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0 && hasNext) {
          onChangeIndex(currentIndex + 1);
        } else if (dx > 0 && hasPrev) {
          onChangeIndex(currentIndex - 1);
        }
      }
    }

    const { width, height } = getStageMetrics();
    const settled = clampZoomPan(
      zoomRef.current.scale,
      zoomRef.current.panX,
      zoomRef.current.panY,
      width,
      height
    );
    updateZoomState(settled);

    gestureModeRef.current = 'idle';
    pinchSessionRef.current = null;
    panAnchorRef.current = null;
    swipeStartRef.current = null;
    setDragOffsetX(0);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 4) return;
    const { width, height, centerX, centerY } = getStageMetrics();
    const zoomStep = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nextScale = zoomRef.current.scale * zoomStep;
    const relX = e.clientX - centerX;
    const relY = e.clientY - centerY;
    const scaleFactor = nextScale / zoomRef.current.scale;
    const nextPanX = relX - (relX - zoomRef.current.panX) * scaleFactor;
    const nextPanY = relY - (relY - zoomRef.current.panY) * scaleFactor;
    setIsInteracting(false);
    updateZoomState(clampZoomPan(nextScale, nextPanX, nextPanY, width, height));
  };

  const activeTranslateX = isZoomed ? zoom.panX : dragOffsetX;
  const activeTranslateY = isZoomed ? zoom.panY : 0;

  return (
    <div
      className="fixed inset-0 z-50 h-dvh bg-[#0A0A0C]/92 backdrop-blur-2xl text-stone-100 flex flex-col select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`${folderName} — ${t.pageLabel(pageNumber)}`}
    >
      {/* Smoked Glass Top Bar */}
      <div className="min-h-[56px] px-4 sm:px-6 pt-[calc(var(--safe-top)+0.375rem)] pb-1.5 bg-white/[0.04] backdrop-blur-xl flex items-center justify-between gap-3 border-b border-white/12 shrink-0">
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-medium text-stone-100 truncate">{folderName}</div>
          <div className="text-xs text-stone-400 tabular-nums">
            <span>
              {pageNumber} / {photos.length}
            </span>
            {formattedSize && (
              <>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{formattedSize}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isZoomed && (
            <button
              type="button"
              onClick={() => {
                setIsInteracting(false);
                updateZoomState(IDENTITY_ZOOM);
              }}
              aria-label={t.resetZoomAria}
              className="min-h-[42px] px-2.5 rounded-[2px] bg-white/[0.08] border border-white/20 text-xs font-medium text-stone-100 hover:bg-white/15 tabular-nums transition-colors"
            >
              {zoom.scale.toFixed(1)}×
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeLightboxAria}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[2px] bg-white/[0.06] border border-white/15 text-stone-200 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pinch-to-Zoom & Swipeable Full-Screen Stage */}
      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden px-3 sm:px-14 py-4 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
      >
        <button
          type="button"
          disabled={!hasPrev || isZoomed}
          onClick={() => hasPrev && !isZoomed && onChangeIndex(currentIndex - 1)}
          aria-label={t.prevPhotoAria}
          className={`min-h-[44px] min-w-[44px] absolute left-3 sm:left-5 z-10 flex items-center justify-center rounded-[2px] bg-black/60 backdrop-blur-md border border-white/20 text-stone-100 hover:bg-white/15 transition-opacity ${
            isZoomed
              ? 'opacity-0 pointer-events-none'
              : 'disabled:opacity-20 disabled:pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          data-zoom-scale={zoom.scale.toFixed(2)}
          style={{
            transform:
              activeTranslateX !== 0 || activeTranslateY !== 0 || zoom.scale !== 1
                ? `translate3d(${activeTranslateX}px, ${activeTranslateY}px, 0) scale(${zoom.scale})`
                : undefined,
          }}
          className={`w-full h-full flex items-center justify-center origin-center will-change-transform ${
            isInteracting ? '' : 'transition-transform duration-150 ease-out'
          }`}
        >
          <ResilientImage
            key={photo.id}
            src={photo.previewUrl}
            alt={`${folderName} — ${t.pageLabel(pageNumber)}`}
            className="max-h-full max-w-full object-contain rounded-[2px] border border-white/15 shadow-2xl"
          />
        </div>

        <button
          type="button"
          disabled={!hasNext || isZoomed}
          onClick={() => hasNext && !isZoomed && onChangeIndex(currentIndex + 1)}
          aria-label={t.nextPhotoAria}
          className={`min-h-[44px] min-w-[44px] absolute right-3 sm:right-5 z-10 flex items-center justify-center rounded-[2px] bg-black/60 backdrop-blur-md border border-white/20 text-stone-100 hover:bg-white/15 transition-opacity ${
            isZoomed
              ? 'opacity-0 pointer-events-none'
              : 'disabled:opacity-20 disabled:pointer-events-none'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Smoked Glass Justified 3-Column Bottom Action Bar */}
      <div className="min-h-[64px] px-4 sm:px-6 pt-2.5 pb-[calc(var(--safe-bottom)+0.625rem)] border-t border-white/12 bg-white/[0.04] backdrop-blur-xl flex items-center shrink-0">
        <div className="w-full max-w-lg mx-auto grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onSharePhoto(photo, pageNumber)}
            className="min-h-[42px] px-2.5 py-2 rounded-[2px] bg-white/[0.07] border border-white/14 text-xs sm:text-sm font-medium text-stone-100 hover:bg-white/15 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.shareFolderTitle}</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadPhoto(photo, pageNumber)}
            className="min-h-[42px] px-2.5 py-2 rounded-[2px] bg-white/[0.07] border border-white/14 text-xs sm:text-sm font-medium text-stone-100 hover:bg-white/15 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.downloadSingleBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestDeletePhoto(photo, pageNumber)}
            className="min-h-[42px] px-2.5 py-2 rounded-[2px] bg-red-950/45 border border-red-400/30 text-xs sm:text-sm font-medium text-red-300 hover:bg-red-900/50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.deleteBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
