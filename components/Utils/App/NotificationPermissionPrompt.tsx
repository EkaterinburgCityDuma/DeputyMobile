import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface NotificationPermissionPromptProps {
    visible: boolean;
    onAllow: () => void;
    onDismiss: () => void;
}

export function NotificationPermissionPrompt({ visible, onAllow, onDismiss }: NotificationPermissionPromptProps) {
    const { colors } = useTheme();
    if (!visible) return null;

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.overlay}>
                <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.icon, { backgroundColor: colors.roleBadge }]}>
                        <Bell size={26} color={colors.roleText} />
                    </View>
                    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Уведомления</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>
                        Напомним о мероприятиях и сроках задач, даже когда приложение закрыто.
                    </Text>
                    <TouchableOpacity accessibilityRole="button" onPress={onAllow} style={[styles.button, { backgroundColor: colors.primary }]}>
                        <Text style={styles.buttonText}>Разрешить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" onPress={onDismiss} style={styles.laterButton}>
                        <Text style={[styles.laterText, { color: colors.subtext }]}>Не сейчас</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
    card: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 24 },
    icon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, lineHeight: 26, fontWeight: '600', marginBottom: 8 },
    description: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
    button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
    buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
    laterButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 10, marginTop: 4 },
    laterText: { fontSize: 14, fontWeight: '500' },
});
