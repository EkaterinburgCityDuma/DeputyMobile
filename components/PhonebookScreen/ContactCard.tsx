import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
import {View, StyleSheet, Text, Platform, Linking} from "react-native";
import {PhonebookModel} from "@/models/PhonebookModel";
import {Phone, PhoneCall} from "lucide-react-native";
import React from "react";
import { useTheme } from "@/context/ThemeContext";

interface ContactCardProps {
    item: PhonebookModel;
}

const handleCall = (phoneString: string) => {
    if (!phoneString) return;
    const primaryPhone = phoneString.split(/[а-яА-Яa-zA-Z]/)[0];
    const cleanedNumber = primaryPhone.replace(/[^\d+]/g, '');

    if (cleanedNumber) {
        Linking.openURL(`tel:${cleanedNumber}`).catch(err =>
            console.error('Не удалось открыть приложение для звонка', err)
        );
    }
};

export const ContactCard = ({ item }: ContactCardProps) => {
    const { colors, isDark } = useTheme();

    return (
    <Reveal style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowOpacity: isDark ? 0 : 0.05 }]}>
        <View style={styles.cardHeader}>
            <Text style={[styles.cardName, { color: colors.text }]}>{item.full_name}</Text>
            <Text style={[styles.cardJobTitle, { color: colors.subtext }]}>{item.job_title}</Text>
        </View>

        {item.office_number && (
            <View style={[styles.officeRow, { backgroundColor: isDark ? colors.iconBox : '#F3F4F6' }]}>
                <Text style={[styles.officeText, { color: colors.text }]}>Кабинет: {item.office_number}</Text>
            </View>
        )}

        <View style={styles.actionsContainer}>
            <MotionPressable
                style={[styles.actionButton, styles.primaryButton, { backgroundColor: colors.primary }]}
                accessibilityLabel={`Позвонить: ${item.internal_phone}`} disabled={!item.internal_phone} onPress={() => handleCall(item.internal_phone)}
            >
                <PhoneCall size={16} color="#FFF" />
                <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionLabel, { color: isDark ? '#dcfce7' : '#E0F2E9' }]}>Внутренний</Text>
                    <Text style={[styles.actionPhone, { color: '#FFF', fontWeight: "500" }]}>{item.internal_phone}</Text>
                </View>
            </MotionPressable>

            <MotionPressable
                style={[styles.actionButton, styles.secondaryButton, { backgroundColor: isDark ? colors.primary + '20' : '#E8F3EB' }]}
                accessibilityLabel={`Позвонить: ${item.city_phone}`} disabled={!item.city_phone} onPress={() => handleCall(item.city_phone)}
            >
                <Phone size={16} color={isDark ? colors.roleText : "#2A6E3F"} />
                <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionLabel, { color: colors.subtext }]}>Городской</Text>
                    <Text style={[styles.actionPhone, { color: isDark ? colors.roleText : "#2A6E3F" }]} numberOfLines={1}>
                        {item.city_phone.split(' ')[0]} {/* Показываем только первый номер визуально */}
                    </Text>
                </View>
            </MotionPressable>
        </View>
    </Reveal>
)};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: Platform.OS === 'web' ? 16 : 0,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
            android: { elevation: 3 },
            web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' } as any,
        }),
        borderWidth: 1,
        borderColor: 'rgba(42, 110, 63, 0.08)',
    },
    cardHeader: {
        marginBottom: 4,
    },
    cardName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    cardJobTitle: {
        fontSize: 12,
        color: '#818181',
        lineHeight: 18,
    },
    officeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#F3F4F6',
        alignSelf: 'flex-start',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 6,
    },
    officeText: {
        fontSize: 12,
        color: '#444',
        marginLeft: 6,
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    primaryButton: {
        backgroundColor: '#2A6E3F',
    },
    secondaryButton: {
        backgroundColor: '#E8F3EB',
    },
    actionTextContainer: {
        marginLeft: 8,
        flexDirection: 'column',
    },
    actionLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    actionPhone: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 1,
    },
})
