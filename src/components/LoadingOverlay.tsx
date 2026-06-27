import React from 'react';
import { Activity } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  isSaving?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, message, isSaving }) => {
  const { language } = useSettings();
  
  if (!isLoading) return null;

  const defaultMessage = isSaving 
    ? (language === 'vi' ? 'Đang lưu...' : 'Saving...')
    : (language === 'vi' ? 'Đang xử lý...' : 'Processing...');

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="flex flex-col items-center bg-surface p-6 rounded-lg shadow-lg border border-outline-variant">
        <Activity className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-on-surface tracking-widest uppercase">
          {message || defaultMessage}
        </p>
      </div>
    </div>
  );
};
