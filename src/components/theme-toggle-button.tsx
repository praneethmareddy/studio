
'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/theme-provider';
import { useEffect, useState } from 'react';

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure the component is mounted before rendering theme-specific UI
  // to avoid hydration mismatch if server default differs from client preference.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder or null to avoid hydration errors
    // during server rendering or initial client render before theme is determined.
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled className="h-8 w-8" />;
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="h-8 w-8">
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
