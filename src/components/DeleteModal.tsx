import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { ArrowRight, Trash2, Link2Off, Database, GitBranch } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

interface Stat {
  icon: React.ReactNode;
  value: string;
  label: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description: string;
  stats?: Stat[];
  slideText?: string;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  stats = [],
  slideText = "SLIDE TO EXECUTE PURGE"
}: DeleteModalProps) {
  const { language } = useSettings();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const controls = useAnimation();
  
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 });

  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
      x.set(0);
      controls.start({ x: 0 });
    }
  }, [isOpen, x, controls]);

  useEffect(() => {
    if (containerRef.current && handleRef.current) {
      setDragConstraints({
        left: 0,
        right: containerRef.current.offsetWidth - handleRef.current.offsetWidth - 8 // 4px padding on each side
      });
    }
  }, [isOpen]);

  const opacity = useTransform(x, [0, dragConstraints.right * 0.8], [1, 0]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > dragConstraints.right * 0.8) {
      setIsConfirmed(true);
      controls.start({ x: dragConstraints.right });
      setTimeout(() => {
        onConfirm();
      }, 400);
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[500px] bg-surface rounded-3xl border border-outline-variant p-10 overflow-hidden shadow-2xl flex flex-col items-center text-center"
      >
        {/* Glow behind icon */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-error rounded-full blur-[80px] opacity-20 pointer-events-none" />

        {/* Icon */}
        <div className="relative mb-8 text-error">
          <Trash2 className="w-8 h-8" />
          <div className="absolute inset-0 flex items-center justify-center font-bold text-xs">
            {/* Small X inside trash can if we wanted, but standard lucide icon is fine */}
          </div>
        </div>

        {/* Text content */}
        <div className="text-error text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
          {language === 'vi' ? 'Hành động nguy hiểm' : 'Critical Action'}
        </div>
        
        <h2 className="text-3xl font-bold text-on-surface mb-4">
          {title}
        </h2>
        
        <p className="text-outline text-sm leading-relaxed mb-10 max-w-sm">
          {description}
        </p>

        {/* Stats Grid */}
        {stats.length > 0 && (
          <div className="flex gap-4 w-full mb-10">
            {stats.map((stat, i) => (
              <div key={i} className="flex-1 bg-surface-bright rounded-xl p-4 flex flex-col items-center justify-center border border-outline-variant">
                <div className="text-error mb-2 opacity-80">
                  {stat.icon}
                </div>
                <div className="text-xl font-bold text-on-surface mb-1">{stat.value}</div>
                <div className="text-[9px] text-outline-variant font-bold tracking-widest uppercase text-center leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Slider */}
        <div 
          ref={containerRef}
          className="relative w-full h-[60px] bg-surface-bright rounded-full flex items-center justify-center border border-outline-variant/50 overflow-hidden mb-6"
        >
          <motion.div 
            style={{ opacity }}
            className="absolute text-error text-xs font-bold tracking-[0.2em] uppercase pointer-events-none z-0"
          >
            {slideText}
          </motion.div>
          
          <div className="absolute left-1 top-1 bottom-1 flex items-center">
            <motion.div
              ref={handleRef}
              drag="x"
              dragConstraints={{ left: 0, right: dragConstraints.right }}
              dragElastic={0}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              animate={controls}
              style={{ x }}
              className="w-[52px] h-[52px] bg-error rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 shadow-[0_0_15px_rgba(255,139,139,0.3)] hover:scale-[1.02] transition-transform"
            >
              {isConfirmed ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Trash2 className="w-5 h-5 text-error" />
                </motion.div>
              ) : (
                <ArrowRight className="w-5 h-5 text-error" />
              )}
            </motion.div>
          </div>

          {/* Filled track background behind slider */}
          <motion.div 
            className="absolute left-0 top-0 bottom-0 bg-error/10 rounded-full z-0 pointer-events-none"
            style={{ width: useTransform(x, (val) => val + 56) }}
          />
        </div>

        {/* Cancel */}
        <button 
          onClick={onClose}
          className="text-outline text-xs font-bold tracking-[0.2em] uppercase hover:text-on-surface transition-colors py-2"
        >
          {language === 'vi' ? 'Hủy' : 'Cancel'}
        </button>
      </motion.div>
    </div>
  );
}
