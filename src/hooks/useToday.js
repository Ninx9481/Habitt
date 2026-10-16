import { useEffect, useState } from 'react';
import { todayStr } from '../lib/dates.js';

// Keeps "today" correct if the app stays open past midnight.
export function useToday() {
  const [today, setToday] = useState(todayStr);

  useEffect(() => {
    const check = () => setToday(todayStr());
    const id = setInterval(check, 30000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  return today;
}
