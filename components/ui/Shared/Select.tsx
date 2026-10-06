import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { MotionPressable } from './Motion';

interface SelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    items: { label: string; value: string }[];
    placeholder?: string;
}

export function Select({ value, onValueChange, items, placeholder }: SelectProps) {
    const { colors } = useTheme();
    const window = useWindowDimensions();
    const trigger = useRef<View>(null);
    const [anchor, setAnchor] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
    const selected = items.find(item => item.value === value);

    useEffect(() => { setAnchor(null); }, [window.width, window.height]);
    useEffect(() => {
        if (!anchor || Platform.OS !== 'web') return;
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setAnchor(null); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [anchor]);

    const open = () => {
        trigger.current?.measureInWindow((x, y, width, height) => {
            const menuWidth = Math.min(Math.max(width, 200), window.width - 32);
            const menuHeight = Math.min(items.length * 48 + 12, 320, window.height - 32);
            const below = window.height - y - height - 16;
            const placeBelow = below >= Math.min(menuHeight, 144) || below >= y - 16;
            const maxHeight = Math.min(menuHeight, Math.max(48, placeBelow ? below : y - 16));
            setAnchor({
                left: Math.max(16, Math.min(x, window.width - menuWidth - 16)),
                top: placeBelow ? y + height + 6 : Math.max(16, y - maxHeight - 6),
                width: menuWidth, maxHeight,
            });
        });
    };

    return (
        <View ref={trigger} collapsable={false}>
            <MotionPressable onPress={open} accessibilityLabel={selected?.label || placeholder || 'Выберите значение'} accessibilityState={{ expanded: !!anchor }}
                style={[styles.trigger, { backgroundColor: colors.background, borderColor: anchor ? colors.accent : colors.border }]}>
                <Text numberOfLines={1} style={[styles.value, { color: colors.text }]}>{selected?.label || placeholder || 'Выберите…'}</Text>
                <ChevronDown size={18} color={colors.subtext} />
            </MotionPressable>
            <Modal visible={!!anchor} transparent animationType="none" statusBarTranslucent onRequestClose={() => setAnchor(null)}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setAnchor(null)} accessibilityLabel="Закрыть список" />
                {anchor && <Animated.View accessibilityViewIsModal entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
                    style={[styles.menu, anchor, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {items.map(item => <MotionPressable key={item.value} accessibilityState={{ selected: item.value === value }}
                            onPress={() => { onValueChange(item.value); setAnchor(null); }}
                            style={[styles.item, { backgroundColor: item.value === value ? colors.roleBadge : colors.card }]}>
                            <Text style={[styles.itemText, { color: item.value === value ? colors.roleText : colors.text }]}>{item.label}</Text>
                            {item.value === value && <Check size={18} color={colors.roleText} />}
                        </MotionPressable>)}
                    </ScrollView>
                </Animated.View>}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    trigger: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    value: { flex: 1, fontSize: 14, fontWeight: '500' },
    menu: { position: 'absolute', borderWidth: 1, borderRadius: 16, padding: 6, shadowColor: '#10251a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
    item: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10 },
    itemText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
