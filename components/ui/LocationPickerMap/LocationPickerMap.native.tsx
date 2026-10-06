import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Yamap, Marker } from 'react-native-yamap-plus';

interface MapProps {
    hasPermission: boolean;
    initialRegion: any;
    coords: { lat: number; lon: number } | null;
    onMapPress: (e: any) => void;
    onCameraPositionChange: (e: any) => void;
    onError?: () => void;
}

export const LocationPickerMap = forwardRef<any, MapProps>((props, ref) => {
    return (
        <Yamap
            ref={ref}
            style={styles.map}
            showUserPosition={props.hasPermission}
            initialRegion={props.initialRegion}
            onMapPress={props.onMapPress}
            onMapLongPress={props.onMapPress}
            onCameraPositionChange={props.onCameraPositionChange}
        >
            {props.coords && (
                <Marker point={{ lat: props.coords.lat, lon: props.coords.lon }}>
                    <View style={styles.markerContainer}>
                        <View style={styles.markerDot} />
                    </View>
                </Marker>
            )}
        </Yamap>
    );
});

const styles = StyleSheet.create({
    map: { flex: 1 },
    markerContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    markerDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0f6319',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 5,
    },
});
