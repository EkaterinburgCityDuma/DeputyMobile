import React from 'react';
import { Animated as NativeAnimated, Platform, Pressable, PressableProps, ViewProps } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Small, consistent feedback for touch, mouse and keyboard activation. */
export function MotionPressable({ style, onPressIn, onPressOut, onHoverIn, onHoverOut, disabled, ...props }: PressableProps) {
    const reducedMotion = useReducedMotion();
    const [pressed, setPressed] = React.useState(false);
    const scale = useSharedValue(1);
    const hover = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: disabled ? 0.5 : 1 - hover.value * 0.06,
    }));

    return (
        <AnimatedPressable
            {...props}
            disabled={disabled}
            accessibilityRole={props.accessibilityRole ?? 'button'}
            accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
            style={[typeof style === 'function' ? style({ pressed }) : style, animatedStyle]}
            onPressIn={event => {
                if (typeof style === 'function') setPressed(true);
                if (!reducedMotion) scale.value = withTiming(0.98, { duration: 100 });
                onPressIn?.(event);
            }}
            onPressOut={event => {
                if (typeof style === 'function') setPressed(false);
                scale.value = withSpring(1, { damping: 22, stiffness: 320, reduceMotion: ReduceMotion.System });
                onPressOut?.(event);
            }}
            onHoverIn={event => {
                hover.value = withTiming(1, { duration: reducedMotion ? 0 : 140 });
                onHoverIn?.(event);
            }}
            onHoverOut={event => {
                hover.value = withTiming(0, { duration: reducedMotion ? 0 : 140 });
                onHoverOut?.(event);
            }}
        />
    );
}

export function Reveal({ index = 0, style, ...props }: ViewProps & { index?: number }) {
    const reducedMotion = useReducedMotion();
    const progress = React.useRef(new NativeAnimated.Value(reducedMotion ? 1 : 0)).current;
    React.useEffect(() => {
        const animation = NativeAnimated.timing(progress, {
            toValue: 1, duration: reducedMotion ? 0 : 240,
            delay: reducedMotion ? 0 : Math.min(index, 5) * 35,
            useNativeDriver: Platform.OS !== 'web',
        });
        animation.start();
        return () => animation.stop();
    }, [progress, index, reducedMotion]);
    return <NativeAnimated.View {...props} style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]} />;
}
