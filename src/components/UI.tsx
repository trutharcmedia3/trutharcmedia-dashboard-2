/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className, children, ...props }) => {
  const variants = {
    primary: 'bg-[#6366F1] text-white hover:bg-[#4F46E5]',
    secondary: 'bg-[#0F172A] text-white hover:bg-[#1E293B]',
    outline: 'border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
    danger: 'bg-[#F43F5E] text-white hover:bg-[#E11D48]',
    warning: 'bg-[#F59E0B] text-white hover:bg-[#D97706]',
    success: 'bg-[#10B981] text-white hover:bg-[#059669]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// Card
export const Card: React.FC<{ className?: string; children: ReactNode; [key: string]: any }> = ({ className, children, ...props }) => (
  <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<{ className?: string; children: ReactNode; [key: string]: any }> = ({ className, children, ...props }) => (
  <div className={cn('px-6 py-4 border-b border-slate-100', className)} {...props}>{children}</div>
);

export const CardContent: React.FC<{ className?: string; children: ReactNode; [key: string]: any }> = ({ className, children, ...props }) => (
  <div className={cn('px-6 py-4', className)} {...props}>{children}</div>
);

// Badge
export const Badge: React.FC<{ variant?: string; children: ReactNode; className?: string }> = ({ variant = 'default', children, className }) => {
  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-indigo-100 text-indigo-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant] || variants.default, className)}>
      {children}
    </span>
  );
};

// Input
export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
);

// Select
export const Select = ({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </select>
);

// Modal
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  if (!isOpen) return null;
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={cn("bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col", sizes[size])}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message,
  confirmText = "Delete",
  variant = "danger"
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title?: string; 
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

// Table
export const Table: React.FC<{ children: ReactNode; className?: string; [key: string]: any }> = ({ children, className, ...props }) => (
  <div className={cn('w-full overflow-x-auto', className)}>
    <table className="w-full text-left border-collapse" {...props}>{children}</table>
  </div>
);

export const THead: React.FC<{ children: ReactNode; className?: string; [key: string]: any }> = ({ children, className, ...props }) => (
  <thead className={cn("bg-slate-50 border-b border-slate-200", className)} {...props}>{children}</thead>
);

export const TBody: React.FC<{ children: ReactNode; className?: string; [key: string]: any }> = ({ children, className, ...props }) => (
  <tbody className={cn("divide-y divide-slate-100", className)} {...props}>{children}</tbody>
);

export const TR = ({ children, className, onClick, ...props }: { children: ReactNode; className?: string; onClick?: () => void; [key: string]: any }) => (
  <tr className={cn('hover:bg-slate-50/50 transition-colors', onClick && 'cursor-pointer', className)} onClick={onClick} {...props}>
    {children}
  </tr>
);

export const TH = ({ children, className, ...props }: { children: ReactNode; className?: string; [key: string]: any }) => (
  <th className={cn('px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider', className)} {...props}>{children}</th>
);

export const TD = ({ children, className, ...props }: { children: ReactNode; className?: string; [key: string]: any }) => (
  <td className={cn('px-6 py-4 text-sm text-slate-700 whitespace-nowrap', className)} {...props}>{children}</td>
);
