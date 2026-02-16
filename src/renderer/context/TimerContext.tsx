import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface TimerContextType {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isComplete: boolean;
  setTotalSeconds: (seconds: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  adjustTime: (deltaMinutes: number) => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [totalSeconds, setTotalSecondsState] = useState(5 * 60); // Default 5 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  // Store the target end time instead of counting down
  const [endTime, setEndTime] = useState<number | null>(null);
  // Store remaining seconds for display (calculated from endTime)
  const [remainingSeconds, setRemainingSeconds] = useState(5 * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationShownRef = useRef(false);

  // Listen for timer start events from main process (for delayed timer)
  useEffect(() => {
    window.electronAPI.timer.onStart((minutes: number) => {
      const seconds = minutes * 60;
      setTotalSecondsState(seconds);
      setRemainingSeconds(seconds);
      setIsComplete(false);
      notificationShownRef.current = false;
      // Calculate end time and start
      const newEndTime = Date.now() + seconds * 1000;
      setEndTime(newEndTime);
      setIsRunning(true);
    });
  }, []);

  // Update remaining seconds based on end time
  useEffect(() => {
    if (isRunning && endTime) {
      const updateRemaining = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        setRemainingSeconds(remaining);

        if (remaining <= 0 && !notificationShownRef.current) {
          notificationShownRef.current = true;
          setIsRunning(false);
          setIsComplete(true);
          setEndTime(null);
          // Show timer end notification
          const durationMinutes = Math.max(1, Math.round(totalSeconds / 60));
          window.electronAPI.timerEnd.show(durationMinutes);
        }
      };

      // Update immediately
      updateRemaining();

      // Then update every 100ms for smooth display (more frequent to catch up after background)
      intervalRef.current = setInterval(updateRemaining, 100);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, endTime, totalSeconds]);

  const start = useCallback(() => {
    if (remainingSeconds > 0) {
      // Calculate end time based on remaining seconds
      const newEndTime = Date.now() + remainingSeconds * 1000;
      setEndTime(newEndTime);
      setIsRunning(true);
      setIsComplete(false);
      notificationShownRef.current = false;
      // Notify main process that timer is running
      window.electronAPI.timer.setRunning(true);
    }
  }, [remainingSeconds]);

  const pause = useCallback(() => {
    if (isRunning && endTime) {
      // Calculate and store remaining seconds when pausing
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemainingSeconds(remaining);
    }
    setIsRunning(false);
    setEndTime(null);
    // Notify main process that timer is paused
    window.electronAPI.timer.setRunning(false);
  }, [isRunning, endTime]);

  const reset = useCallback(() => {
    const wasRunning = isRunning;
    setIsRunning(false);
    setEndTime(null);
    setRemainingSeconds(totalSeconds);
    setIsComplete(false);
    notificationShownRef.current = false;
    // Notify main process if timer was running
    if (wasRunning) {
      window.electronAPI.timer.setRunning(false);
    }
  }, [totalSeconds, isRunning]);

  const adjustTime = useCallback((deltaMinutes: number) => {
    if (isRunning) return;

    const newTotal = Math.max(60, totalSeconds + deltaMinutes * 60); // Minimum 1 minute
    setTotalSecondsState(newTotal);
    setRemainingSeconds(newTotal);
    setIsComplete(false);
  }, [isRunning, totalSeconds]);

  const setTotalAndRemaining = useCallback((seconds: number) => {
    if (isRunning) return;
    setTotalSecondsState(seconds);
    setRemainingSeconds(seconds);
    setIsComplete(false);
  }, [isRunning]);

  return (
    <TimerContext.Provider
      value={{
        totalSeconds,
        remainingSeconds,
        isRunning,
        isComplete,
        setTotalSeconds: setTotalAndRemaining,
        start,
        pause,
        reset,
        adjustTime,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextType {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
