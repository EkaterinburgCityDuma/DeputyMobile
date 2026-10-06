import { Text, TextInput, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { MotionPressable } from './Motion';
import { useTheme } from "@/context/ThemeContext";

interface SearchProps {
    placeholder: string;
    searchQuery: string;
    onChangeText: (text: string) => void;
}

export const Search = ({ placeholder, searchQuery, onChangeText }: SearchProps) => {
    const { colors, isDark } = useTheme();
    const [focused, setFocused] = useState(false);

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, shadowOpacity: isDark ? 0 : 0.04 }]}>
            <View style={styles.wrapper}>
                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.subtext }]}>Поиск</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: focused ? colors.card : colors.background, borderColor: focused ? colors.accent : colors.border }]}>
                        <Ionicons name="search-outline" size={20} color={focused ? colors.accent : colors.subtext} />
                        <TextInput
                            accessibilityLabel={placeholder}
                            style={[styles.input, { color: colors.text }]}
                            placeholder={placeholder}
                            placeholderTextColor={colors.subtext}
                            value={searchQuery}
                            onChangeText={onChangeText}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            returnKeyType="search"
                        />
                        {!!searchQuery && <MotionPressable onPress={() => onChangeText('')} accessibilityLabel="Очистить поиск" style={styles.clear}>
                            <Ionicons name="close-circle" size={20} color={colors.subtext} />
                        </MotionPressable>}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 14,
        marginTop: -24,
        borderRadius: 18,
        borderWidth: 1,
        marginHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
    },
    wrapper: {
        flexDirection: 'row',
        gap: 8,
    },
    inputContainer: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 2,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        minHeight: 48,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
        paddingVertical: 12,
    },
    clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
});
