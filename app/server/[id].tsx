/**
 * Server Detail Screen — View and edit a connected server
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SOURCE_COLORS, SOURCE_ICONS } from '../../constants/Sources';
import { Spacing } from '../../constants/Spacing';
import { AppColors } from '../../hooks/useColors';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { JellyfinClient } from '../../services/api/jellyfin';
import { LidarrClient } from '../../services/api/lidarr';
import { RadarrClient } from '../../services/api/radarr';
import { SonarrClient } from '../../services/api/sonarr';
import { useServerStore } from '../../services/stores/serverStore';
import { ConnectionTestResult, SERVER_TYPE_LABELS } from '../../types/server';

export default function ServerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const styles = useThemedStyles(createStyles);
    const { getServer, removeServer, updateServer } = useServerStore();
    const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const server = getServer(id);

    if (!server) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Server not found</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const color = SOURCE_COLORS[server.type];

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            let result: ConnectionTestResult;

            if (server.type === 'jellyfin') {
                const client = new JellyfinClient(server);
                result = await client.testConnection();
            } else {
                let client;
                switch (server.type) {
                    case 'sonarr':
                        client = new SonarrClient(server);
                        break;
                    case 'radarr':
                        client = new RadarrClient(server);
                        break;
                    case 'lidarr':
                        client = new LidarrClient(server);
                        break;
                    default:
                        throw new Error('Unknown type');
                }
                result = await client.testConnection();
            }

            setTestResult(result);

            if (result.success && result.serverVersion) {
                await updateServer(server.id, {
                    serverVersion: result.serverVersion,
                    lastConnected: new Date().toISOString(),
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleDelete = () => {
        const doDelete = () => {
            removeServer(server.id);
            router.back();
        };

        if (Platform.OS === 'web') {
            if (confirm(`Remove "${server.name}"? This will delete saved credentials.`)) {
                doDelete();
            }
        } else {
            Alert.alert(
                'Remove Server',
                `Remove "${server.name}"? This will delete all saved credentials for this server.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: doDelete },
                ]
            );
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Server header */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
                <View style={[styles.iconBg, { backgroundColor: color + '20' }]}>
                    <Ionicons name={SOURCE_ICONS[server.type]} size={40} color={color} />
                </View>
                <Text style={styles.serverName}>{server.name}</Text>
                <Text style={styles.serverType}>{SERVER_TYPE_LABELS[server.type]}</Text>
                {server.serverVersion && (
                    <Text style={styles.serverVersion}>Version {server.serverVersion}</Text>
                )}
            </Animated.View>

            {/* Connection info */}
            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                <Text style={styles.sectionTitle}>Connection</Text>
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>URL</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{server.url}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Protocol</Text>
                        <View style={styles.protocolBadge}>
                            <Ionicons
                                name={server.isHttps ? 'lock-closed' : 'lock-open'}
                                size={14}
                                color={server.isHttps ? (styles.successColor.color as string) : (styles.warningColor.color as string)}
                            />
                            <Text style={[styles.protocolText, { color: server.isHttps ? (styles.successColor.color as string) : (styles.warningColor.color as string) }]}>
                                {server.isHttps ? 'HTTPS' : 'HTTP'}
                            </Text>
                        </View>
                    </View>
                    {server.lastConnected && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Last Connected</Text>
                                <Text style={styles.infoValue}>
                                    {new Date(server.lastConnected).toLocaleDateString()}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </Animated.View>

            {/* Test connection */}
            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
                <TouchableOpacity
                    style={styles.testButton}
                    onPress={handleTestConnection}
                    disabled={isTesting}
                    activeOpacity={0.7}
                >
                    {isTesting ? (
                        <ActivityIndicator size="small" color={styles.testButtonText.color as string} />
                    ) : (
                        <Ionicons name="pulse" size={20} color={styles.testButtonText.color} />
                    )}
                    <Text style={styles.testButtonText}>
                        {isTesting ? 'Testing...' : 'Test Connection'}
                    </Text>
                </TouchableOpacity>

                {testResult && (
                    <View style={[
                        styles.testResultBanner,
                        { backgroundColor: testResult.success ? (styles.successColor.color as string) + '15' : (styles.errorColor.color as string) + '15' }
                    ]}>
                        <Ionicons
                            name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                            size={20}
                            color={testResult.success ? (styles.successColor.color as string) : (styles.errorColor.color as string)}
                        />
                        <Text style={[
                            styles.testResultText,
                            { color: testResult.success ? (styles.successColor.color as string) : (styles.errorColor.color as string) }
                        ]}>
                            {testResult.success
                                ? `Connected! ${testResult.serverName} v${testResult.serverVersion}`
                                : testResult.error}
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Actions */}
            <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
                    <Ionicons name="trash" size={20} color={styles.dangerButtonText.color} />
                    <Text style={styles.dangerButtonText}>Remove Server</Text>
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
    );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    contentContainer: {
        paddingBottom: 48,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    backBtn: {
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: Spacing.radiusMd,
    },
    backBtnText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: colors.primary,
    },

    // Header
    header: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        paddingHorizontal: Spacing.screenPadding,
    },
    iconBg: {
        width: 80,
        height: 80,
        borderRadius: Spacing.radiusXl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    serverName: {
        fontFamily: 'Inter_700Bold',
        fontSize: 24,
        color: colors.text,
        marginBottom: 4,
    },
    serverType: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: colors.textSecondary,
    },
    serverVersion: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: colors.textTertiary,
        marginTop: 4,
    },

    // Sections
    sectionTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: Spacing.screenPadding,
        marginTop: Spacing.xxl,
        marginBottom: Spacing.md,
    },

    // Info card
    infoCard: {
        backgroundColor: colors.backgroundTertiary,
        marginHorizontal: Spacing.screenPadding,
        borderRadius: Spacing.radiusMd,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    infoLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: colors.textSecondary,
    },
    infoValue: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: colors.text,
        maxWidth: 200,
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: colors.surfaceBorder,
        marginHorizontal: Spacing.lg,
    },
    protocolBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    protocolText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
    },

    // Test button
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundTertiary,
        marginHorizontal: Spacing.screenPadding,
        marginTop: Spacing.lg,
        borderRadius: Spacing.radiusMd,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: colors.primary + '40',
        gap: Spacing.sm,
    },
    testButtonText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 15,
        color: colors.primary,
    },
    testResultBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.screenPadding,
        marginTop: Spacing.md,
        borderRadius: Spacing.radiusMd,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    testResultText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        flex: 1,
    },

    // Danger zone
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.error + '10',
        marginHorizontal: Spacing.screenPadding,
        borderRadius: Spacing.radiusMd,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: colors.error + '30',
        gap: Spacing.sm,
    },
    dangerButtonText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 15,
        color: colors.error,
    },

    // Color tokens for inline use
    successColor: { color: colors.success },
    warningColor: { color: colors.warning },
    errorColor: { color: colors.error },
});
