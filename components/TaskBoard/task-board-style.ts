import {Platform, StyleSheet} from "react-native";

export const styles = StyleSheet.create({

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 40, // Увеличил padding, чтобы фильтр красиво перекрывал градиент
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    headerContent: {
        marginLeft: 10
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
    },
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
    // Новые стили для фильтров
    filtersSection: {
        padding: 12,
        marginTop: -24,
        borderRadius: 20,
        marginHorizontal: 15,
        backgroundColor: "rgb(250,254,250)",
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
        overflow: 'visible',
    },
    filtersGrid: {
        flexDirection: 'row',
        gap: 8,
        zIndex: 15,
        overflow: 'visible'
    },
    filterGroup: {
        flex: 1,
        zIndex: 11,
        overflow: 'visible'
    },
    filterLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
        marginLeft: 2,
    },
    selectContainer: {
        position: 'relative',
        overflow: 'visible',
    },
    selectTrigger: {
        height: 36,
        borderWidth: 1,
        borderColor: '#D1D5DB', // gray-300
        borderRadius: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
    },
    selectValue: {
        fontSize: 14,
        color: '#111827', // gray-900
    },
    selectContent: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        marginTop: 4,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,

    },
    selectItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    selectItemText: {
        fontSize: 14,
        color: '#374151',
    },
    taskList: {
        padding: 16,
    },
    taskCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        marginBottom: 12,
        borderRadius: 20,
        borderBottomRightRadius: 20,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
        lineHeight: 20,
    },
    priorityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    datesContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
    },
    overdueText: {
        color: '#EF4444',
        fontWeight: '500',
    },
    urgentText: {
        color: '#F97316',
        fontWeight: '500',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    assigneeText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    overdueBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    overdueBadgeText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#EF4444',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        backgroundColor: '#2A6E3F',
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
