'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { APP_SETTINGS } from '@/config/settings.config';
import { Settings } from '@/config/types';

type Path = string;

type SettingsContextType = {
  getOption: <T = any>(path: Path) => T;
  setOption: <T = any>(path: Path, value: T) => void;
  storeOption: <T = any>(path: Path, value: T) => void;
  settings: Settings;
  isReady: boolean; // ✅ جديد
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

const LOCAL_STORAGE_PREFIX = 'app_settings_';

const isBrowser = () => typeof window !== 'undefined';

// ✅ clone آمن بدل structuredClone
function deepClone<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

function getFromPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function setToPath(obj: any, path: string, value: any): Settings {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const lastObj = keys.reduce((acc, key) => (acc[key] ??= {}), obj);
  lastObj[lastKey] = value;
  return { ...obj };
}

function storeLeaf(path: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_PREFIX}${path}`,
      JSON.stringify(value),
    );
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

function getLeafFromStorage(path: string): any {
  if (!isBrowser()) return undefined;
  try {
    const item = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${path}`);
    return item ? JSON.parse(item) : undefined;
  } catch (err) {
    console.error('LocalStorage read error:', err);
    return undefined;
  }
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Settings>(() => deepClone(APP_SETTINGS));
  const [isReady, setIsReady] = useState(false); // ✅ جديد

  useEffect(() => {
    if (!isBrowser()) return;

    const init = deepClone(APP_SETTINGS);

    Object.keys(localStorage)
      .filter((key) => key.startsWith(LOCAL_STORAGE_PREFIX))
      .forEach((key) => {
        const path = key.replace(LOCAL_STORAGE_PREFIX, '');
        const value = getLeafFromStorage(path);
        if (value !== undefined) {
          setToPath(init, path, value);
        }
      });

    setSettings(init);
    setIsReady(true); // ✅ جاهز
  }, []);

  const getOption = useCallback(
    <T,>(path: string): T => getFromPath(settings, path) as T,
    [settings],
  );

  const setOption = useCallback(<T,>(path: string, value: T) => {
    setSettings((prev) => setToPath({ ...prev }, path, value));
  }, []);

  const storeOption = useCallback(<T,>(path: string, value: T) => {
    setSettings((prev) => {
      const newSettings = setToPath({ ...prev }, path, value);
      storeLeaf(path, value);
      return newSettings;
    });
  }, []);

  const contextValue = useMemo(
    () => ({ getOption, setOption, storeOption, settings, isReady }),
    [getOption, setOption, storeOption, settings, isReady],
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};
