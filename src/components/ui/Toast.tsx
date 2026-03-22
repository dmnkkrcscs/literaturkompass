'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast = { id, message, type, duration }

    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const iconClasses = 'h-5 w-5'

  const typeConfig = {
    success: {
      bg: 'bg-green-500',
      icon: <CheckCircle className={iconClasses} />,
    },
    error: {
      bg: 'bg-red-500',
      icon: <AlertCircle className={iconClasses} />,
    },
    info: {
      bg: 'bg-blue-500',
      icon: <Info className={iconClasses} />,
    },
  }

  const config = typeConfig[toast.type]

  return (
    <div
      className={`${config.bg} text-white rounded-lg p-4 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2`}
    >
      <div className="flex-shrink-0">{config.icon}</div>
      <div className="flex-1">{toast.message}</div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 hover:opacity-75 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
