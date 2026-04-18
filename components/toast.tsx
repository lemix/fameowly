"use client";

import { useEffect, useState, useRef } from "react";

interface ToastProps {
  /** Unique key that changes each time the toast should reset (e.g. message text) */
  message: string;
  /** Auto-dismiss delay in ms (default 2500) */
  duration?: number;
  /** Called after the exit animation finishes */
  onDone: () => void;
}

/**
 * Ephemeral toast notification.
 * Positioned just below the app header (~60px from top).
 * Resets its timer every time `message` changes.
 * pointer-events: none so it never blocks interaction.
 */
export function Toast({ message, duration = 2500, onDone }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Reset animation + timer whenever the message text changes
  useEffect(() => {
    setIsLeaving(false);
    const t1 = setTimeout(() => setIsLeaving(true), duration);
    const t2 = setTimeout(() => onDoneRef.current(), duration + 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [message, duration]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[100] flex justify-center"
      style={{ top: 60 }}
    >
      <div
        key={message}
        className={`animate-toast-in rounded-full bg-th-subtle/90 px-4 py-2 text-sm font-medium text-th-fg shadow-lg backdrop-blur-sm ring-1 ring-th-ring/50 transition-all duration-300 ${
          isLeaving ? "translate-y-[-8px] opacity-0" : ""
        }`}
      >
        {message}
      </div>
    </div>
  );
}
