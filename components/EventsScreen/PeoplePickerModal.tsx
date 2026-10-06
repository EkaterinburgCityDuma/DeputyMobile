import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
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
            <TouchableOpacity
                key={user.id}
                style={styles.listItem}
                onPress={() => toggleUser(user.id)}
            >
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user.full_name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.userTextBlock}>
                        <Text style={styles.itemName}>{user.full_name}</Text>
                        <Text style={styles.itemEmail}>{user.email}</Text>
                    </View>
                </View>

                <View style={[styles.checkbox, tempUserIds.includes(user.id) && styles.checkboxChecked]}>
                    {tempUserIds.includes(user.id) && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                </View>
            </TouchableOpacity>
        ));
    };

    const renderDepartments = () => {
        if (filteredDepartments.length === 0) {
            return <Text style={styles.emptyText}>Отделы не найдены</Text>;
        }

        return filteredDepartments.map(dept => (
            <TouchableOpacity
                key={dept.id}
                style={styles.listItem}
                onPress={() => toggleDepartment(dept.id)}
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
            </TouchableOpacity>
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
                    <TouchableOpacity
                        style={[styles.actionButton, styles.clearButton]}
                        onPress={() => {
                            setTempUserIds([]);
                            setTempDepartmentIds([]);
                        }}
                    >
                        <Text style={styles.clearButtonText}>Очистить все</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={handleConfirm}
                    >
                        <Text style={styles.confirmButtonText}>Сохранить</Text>
                    </TouchableOpacity>
                </View>
            )}
        >
            <View style={styles.content}>
                {/* Поиск */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={colors.subtext} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={colors.subtext}
                    />
                    {searchQuery !== "" && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={20} color={colors.subtext} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Табы */}
                {mode === "both" && (
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === "users" && styles.tabActive]}
                            onPress={() => setActiveTab("users")}
                        >
                            <Text style={[styles.tabText, activeTab === "users" && styles.tabTextActive]}>
                                Пользователи
                            </Text>
                            {tempUserIds.length > 0 && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>{tempUserIds.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab, activeTab === "departments" && styles.tabActive]}
                            onPress={() => setActiveTab("departments")}
                        >
                            <Text style={[styles.tabText, activeTab === "departments" && styles.tabTextActive]}>
                                Отделы
                            </Text>
                            {tempDepartmentIds.length > 0 && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>{tempDepartmentIds.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
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
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
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
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: colors.background,
        borderRadius: 10,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
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
        borderRadius: 10,
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
        marginHorizontal: 16,
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
        borderRadius: 10,
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