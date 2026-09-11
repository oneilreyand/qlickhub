import React, { useEffect, useState } from 'react';
import { BarChart3, Workflow } from 'lucide-react';

const TASK_ASSIGNMENT_BANNER_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020941/ChatGPT_Image_Aug_13_2026_11_58_40_PM.png';
const COST_COMPARISON_BANNER_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020941/ChatGPT_Image_Aug_13_2026_11_58_45_PM.png';

const BANNER_ROTATION_MS = 7000;

const slides = [
  {
    src: TASK_ASSIGNMENT_BANNER_URL,
    alt: 'Tugaskan tugas yang tepat ke orang yang tepat.',
    label: 'Task assignment overview',
    DarkModeIcon: Workflow,
  },
  {
    src: COST_COMPARISON_BANNER_URL,
    alt: 'Perbandingan biaya tools manajemen tugas.',
    label: 'Cost comparison overview',
    DarkModeIcon: BarChart3,
  },
];

export const OverviewBannerCarousel: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const ActiveDarkModeIcon = slides[activeSlide].DarkModeIcon;

  useEffect(() => {
    if (!window.matchMedia) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(motionPreference.matches);

    updateMotionPreference();
    motionPreference.addEventListener('change', updateMotionPreference);

    return () => motionPreference.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const rotationTimer = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, BANNER_ROTATION_MS);

    return () => window.clearTimeout(rotationTimer);
  }, [activeSlide, prefersReducedMotion]);

  return (
    <section
      aria-label="Overview highlights"
      aria-roledescription="carousel"
      className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs dark:border-stone-800 dark:bg-[#1C1A19]"
    >
      <div className="relative aspect-[5/2] min-h-[150px] sm:min-h-0">
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={index === activeSlide ? slide.alt : ''}
            aria-hidden={index !== activeSlide}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform dark:hidden ${
              index === activeSlide ? 'scale-100 opacity-100' : 'scale-[1.045] opacity-0'
            }`}
          />
        ))}
        <div
          role="img"
          aria-label={`${slides[activeSlide].label} icon`}
          className="absolute inset-0 hidden items-center justify-center bg-stone-900 dark:flex"
        >
          <div className="relative grid h-24 w-24 place-items-center rounded-3xl border border-stone-700 bg-stone-800 shadow-inner">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[#B1E743]/10 blur-xl" />
            <ActiveDarkModeIcon className="h-11 w-11 text-[#B1E743]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
};
