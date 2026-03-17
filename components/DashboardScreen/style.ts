import {Platform, StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 32,
    },
    headerContent: {
        paddingHorizontal: 20,
    },
    userInfoRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    userProfileButton: {
        flexDirection: 'row',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'white',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatarText: {
        color: '#2A6E3F',
        fontSize: 18,
        fontWeight: '600',
    },
    userInfo: {
        justifyContent: 'center',
    },
    greeting: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
    },
    userName: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginLeft: "auto"
    },
    jobTitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        marginLeft: 8,
    },
    organization: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        marginLeft: 8,
        marginBottom: 8
    },
    content: {
        paddingHorizontal: 15,
        marginTop: -24,
        paddingBottom: 40,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 16,
    },
    statCardContainer: {
        flex: 1,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        backgroundColor: '#ffffff',

    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,

        // Обязательно для iOS:
        backgroundColor: '#fff',
        overflow: 'visible', // Тень не будет обрезаться

        // Настройки тени для iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, // Смещение чуть больше для объема
        shadowOpacity: 0.15, // Немного увеличили для видимости
        shadowRadius: 8,     // Сделали тень мягче (размытее)

        // Настройки для Android
        elevation: 4,

        // Фишка для Liquid Glass: тонкий блик по краю
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
        color: '#000000',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    warningBanner: {
        backgroundColor: '#FFF3E0',
        borderRadius: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    warningContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-start',
    },
    warningIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    warningTextContainer: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E65100',
        marginBottom: 4,
    },
    warningMessage: {
        fontSize: 13,
        fontWeight: '600',
        color: '#474747',
        lineHeight: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: -5,
        marginLeft: 2,
    },
    sectionLink: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        color: '#2A6E3F',
        fontWeight: '500',
        marginRight: 4,
    },
    cardsContainer: {
        marginTop: 4,
        gap: 4,
    },
    eventDate: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8f8f8f',
        marginBottom: 4,
        paddingHorizontal: 2,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 16,
        paddingVertical: 18,
    },
    taskIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    documentIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTextContainer: {
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 8,
    },
    cardTags: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    timeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {

        fontSize: 12,
    },
    eventDateContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2a6f3d',
        backgroundColor: 'rgb(224,232,226)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    eventDay: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2a6f3d',
    },
    eventMonth: {
        fontSize: 10,
        color: '#2a6f3d',
        opacity: 0.9,
        marginTop: 2,
    },
    eventTime: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    eventTimeText: {
        fontSize: 12,
        color: '#6b7280',
    },
    publicBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    publicBadgeText: {
        fontSize: 12,
        color: '#2E7D32',
        fontWeight: '500',
    },
    documentInfo: {
        fontSize: 12,
        color: '#6b7280',
    },
    emptyCard: {
        backgroundColor: '#F8FFF9',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        backgroundColor: '#fdf9f9',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    emptyMainTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMainSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
});
