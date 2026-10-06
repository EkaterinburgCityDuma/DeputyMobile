import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const themeColors = {
    light: {
        background: '#f4f6f5',
        card: '#ffffff',
        text: '#18241f',
        subtext: '#637269',
        primary: '#246343',
        secondary: '#337a51',
        accent: '#246343',
        border: '#e2e8e4',
        iconBox: '#f0f3f1',
        roleBadge: '#e8f3ec',
        roleText: '#246343',
        divider: '#edf1ee',
        danger: '#b93838',
        dangerSurface: '#fff0ef',
        actionIcon: {
            events: '#f5f3ff',
            tasks: '#f0fdf4',
        },
        actionIconColor: {
            events: '#7c3aed',
            tasks: '#087530',
        }
    },
    dark: {
        background: '#101714',
        card: '#1a2420',
        text: '#edf3ef',
        subtext: '#a3b3a9',
        primary: '#286544',
        secondary: '#347c53',
        accent: '#91d5ad',
        border: '#304037',
        iconBox: '#25332b',
        roleBadge: '#253d2e',
        roleText: '#a4dfbb',
        divider: '#2a3730',
        danger: '#ffa8a0',
        dangerSurface: '#422927',
        actionIcon: {
            events: '#2e1065',
            tasks: '#064e3b',
        },
        actionIconColor: {
            events: '#a78bfa',
            tasks: '#4ade80',
        }
    }
};

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    theme: ResolvedTheme;
    colors: typeof themeColors.light;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'user-theme-mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('system');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadThemeMode = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
                if (
                    savedMode === 'light' ||
                    savedMode === 'dark' ||
                    savedMode === 'system'
                ) {
                    setMode(savedMode);
                }
            } catch (e) {
                console.error('Ошибка загрузки темы:', e);
            } finally {
                setIsLoaded(true);
            }
        };

        loadThemeMode();
    }, []);

    const resolvedTheme: ResolvedTheme = useMemo(() => {
        if (mode === 'system') {
            return systemColorScheme === 'dark' ? 'dark' : 'light';
        }
        return mode;
    }, [mode, systemColorScheme]);

    const setThemeMode = async (newMode: ThemeMode) => {
        try {
            setMode(newMode);
            await AsyncStorage.setItem(STORAGE_KEY, newMode);
        } catch (e) {
            console.error('Ошибка сохранения темы:', e);
        }
    };

    const toggleTheme = async () => {
        const newMode: ThemeMode = resolvedTheme === 'light' ? 'dark' : 'light';
        await setThemeMode(newMode);
    };

    const colors = themeColors[resolvedTheme];
    const isDark = resolvedTheme === 'dark';

    // Необязательно, но полезно для web:
    // синхронизируем фон body/html, чтобы не было белых краёв
    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.documentElement.style.backgroundColor = colors.background;
            document.body.style.backgroundColor = colors.background;
            document.documentElement.setAttribute('data-theme', resolvedTheme);
            document.documentElement.style.colorScheme = resolvedTheme;
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.background);
        }
    }, [resolvedTheme, colors.background]);

    if (!isLoaded) {
        return null;
    }

    return (
        <ThemeContext.Provider
            value={{
                mode,
                theme: resolvedTheme,
                colors,
                isDark,
                setThemeMode,
                toggleTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
