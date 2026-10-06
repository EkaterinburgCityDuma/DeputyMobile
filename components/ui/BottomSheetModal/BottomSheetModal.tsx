import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    PanResponder,
    useWindowDimensions,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { X } from 'lucide-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { MotionPressable } from '../Shared/Motion';

interface BottomSheetModalProps {
    /** Видимость модалки */
    visible: boolean;
    /** Коллбэк закрытия */
    onClose: () => void;
    /** Заголовок модалки */
    title?: string;
    /** Содержимое */
    children: React.ReactNode;
    /**
     * Высота модалки в процентах от экрана (0..1).
     * Например, 0.7 = 70% экрана. По умолчанию 0.7.
     */
    heightFraction?: number;
    /**
     * Порог свайпа для закрытия (в пикселях).
     * По умолчанию 120.
     */
    swipeThreshold?: number;
    /** Отключить скролл содержимого (если контент фиксированный) */
    scrollEnabled?: boolean;
    /** Обработка клавиатуры через KeyboardAvoidingView */
    keyboardAvoiding?: boolean;
    /** Кастомный компонент вместо заголовка */
    renderHeader?: () => React.ReactNode;
    /** Контент футера (кнопки и т.п.), рендерится ВНЕ скролла */
    renderFooter?: () => React.ReactNode;
    /** Дополнительные стили для контейнера sheet */
    sheetStyle?: object;
    /** Дополнительные стили для контейнера контента (ScrollView contentContainer) */
    contentContainerStyle?: object;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
                                                                      visible,
                                                                      onClose,
                                                                      title,
                                                                      children,
                                                                      heightFraction = 0.7,
                                                                      swipeThreshold = 120,
                                                                      scrollEnabled = true,
                                                                      keyboardAvoiding = false,
                                                                      renderHeader,
                                                                      renderFooter,
                                                                      sheetStyle,
                                                                      contentContainerStyle,
                                                                  }) => {
    const { colors } = useTheme();
    const { height, width } = useWindowDimensions();
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();
    const sheetHeight = Math.min(height * heightFraction, 800);
    const panY = useRef(new Animated.Value(sheetHeight)).current;
    const closing = useRef(false);

    const open = useCallback(() => {
        Animated.timing(panY, {
            toValue: 0,
            duration: reducedMotion ? 0 : 260,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    }, [panY, reducedMotion]);

    const close = useCallback(
        (callback?: () => void) => {
            if (closing.current) return;
            closing.current = true;
            Animated.timing(panY, {
                toValue: sheetHeight,
                duration: reducedMotion ? 0 : 200,
                useNativeDriver: Platform.OS !== 'web',
            }).start(({ finished }) => {
                if (finished) callback?.();
                closing.current = false;
            });
        },
        [panY, sheetHeight, reducedMotion],
    );

    const handleClose = useCallback(() => {
        close(onClose);
    }, [close, onClose]);

    const panResponder = useMemo(() => PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) {
                    panY.setValue(gs.dy);
                }
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > swipeThreshold) {
                    close(onClose);
                } else {
                    Animated.timing(panY, {
                        toValue: 0,
                        duration: reducedMotion ? 0 : 180,
                        useNativeDriver: Platform.OS !== 'web',
                    }).start();
                }
            },
        }), [panY, swipeThreshold, close, onClose, reducedMotion]);

    useEffect(() => {
        if (visible) {
            closing.current = false;
            open();
        } else {
            panY.setValue(sheetHeight);
        }
    }, [visible, open, panY, sheetHeight]);

    const renderDefaultHeader = () => (
        <View style={styles.headerContainer}>
            {title ? <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text> : <View style={{ flex: 1 }} />}
            <MotionPressable onPress={handleClose} accessibilityLabel="Закрыть окно" style={[styles.closeButton, { backgroundColor: colors.iconBox }]}>
                <X size={20} color={colors.subtext} />
            </MotionPressable>
        </View>
    );

    const content = (
        <>
            {/* Drag-зона */}
            <View style={styles.dragArea}>
                <View {...panResponder.panHandlers} style={styles.dragHandle}>
                    <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
                </View>
                {renderHeader ? renderHeader() : renderDefaultHeader()}
            </View>

            {/* Основное содержимое */}
            {scrollEnabled ? (
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: renderFooter ? 20 : insets.bottom + 24 },
                        contentContainerStyle,
                    ]}
                >
                    {children}
                </ScrollView>
            ) : (
                <View
                    style={[
                        styles.staticContent,
                        { paddingBottom: insets.bottom + 24 },
                        contentContainerStyle,
                    ]}
                >
                    {children}
                </View>
            )}

            {/* Футер */}
            {renderFooter && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    {renderFooter()}
                </View>
            )}
        </>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                {/* Тап по затемнению — закрыть */}
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,20,13,0.48)', opacity: panY.interpolate({ inputRange: [0, sheetHeight], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
                    <TouchableOpacity activeOpacity={1} style={styles.dismiss} onPress={handleClose} accessibilityLabel="Закрыть окно" />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY: panY }],
                            height: sheetHeight,
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            ...(width >= 720 ? { bottom: 16, borderRadius: 24 } : {}),
                        },
                        sheetStyle,
                    ]}
                >
                    {keyboardAvoiding ? (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                        >
                            {content}
                        </KeyboardAvoidingView>
                    ) : (
                        content
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        alignItems: 'center',
    },
    dismiss: {
        flex: 1,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        maxWidth: 640,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        borderWidth: StyleSheet.hairlineWidth,
        elevation: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
    },
    dragArea: {
        paddingBottom: 4,
        width: '100%',
        alignItems: 'center',
    },
    dragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 2.5,
    },
    headerContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0b2340',
        flex: 1,
        letterSpacing: -0.4,
    },
    dragHandle: { height: 28, width: '100%', alignItems: 'center', justifyContent: 'center' },
    closeButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 4,
    },
    staticContent: {
        flex: 1,
        paddingTop: 4,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 12,
        paddingHorizontal: 0,
        backgroundColor: '#ffffff',
    },
});
