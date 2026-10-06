import { CatalogItem } from '@/api/catalogService';
import { ChevronRight, Folder } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
import { styles } from './file-manager-screen';
import { useTheme } from '@/context/ThemeContext';

interface CatalogCardProps {
    catalog: CatalogItem;
    onPress: (catalog: CatalogItem) => void;
}

export function CatalogCard({ catalog, onPress }: CatalogCardProps) {
    const { colors } = useTheme();
    return (
        <Reveal><MotionPressable
            accessibilityLabel={`Открыть каталог ${catalog.name}`}
            style={[styles.catalogItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onPress(catalog)}
        >
            <View style={styles.catalogContent}>
                <View style={[styles.catalogIconContainer, { backgroundColor: colors.roleBadge }]}>
                    <Folder size={24} color={colors.roleText} />
                </View>
                <View style={styles.catalogInfo}>
                    <Text style={[styles.catalogName, { color: colors.text }]} numberOfLines={1}>
                        {catalog.name}
                    </Text>
                    <Text style={[styles.catalogCount, { color: colors.subtext }]}>Каталог</Text>
                </View>
                <ChevronRight size={20} color={colors.subtext} />
            </View>
        </MotionPressable></Reveal>
    );
}
