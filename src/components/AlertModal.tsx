import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export function AlertModal({ isOpen, onClose, title, message }: AlertModalProps) {
  const { language } = useSettings();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md z-[101]"
          >
            <div className="bg-surface border border-outline-variant rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6 text-error" />
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 text-outline-variant hover:text-on-surface transition-colors rounded-full hover:bg-surface-bright"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <h2 className="text-xl font-display font-bold text-on-surface mb-2">
                  {title}
                </h2>
                
                <p className="text-on-surface-variant text-sm mb-6">
                  {message}
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-error text-white font-bold rounded-lg hover:bg-error/90 transition-colors focus:outline-none focus:ring-2 focus:ring-error/50 focus:ring-offset-2 focus:ring-offset-surface"
                  >
                    {language === 'vi' ? 'Đã hiểu' : 'Understood'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
