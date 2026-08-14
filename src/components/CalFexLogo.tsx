import React, { useState } from 'react';
import logoImg from '../assets/images/cal_fex_logo_1786651287673.jpg';
import { GraduationCap } from 'lucide-react';

interface CalFexLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const CalFexLogo: React.FC<CalFexLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-8 h-8 sm:w-10 sm:h-10',
    lg: 'w-12 h-12 sm:w-14 sm:h-14',
    xl: 'w-16 h-16 sm:w-20 sm:h-20',
  };

  const iconSizeMap = {
    sm: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-6 h-6 sm:w-7 sm:h-7',
    xl: 'w-8 h-8 sm:w-10 sm:h-10',
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 select-none shrink-0 ${className}`}>
      <div className={`relative ${sizeMap[size]} rounded-xl sm:rounded-2xl overflow-hidden shadow-md ring-1 ring-amber-400/40 bg-slate-950 shrink-0 flex items-center justify-center`}>
        {!imgError ? (
          <img
            src={logoImg}
            alt="CalFéx Pro Logo"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white">
            <GraduationCap className={iconSizeMap[size]} />
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-tight">
              CalFéx
            </span>
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
              Pro
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:block tracking-wide">
            Sistema de Gestão Escolar
          </span>
        </div>
      )}
    </div>
  );
};
