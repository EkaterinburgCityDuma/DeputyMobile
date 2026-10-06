import {styles} from "@/components/DashboardScreen/style";
import {TouchableOpacity, View} from "react-native";
import {SkeletonItem} from "@/components/ui/Shared/SkeletonLoader";
import React from "react";
import { useTheme } from '@/context/ThemeContext';

interface HeaderSkeletonProps {
    insetsTop: number;
}

export const HeaderSkeleton = ({ insetsTop }: HeaderSkeletonProps) => {
    const { colors } = useTheme();
    return (
        <View
            style={[styles.header, { paddingTop: insetsTop + 20, backgroundColor: colors.primary }]}
        >
            <View style={styles.headerContent}>
                <View style={styles.userInfoRow}>
                    <TouchableOpacity style={styles.userProfileButton} disabled>
                        <View style={styles.avatarContainer}>
                            <SkeletonItem
                                width={50}
                                height={50}
                                borderRadius={25}
                                marginBottom={0}
                            />
                        </View>
                        <View style={styles.userInfo}>
                            <SkeletonItem
                                width={80}
                                height={14}
                                borderRadius={4}
                                marginBottom={8}
                            />
                            <SkeletonItem
                                width={120}
                                height={20}
                                borderRadius={4}
                                marginBottom={0}
                            />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.notificationButton}>
                        <SkeletonItem
                            width={40}
                            height={40}
                            borderRadius={20}
                            marginBottom={0}
                        />
                    </View>
                    <View style={styles.notificationButton}>
                        <SkeletonItem
                            width={40}
                            height={40}
                            borderRadius={20}
                            marginBottom={0}
                        />
                    </View>
                </View>
                <SkeletonItem
                    width={150}
                    height={18}
                    borderRadius={4}
                    marginBottom={8}
                />
                <SkeletonItem
                    width={200}
                    height={14}
                    borderRadius={4}
                    marginBottom={0}
                />
            </View>
        </View>
    );
};
