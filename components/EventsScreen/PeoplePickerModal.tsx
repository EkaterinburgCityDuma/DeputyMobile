import { MotionPressable } from '@/components/ui/Shared/Motion';
import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Building2 } from "lucide-react-native";
import { BottomSheetModal as ModalBottomSheet } from "@/components/ui/BottomSheetModal/BottomSheetModal";

import { useTheme } from '@/context/ThemeContext';

type User = { id: string; full_name: string; email: string };
type Department = { id: string; name: string };

interface PeoplePickerModalProps {
    visible: boolean;
    onClose: () => void;
    users: User[];
    departments: Department[];
    selectedUserIds: string[];
    selectedDepartmentIds: string[];
    onConfirm: (userIds: string[], departmentIds: string[]) => void;
    mode: "users" | "departments" | "both";
}

export const PeoplePickerModal: React.FC<PeoplePickerModalProps> = ({
                                                                        visible,
                                                                        onClose,
                                                                        users,
                                                                        departments,
                                                                        selectedUserIds: initialUserIds,
                                                                        selectedDepartmentIds: initialDepartmentIds,
                                                                        onConfirm,
                                                                        mode = "both"
                                                                    }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"users" | "departments">(
        mode === "departments" ? "departments" : "users"
    );
    const [tempUserIds, setTempUserIds] = useState<string[]>(initialUserIds);
    const [tempDepartmentIds, setTempDepartmentIds] = useState<string[]>(initialDepartmentIds);

    useEffect(() => {
        if (visible) {
            setTempUserIds(initialUserIds);
            setTempDepartmentIds(initialDepartmentIds);
            setSearchQuery("");
            setActiveTab(mode === "departments" ? "departments" : "users");
        }
    }, [visible, initialUserIds, initialDepartmentIds, mode]);

    const toggleUser = (userId: string) => {
        setTempUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleDepartment = (deptId: string) => {
        setTempDepartmentIds(prev =>
            prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
        );
    };

    const handleConfirm = () => {
        onConfirm(tempUserIds, tempDepartmentIds);
        onClose();
    };

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUsers = () => {
        if (filteredUsers.length === 0) {
            return <Text style={styles.emptyText}>Пользователи не найдены</Text>;
        }

        return filteredUsers.map(user => (
            <MotionPressable
                key={user.id}
                style={styles.listItem}
                accessibilityRole="checkbox" accessibilityLabel={user.full_name} accessibilityState={{ checked: tempUserIds.includes(user.id) }} onPress={() => toggleUser(user.id)}
            >
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user.full_name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.userTextBlock}>
                        <Text numberOfLines={2} style={styles.itemName}>{user.full_name}</Text>
                        <Text numberOfLines={1} style={styles.itemEmail}>{user.email}</Text>
                    </View>
                </View>

                <View style={[styles.checkbox, tempUserIds.includes(user.id) && styles.checkboxChecked]}>
                    {tempUserIds.includes(user.id) && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                </View>
            </MotionPressable>
        ));
    };

    const renderDepartments = () => {
        if (filteredDepartments.length === 0) {
            return <Text style={styles.emptyText}>Отделы не найдены</Text>;
        }

        return filteredDepartments.map(dept => (
            <MotionPressable
                key={dept.id}
                style={styles.listItem}
                accessibilityRole="checkbox" accessibilityLabel={dept.name} accessibilityState={{ checked: tempDepartmentIds.includes(dept.id) }} onPress={() => toggleDepartment(dept.id)}
            >
                <View style={styles.userInfo}>
                    <View style={styles.departmentIcon}>
                        <Building2 size={22} color={colors.roleText} />
                    </View>
                    <View style={styles.userTextBlock}>
                        <Text style={styles.itemName}>{dept.name}</Text>
                    </View>
                </View>

                <View
                    style={[
                        styles.checkbox,
                        tempDepartmentIds.includes(dept.id) && styles.checkboxChecked
                    ]}
                >
                    {tempDepartmentIds.includes(dept.id) && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                </View>
            </MotionPressable>
        ));
    };

    return (
        <ModalBottomSheet
            visible={visible}
            onClose={onClose}
            title="Выбор участников"
            heightFraction={0.85}
            scrollEnabled={false}
            keyboardAvoiding
            contentContainerStyle={styles.contentContainer}
            renderFooter={() => (
                <View style={styles.actionsContainer}>
                    <MotionPressable
                        style={[styles.actionButton, styles.clearButton]}
                        onPress={() => {
                            setTempUserIds([]);
                            setTempDepartmentIds([]);
                        }}
                    >
                        <Text style={styles.clearButtonText}>Очистить все</Text>
                    </MotionPressable>

                    <MotionPressable
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={handleConfirm}
                    >
                        <Text style={styles.confirmButtonText}>Выбрать{tempUserIds.length + tempDepartmentIds.length > 0 ? ` (${tempUserIds.length + tempDepartmentIds.length})` : ""}</Text>
                    </MotionPressable>
                </View>
            )}
        >
            <View style={styles.content}>
                {/* Поиск */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={colors.subtext} />
                    <TextInput
                        style={styles.searchInput}
                        accessibilityLabel="Поиск участников" placeholder="Имя или отдел"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={colors.subtext}
                    />
                    {searchQuery !== "" && (
                        <MotionPressable accessibilityLabel="Очистить поиск" hitSlop={12} onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={20} color={colors.subtext} />
                        </MotionPressable>
                    )}
                </View>

                {/* Табы */}
                {mode === "both" && (
                    <View style={styles.tabsContainer}>
                        <MotionPressable
                            style={[styles.tab, activeTab === "users" && styles.tabActive]}
                            accessibilityRole="tab" accessibilityState={{ selected: activeTab === "users" }} onPress={() => setActiveTab("users")}
                        >
                            <Text style={[styles.tabText, activeTab === "users" && styles.tabTextActive]}>
                                Пользователи
                            </Text>
                            {tempUserIds.length > 0 && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>{tempUserIds.length}</Text>
                                </View>
                            )}
                        </MotionPressable>

                        <MotionPressable
                            style={[styles.tab, activeTab === "departments" && styles.tabActive]}
                            accessibilityRole="tab" accessibilityState={{ selected: activeTab === "departments" }} onPress={() => setActiveTab("departments")}
                        >
                            <Text style={[styles.tabText, activeTab === "departments" && styles.tabTextActive]}>
                                Отделы
                            </Text>
                            {tempDepartmentIds.length > 0 && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>{tempDepartmentIds.length}</Text>
                                </View>
                            )}
                        </MotionPressable>
                    </View>
                )}

                {/* Список */}
                <ScrollView
                    style={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {(mode === "users" || activeTab === "users") && renderUsers()}
                    {(mode === "departments" || activeTab === "departments") && mode !== "users" && renderDepartments()}
                </ScrollView>
            </View>
        </ModalBottomSheet>
    );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
    contentContainer: {
        paddingTop: 0,
    },
    content: {
        flex: 1,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        marginHorizontal: 0,
        marginTop: 12,
        marginBottom: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: colors.text,
        paddingVertical: 12,
    },

    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: 0,
        marginBottom: 12,
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    tabActive: {
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: colors.subtext,
        fontWeight: '500',
    },
    tabTextActive: {
        color: colors.roleText,
        fontWeight: '600',
    },
    tabBadge: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        minWidth: 20,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    tabBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },

    listContainer: {
        flex: 1,
        marginHorizontal: 0,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    userTextBlock: {
        flex: 1,
    },

    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.roleBadge,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.roleText,
    },

    departmentIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.roleBadge,
        justifyContent: 'center',
        alignItems: 'center',
    },

    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    itemEmail: {
        fontSize: 12,
        color: colors.subtext,
        marginTop: 2,
    },

    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },

    emptyText: {
        textAlign: 'center',
        color: colors.subtext,
        padding: 40,
    },

    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    clearButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    clearButtonText: {
        color: colors.subtext,
        fontSize: 16,
        fontWeight: '500',
    },
    confirmButton: {
        backgroundColor: colors.primary,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});