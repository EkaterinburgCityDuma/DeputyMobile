import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
interface MapProps {
    hasPermission: boolean;
    initialRegion: any;
    coords: { lat: number; lon: number } | null;
    onMapPress: (e: any) => void;
    onCameraPositionChange: (e: any) => void;
    onError?: () => void;
}
let apiPromise: Promise<any> | undefined;
function loadMaps(apiKey: string) {
    if (!apiPromise) {
        apiPromise = new Promise<any>((resolve, reject) => {
            const callback = `eventMapReady${Date.now()}`;
            const errorCallback = `${callback}Error`;
            const globals = window as any;
            const script = document.createElement('script');
            const cleanup = () => {
                clearTimeout(timeout);
                delete globals[callback];
                delete globals[errorCallback];
                script.onerror = null;
            };
            const fail = () => {
                cleanup();
                script.remove();
                reject(new Error('Не удалось загрузить Яндекс Карты'));
            };
            const timeout = setTimeout(fail, 12000);
            globals[callback] = (api: any) => {
                try {
                    api.ready(() => { cleanup(); resolve(api); });
                } catch { fail(); }
            };
            globals[errorCallback] = fail;
            script.onerror = fail;
            const query = new URLSearchParams({ apikey: apiKey, lang: 'ru_RU', onload: callback, onerror: errorCallback, ns: 'eventMapsApi' });
            script.src = `https://api-maps.yandex.ru/2.1/?${query}`;
            script.async = true;
            document.head.appendChild(script);
        }).catch(error => { apiPromise = undefined; throw error; });
    }
    return apiPromise;
}

export const LocationPickerMap = forwardRef<any, MapProps>((props, ref) => {
    const { colors } = useTheme();
    const container = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const propsRef = useRef(props);
    propsRef.current = props;
    useImperativeHandle(ref, () => ({ setCenter: (coords: { lat: number; lon: number }, zoom = 16) => {
        // A cancelled camera animation does not mean the map is unavailable.
        mapRef.current?.setCenter([coords.lat, coords.lon], zoom)?.catch(() => {});
    } }), []);
    useEffect(() => {
        const apiKey = process.env.EXPO_PUBLIC_GEOCODER_API_KEY?.trim();
        if (!apiKey) { propsRef.current.onError?.(); return; }
        let disposed = false;
        loadMaps(apiKey).then(api => {
            if (disposed || !container.current) return;
            const initial = propsRef.current.initialRegion;
            const map = new api.Map(container.current, {
                center: [initial?.lat ?? 56.837239, initial?.lon ?? 60.597887], zoom: initial?.zoom ?? 16,
            }, { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
            mapRef.current = map;
            map.events.add('click', (event: any) => {
                const [lat, lon] = event.get('coords');
                propsRef.current.onMapPress({ nativeEvent: { lat, lon } });
            });
            map.events.add('boundschange', () => {
                const [lat, lon] = map.getCenter();
                propsRef.current.onCameraPositionChange({ nativeEvent: { point: { lat, lon }, zoom: map.getZoom() } });
            });
            const coords = propsRef.current.coords;
            markerRef.current = new api.Placemark(coords ? [coords.lat, coords.lon] : map.getCenter(), {}, { preset: 'islands#darkGreenDotIcon' });
            map.geoObjects.add(markerRef.current);
        }).catch(() => { if (!disposed) propsRef.current.onError?.(); });
        return () => { disposed = true; mapRef.current?.destroy(); mapRef.current = null; };
    }, []);
    useEffect(() => {
        if (props.coords) markerRef.current?.geometry.setCoordinates([props.coords.lat, props.coords.lon]);
    }, [props.coords]);
    return <div ref={container} style={{ flex: 1, backgroundColor: colors.background }} />;
});
LocationPickerMap.displayName = 'LocationPickerMap';
