import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { APP_NAME } from '@/config/app';

interface PageTitleContextValue {
  title: string;
  setTitle: (title: string) => void;
  resetTitle: () => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
  title: APP_NAME,
  setTitle: () => {},
  resetTitle: () => {},
});

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState(APP_NAME);

  const setTitle = useCallback((nextTitle: string) => setTitleState(nextTitle), []);
  const resetTitle = useCallback(() => setTitleState(APP_NAME), []);

  return (
    <PageTitleContext.Provider value={{ title, setTitle, resetTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(PageTitleContext);
}
