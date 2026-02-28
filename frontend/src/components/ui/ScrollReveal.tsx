'use client';
import React, { useRef, useState, useEffect } from 'react';

export const ScrollReveal = ({
  children,
  direction = 'left',
  delay = 0,
}: {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up';
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getTransform = () => {
    if (isVisible) return 'translate3d(0, 0, 0)';
    if (direction === 'left') return 'translate3d(-50px, 0, 0)';
    if (direction === 'right') return 'translate3d(50px, 0, 0)';
    return 'translate3d(0, 30px, 0)';
  };

  return (
    <div
      ref={ref}
      style={{
        transform: getTransform(),
        opacity: isVisible ? 1 : 0,
        transition: `all 0.8s cubic-bezier(0.17, 0.55, 0.55, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};
