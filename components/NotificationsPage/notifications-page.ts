import {Platform, StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
          backgroundColor: '#ffffff',
        flex: 1,

    },
    header: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 32,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        paddingHorizontal: 4,
    },
    headerTitleContainer: {
        marginRight: 12,
        marginLeft: 8,
        justifyContent: 'center',
        minHeight: 40,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 600,
        lineHeight: 24,
        maxWidth: '100%',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 1,
    },
    markAllButton: {
        marginLeft: "auto",
        paddingVertical: 6,
    },
    markAllText: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    filtersSection: {
        padding: 12,
        marginTop: -24,
        borderRadius: 20,
        marginHorizontal: 15,
        backgroundColor: "transparent",
        zIndex: 10,
    },
    filtersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    filtersGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    filterGroup: {
        flex: 1,
    },
    filterLabel: {
        fontSize: 14,
        color: '#333333', // gray-600
        marginBottom: 4,
    },
    selectContainer: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    selectValue: {
        fontSize: 14,
        color: '#374151',
    },
    filterScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#2A6E3F',
    },
    filterChipText: {
        fontSize: 14,
        color: '#6B7280',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        paddingBottom: 24,

    },
    notificationItem: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },

    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E6F4EA', // мягкий зелёный фон
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    content: {
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },

    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },

    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginRight: 8,
    },

    time: {
        fontSize: 12,
        color: '#6B7280',
    },

    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    unreadTitle: {
        color: '#111827',
    },
    readTitle: {
        color: '#6B7280',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2A6E3F',
        marginTop: 4,
    },
    message: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
        lineHeight: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F3F4F6',
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
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    errorContainer: {
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 32,
        borderRadius: 20,
        borderWidth: 1,
    },
    errorTitle: {
        fontSize: 18,
        lineHeight: 24,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 48,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        flexWrap: 'wrap',
    },
    retryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
});
