import { LinearGradient } from "expo-linear-gradient";
import {
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
    FlatList,
    StatusBar, RefreshControl
} from "react-native";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Search } from "@/components/ui/Shared/Search";
import {ContactCard} from "@/components/PhonebookScreen/ContactCard";
import { Button } from "../ui/Shared/Button";
import {declOfNum} from "@/utils";
import { useTheme } from '@/context/ThemeContext';

export interface PhonebookModel {
    full_name: string;
    job_title: string;
    city_phone: string;
    internal_phone: string;
    office_number: string;
}

import { usePhonebookStore } from "@/store/usePhonebookStore";

export const PhonebookScreen = () => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const { data: phonebookData, isLoading: loading, fetchPhonebook } = usePhonebookStore();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadPhonebook = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        await fetchPhonebook(isRefresh);
        setRefreshing(false);
    }, [fetchPhonebook]);

    useEffect(() => {
        loadPhonebook();
    }, [loadPhonebook]);

    // Логика фильтрации
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return phonebookData;

        const lowerQuery = searchQuery.toLowerCase();
        return phonebookData.filter(item =>
            item.full_name?.toLowerCase().includes(lowerQuery) ||
            item.job_title?.toLowerCase().includes(lowerQuery) ||
            item.internal_phone?.includes(lowerQuery)
        );
    }, [phonebookData, searchQuery]);

    // Функция для звонка


    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" translucent />

            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 15 }]}
            >
                <Button onClick={() => navigation.goBack()} iconName={"ArrowLeft"}/>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Телефонная книга</Text>
                    <Text style={styles.headerSubtitle}>
                        {loading ? 'Загрузка...' : `${phonebookData.length} ${declOfNum(phonebookData.length, ['контакт', 'контакта', 'контактов'])}`}
                    </Text>
                </View>
            </LinearGradient>
            <Search
                placeholder="Имя, должность или номер"
                searchQuery={searchQuery}
                onChangeText={setSearchQuery}
            />

            <View style={styles.content}>
                {loading && !refreshing ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        keyExtractor={(item, index) => item.internal_phone + index}
                        renderItem={({ item }) => <ContactCard item={item} />}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        onRefresh={() => loadPhonebook(true)}
                        refreshing={refreshing}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => loadPhonebook(true)} colors={[colors.primary]} tintColor={colors.primary} />
                        }
                        ListEmptyComponent={
                            <View style={[styles.centerContainer, { backgroundColor: colors.card, marginHorizontal: 20, marginTop: 20, borderRadius: 20, paddingVertical: 40 }]}>
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>Ничего не найдено</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
     header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 40,
        paddingHorizontal: 20,
         marginBottom: -5,
    },
    headerContent: {
    marginLeft: 16
    },
    headerTitle: { fontSize: 22, fontWeight: '500', color: '#FFFFFF'},
    headerSubtitle: {
        fontSize: 14,
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: 1,
    },
    newTaskButton: {
        width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: "auto"
    },
    taskList: { padding: 15, paddingTop: 10 },
    listContainer: { padding: 15, paddingTop: 10 },
    departmentCard: {
        flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            padding: 12,
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#f1f5f9',
    },
    departmentIcon: {
        width: 40,
            height: 40,
            borderRadius: 25,
            backgroundColor: '#ebfdeb',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
    },
    departmentInfo: { flex: 1 },
    departmentName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
    departmentId: { fontSize: 12, color: '#64748b' },
    deleteButton: {
        padding: 8,
            borderRadius: 8,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#4b5563', marginTop: 12 },
    emptySubtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
    searchWrapper: {
        marginTop: 8,
    },
    content: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
    },
});
