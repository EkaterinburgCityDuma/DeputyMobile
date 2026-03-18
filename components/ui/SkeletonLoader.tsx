import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E8E8E8',
        borderRadius: 4,
        overflow: 'hidden',
    },
});

interface SkeletonItemProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    marginBottom?: number;
}

export const SkeletonItem: React.FC<SkeletonItemProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 12,
    marginBottom = 4
}) => {
    const shimmerAnimation = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnimation, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: false,
                }),
                Animated.timing(shimmerAnimation, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, [shimmerAnimation]);

    const opacity = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: typeof width === 'string' ? width : width,
                    height,
                    borderRadius,
                    marginBottom,
                    opacity,
                } as any,
            ]}
        />
    );
};

interface SkeletonLoaderProps {
    count?: number;
    itemHeight?: number;
    itemMargin?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    count = 5,
    itemHeight = 100,
    itemMargin = 12
}) => {
    return (
        <View style={{ padding: 16, flex: 1,  }}>
            {[...Array(count)].map((_, i) => (
                <SkeletonItem
                    key={i}
                    height={itemHeight}
                    marginBottom={itemMargin}
                    width="100%"
                />
            ))}
        </View>
    );
};
