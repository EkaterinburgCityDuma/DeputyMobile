import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { ToastConfig } from 'react-native-toast-message';
import { CheckCircle2, Info, XCircle, Calendar, Bell } from "lucide-react-native";
import { useTheme } from '@/context/ThemeContext';


const ToastLayout = ({
    text1,
    text2,
    type,
    icon: CustomIcon
}: {
    text1?: string;
    text2?: string;
    type: 'success' | 'error' | 'info' | 'notification';
    icon?: any;
}) => {
    const { isDark, colors } = useTheme();
    const { width } = useWindowDimensions();

    let Icon = Info;
    let color = isDark ? '#60a5fa' : '#3b82f6';
    let iconBg = isDark ? '#3D4452' : '#E8EEF9';

    if (type === 'success') {
        Icon = CheckCircle2;
        color = isDark ? '#34d399' : '#10b981';
        iconBg = isDark ? '#324D45' : '#E9F7F2';
    } else if (type === 'error') {
        Icon = XCircle;
        color = isDark ? '#f87171' : '#ef4444';
        iconBg = isDark ? '#4D3A3A' : '#FCEAEA';
    } else if (type === 'notification') {
        Icon = Bell;
        color = isDark ? '#fbbf24' : '#f59e0b';
        iconBg = isDark ? '#4D4432' : '#FBF4E9';
    }

    if (CustomIcon) Icon = CustomIcon;

    return (
        <View style={styles.outerContainer} accessibilityLiveRegion="polite">
            <View
                style={[
                    styles.container,
                    {
                        width: Math.min(width - 32, 420),
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                    }
                ]}
            >
                <View style={styles.content}>
                    <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                        <Icon color={color} size={22} strokeWidth={2.5} />
                    </View>
                    <View style={styles.textContainer}>
                        {text1 && (
                            <Text
                                style={[styles.text1, { color: colors.text }]}
                                numberOfLines={1}
                            >
                                {text1}
                            </Text>
                        )}
                        {text2 && (
                            <Text
                                style={[styles.text2, { color: colors.subtext }]}
                                numberOfLines={2}
                            >
                                {text2}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

export const toastConfig: ToastConfig = {
    success: (props) => <ToastLayout {...props} type="success" />,
    error: (props) => <ToastLayout {...props} type="error" />,
    info: (props) => <ToastLayout {...props} type="info" />,
    customNotification: ({ text1, props }: any) => {
        const isEvent = text1?.includes('событии') || text1?.includes('🔔');
        return (
            <ToastLayout
                text1={props?.title || text1}
                text2={props?.time ? `Начало: ${props.time}` : text1}
                type="notification"
                icon={isEvent ? Calendar : Bell}
            />
        );
    }
};

const styles = StyleSheet.create({
    outerContainer: {
        paddingTop: 10,
        alignItems: 'center',

    },
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,

        // Тень
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    content: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    text1: {
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 18,
    },
    text2: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
        lineHeight: 16,
    }
});
