import { ArrowLeft, Plus, FolderPlus, Upload, Edit, Trash2, LogOut, Megaphone } from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import React from "react";
import { MotionPressable } from './Motion';
import { useTheme } from '@/context/ThemeContext';
const icons = { ArrowLeft, Plus, FolderPlus, Upload, Edit, Trash2, LogOut, Megaphone };

interface ButtonProps {
    onClick: () => void;
    iconName: keyof typeof icons;
    label?: string;
    solid?: boolean;
    danger?: boolean;
}

export const Button = ({ onClick, iconName, label, solid = false, danger = false }: ButtonProps) => {
    const { colors } = useTheme();
    const IconComponent = icons[iconName];

    return (
        <MotionPressable style={[styles.container, { backgroundColor: danger ? 'rgba(255,220,220,0.16)' : solid ? '#ffffff' : 'rgba(255,255,255,0.16)' }]} onPress={onClick} accessibilityLabel={label || (iconName === 'ArrowLeft' ? 'Назад' : iconName === 'Plus' ? 'Создать' : iconName)}>
            <View pointerEvents="none">
                <IconComponent size={20} color={danger ? '#ffe4e4' : solid ? colors.primary : '#ffffff'} />
            </View>
        </MotionPressable>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    }
})
