'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, MonitorPlay, Gamepad, ArrowRight, Calendar, X, ChevronLeft, ChevronRight, Expand } from 'lucide-react';

const GALLERY_IMAGES = [
  { src: '/_FLE3042.jpg', alt: 'Sfeerbeeld Hub' },
  { src: '/_FLE3045.jpg', alt: 'Community' },
  { src: '/_FLE3046.jpg', alt: 'Gaming Setup' },
  { src: '/_FLE3051.jpg', alt: 'Sfeerbeeld Hub' },
  { src: '/_FLE3056.jpg', alt: 'Community' },
];

export function HubSection() {
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);

  // isClosing plays exit animation before unmounting; animKey forces image re-mount on nav
  const [isClosing, setIsClosing] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const [animKey, setAnimKey] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback((index: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsClosing(false);
    setSlideDir('right');
    setAnimKey((k) => k + 1);
    setCarouselIndex(index);
  }, []);

  const close = useCallback(() => {
    setIsClosing(true);
    closeTimer.current = setTimeout(() => {
      setCarouselIndex(null);
      setIsClosing(false);
    }, 240);
  }, []);

  const prev = useCallback(() => {
    setSlideDir('left');
    setAnimKey((k) => k + 1);
    setCarouselIndex((i) => (i !== null ? (i - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : null));
  }, []);

  const next = useCallback(() => {
    setSlideDir('right');
    setAnimKey((k) => k + 1);
    setCarouselIndex((i) => (i !== null ? (i + 1) % GALLERY_IMAGES.length : null));
  }, []);

  useEffect(() => {
    if (carouselIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [carouselIndex, close, prev, next]);

  // Lock body scroll when carousel is open
  useEffect(() => {
    if (carouselIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [carouselIndex]);

  return (
    <>
      <section id="hub" className="py-24 border-t border-white/5 bg-gradient-to-b from-[#020618] to-black/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-[#d42422] font-medium text-lg mb-4 tracking-tight">
                <MapPin className="w-5 h-5" strokeWidth={1.5} /> Campus Ellermanstraat
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
                De Ultieme <span className="text-[#d42422]">Gaming Hub</span>
              </h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Gelegen in het hart van de AP campus. Het is jouw ontsnapping tussen of na de lessen. Voorzien van state-of-the-art pc&apos;s,
                consoles en een comfortabele chillruimte. Of je nu met je team komt trainen of Mario Kart wil spelen met medestudenten, de hub is jouw
                thuisbasis.
              </p>

              <div className="space-y-5 text-lg text-gray-200 mb-10">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#0a0f25] border border-white/10">
                  <div className="bg-[#d42422]/10 p-2 rounded-lg text-[#d42422]">
                    <MonitorPlay strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-xl mb-1">High-end Setups</h3>
                    <p className="text-gray-400">Top-tier gaming PC&apos;s uitgerust voor de nieuwste titels.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#0a0f25] border border-white/10">
                  <div className="bg-[#d42422]/10 p-2 rounded-lg text-[#d42422]">
                    <Gamepad strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-xl mb-1">Console Lounge</h3>
                    <p className="text-gray-400">Plof neer in de zetels voor een potje FIFA of Smash Bros.</p>
                  </div>
                </div>
              </div>

              <Link
                href="/info"
                className="text-[#d42422] font-medium text-lg inline-flex items-center gap-2 hover:gap-3 transition-all border-b border-transparent hover:border-[#d42422] pb-1"
              >
                Lees het huisreglement <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
              </Link>
            </div>

            {/* Image Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => open(3)}
                className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 group hover:border-[#d42422]/50 transition-all hover:-translate-y-2 relative overflow-hidden cursor-pointer"
              >
                <Image
                  src="/_FLE3051.jpg"
                  alt="Sfeerbeeld Hub"
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <Expand
                    className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg"
                    strokeWidth={1.5}
                  />
                </div>
              </button>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => open(4)}
                  className="aspect-square rounded-3xl bg-gradient-to-bl from-white/10 to-transparent border border-white/10 group hover:border-[#d42422]/50 transition-all hover:translate-x-2 relative overflow-hidden cursor-pointer"
                >
                  <Image
                    src="/_FLE3056.jpg"
                    alt="Community"
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <Expand
                      className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg"
                      strokeWidth={1.5}
                    />
                  </div>
                </button>

                <Link
                  href="/reservations"
                  className="aspect-square rounded-3xl bg-gradient-to-tr from-[#d42422]/20 to-transparent border border-[#d42422]/30 flex flex-col items-center justify-center p-6 group hover:bg-[#d42422]/30 transition-all hover:translate-x-2 relative overflow-hidden"
                >
                  <Calendar className="w-10 h-10 text-[#d42422] mb-3" strokeWidth={1.5} />
                  <span className="text-lg font-medium text-white">Reserveer Nu</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Carousel */}
      {carouselIndex !== null && (
        <div
          className={`fixed inset-0 z-50 bg-black/90 flex items-center justify-center ${isClosing ? 'animate-lightbox-out' : 'animate-lightbox-in'}`}
          onClick={close}
        >
          {/* Image container */}
          <div
            className={`relative w-full max-w-5xl mx-6 aspect-[16/10] ${isClosing ? 'animate-lb-content-out' : 'animate-lb-content-in'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* key forces re-mount so slide animation re-plays on every navigation */}
            <div key={animKey} className={`absolute inset-0 ${slideDir === 'right' ? 'animate-slide-from-right' : 'animate-slide-from-left'}`}>
              <Image
                src={GALLERY_IMAGES[carouselIndex].src}
                alt={GALLERY_IMAGES[carouselIndex].alt}
                fill
                className="object-contain select-none"
                priority
              />
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5 text-white" strokeWidth={1.5} />
          </button>

          {/* Prev */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 md:left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Vorige"
          >
            <ChevronLeft className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>

          {/* Next */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 md:right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Volgende"
          >
            <ChevronRight className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>

          {/* Dot navigation */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {GALLERY_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setSlideDir(i > carouselIndex ? 'right' : 'left');
                  setAnimKey((k) => k + 1);
                  setCarouselIndex(i);
                }}
                className={`rounded-full transition-all duration-200 ${
                  i === carouselIndex ? 'w-6 h-2 bg-[#d42422]' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Foto ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
