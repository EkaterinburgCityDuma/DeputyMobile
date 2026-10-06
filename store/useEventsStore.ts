import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';
import Toast from 'react-native-toast-message';
import { Event } from '@/models/EventModel';

interface EventsState {
    events: Event[];
    isLoading: boolean;
    error: string | null;
    fetchEvents: (year: number, month: number, isRefresh?: boolean, isOnlyMy?: boolean) => Promise<Event[]>;
}

let latestRequestId = 0;

export const useEventsStore = create<EventsState>()(
    persist(
        (set, get) => ({
            events: [],
            isLoading: false,
            error: null,

            fetchEvents: async (year: number, month: number, isRefresh = false, isOnlyMy = false) => {
                const requestId = ++latestRequestId;
                try {
                    if (!isRefresh && get().events.length === 0) {
                        set({ isLoading: true });
                    }
                    set({ error: null });

                    const from = new Date(year, month, 1).toISOString();
                    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

                    const response = await apiClient.get('/api/Events/upcoming', {
                        params: {
                            from: from,
                            to: to,
                            onlyMy: isOnlyMy
                        },
                        headers: { Accept: 'text/plain' }
                    });

                    const data: Event[] = response.data;

                    // Merge or replace events? For simplicity, we'll replace the current view's month/year events
                    // But persist-middleware will save the whole 'events' array.
                    // To keep it simple, we'll just store the latest fetched list.
                    if (requestId === latestRequestId) set({ events: data, isLoading: false });
                    return data;
                } catch (error: any) {
                    if (requestId !== latestRequestId) return get().events;
                    console.error('Events fetch error:', error);
                    const errorMessage = 'Не удалось загрузить события';

                    if (get().events.length > 0) {
                        Toast.show({
                            type: 'error',
                            text1: 'Ошибка обновления',
                            text2: errorMessage,
                        });
                        set({ isLoading: false });
                    } else {
                        set({ error: errorMessage, isLoading: false });
                    }
                    return get().events;
                }
            },
        }),
        {
            name: 'events-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
