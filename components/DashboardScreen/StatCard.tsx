import {styles} from "@/components/DashboardScreen/style";
import {Text, View} from "react-native";
import {declOfNum} from "@/utils";
import React from "react";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
const icons = { Calendar, CheckCircle2, AlertCircle };

interface StatCardProps {
    iconName: keyof typeof icons;
    count: number;
    labels: [string, string, string];
    delay: number;
    onPress?: () => void;
}

export const StatCard = ({iconName, count, labels, delay, onPress} : StatCardProps) => {
    const { colors } = useTheme();
    const IconComponent = icons[iconName];
    return(
        <Reveal style={styles.statCardContainer} index={delay / 200}>
            <MotionPressable
                onPress={onPress} accessibilityLabel={`${count} ${declOfNum(count, labels)}`}
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
                <View style={[styles.statIcon, { backgroundColor: iconName === 'AlertCircle' ? colors.dangerSurface : colors.roleBadge }]}>
                    <IconComponent size={20} color={iconName === 'AlertCircle' ? colors.danger : colors.roleText} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{count}</Text>
                <Text style={[styles.statLabel, { color: colors.subtext }]}>{declOfNum(count, labels)}</Text>
            </MotionPressable>
        </Reveal>
    )
};
