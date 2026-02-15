/**
 * ConnectionBanner — Animated banner showing server connectivity issues
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { Spacing } from '../../constants/Spacing';
import { AppColors } from '../../hooks/useColors';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface ConnectionBannerProps {
    serverName: string;
    isConnected: boolean;
    onRetry?: () => void;
}

export function ConnectionBanner({ serverName, isConnected, onRetry }: ConnectionBannerProps) {
    const styles = useThemedStyles(createStyles);
    const height = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (!isConnected) {
            height.value = withTiming(52, { duration: 300, easing: Easing.out(Easing.ease) });
            opacity.value = withDelay(100, withTiming(1, { duration: 200 }));
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            height.value = withDelay(200, withTiming(0, { duration: 300 }));
        }
    }, [isConnected, height, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: height.value,
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.content}>
                <Ionicons name="cloud-offline" size={16} color={styles.warningColor.color} />
                <Text style={styles.text} numberOfLines={1}>
                    {serverName} is unreachable
                </Text>
                {onRetry && (
                    <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.7}>
                        <Ionicons name="refresh" size={14} color={styles.retryText.color} />
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: colors.warning + '12',
        borderBottomWidth: 1,
        borderBottomColor: colors.warning + '30',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.screenPadding,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
        height: 52,
    },
    text: {
        flex: 1,
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: colors.warning,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        borderRadius: Spacing.radiusSm,
        backgroundColor: colors.surfaceHover,
    },
    retryText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
        color: colors.text,
    },

    // Color tokens for inline use
    warningColor: { color: colors.warning },
});
