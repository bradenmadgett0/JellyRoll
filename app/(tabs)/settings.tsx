/**
 * Settings Screen — Server management, playback, data, about
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { useServerStore } from '../../services/stores/serverStore';
import { useSettingsStore } from '../../services/stores/settingsStore';
import { SERVER_TYPE_LABELS, ServerType } from '../../types/server';

const SERVER_COLORS: Record<ServerType, string> = {
    jellyfin: Colors.jellyfin,
    sonarr: Colors.sonarr,
    radarr: Colors.radarr,
    lidarr: Colors.lidarr,
};

const SERVER_ICONS: Record<ServerType, keyof typeof Ionicons.glyphMap> = {
    jellyfin: 'play-circle',
    sonarr: 'tv',
    radarr: 'film',
    lidarr: 'musical-notes',
};

const QUALITY_OPTIONS = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: '1080p' },
    { label: '720p', value: '720p' },
    { label: '480p', value: '480p' },
] as const;

const REFRESH_OPTIONS = [
    { label: 'Off', value: 0 },
    { label: '15s', value: 15 },
    { label: '30s', value: 30 },
    { label: '60s', value: 60 },
] as const;

export default function SettingsScreen() {
    const router = useRouter();
    const { servers, removeServer } = useServerStore();
    const {
        streamQuality,
        autoRefreshInterval,
        showSubtitles,
        enableNotifications,
        setStreamQuality,
        setAutoRefreshInterval,
        setShowSubtitles,
        setEnableNotifications,
    } = useSettingsStore();

    const handleDeleteServer = (id: string, name: string) => {
        if (Platform.OS === 'web') {
            if (confirm(`Remove "${name}"? This will delete the saved connection.`)) {
                removeServer(id);
            }
        } else {
            Alert.alert(
                'Remove Server',
                `Remove "${name}"? This will delete the saved connection and credentials.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => removeServer(id),
                    },
                ]
            );
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Animated.View entering={FadeInDown.duration(500)}>
                <Text style={styles.header}>Settings</Text>
            </Animated.View>

            {/* Servers Section */}
            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Servers</Text>
                    <TouchableOpacity onPress={() => router.push('/server/add')}>
                        <Ionicons name="add-circle" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {servers.length === 0 ? (
                    <View style={styles.emptyServers}>
                        <Text style={styles.emptyServersText}>No servers connected</Text>
                    </View>
                ) : (
                    servers.map((server) => (
                        <TouchableOpacity
                            key={server.id}
                            style={styles.serverRow}
                            onPress={() => router.push(`/server/${server.id}`)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.serverRowLeft}>
                                <View style={[styles.serverIcon, { backgroundColor: SERVER_COLORS[server.type] + '20' }]}>
                                    <Ionicons
                                        name={SERVER_ICONS[server.type]}
                                        size={20}
                                        color={SERVER_COLORS[server.type]}
                                    />
                                </View>
                                <View style={styles.serverInfo}>
                                    <Text style={styles.serverName}>{server.name}</Text>
                                    <Text style={styles.serverMeta}>
                                        {SERVER_TYPE_LABELS[server.type]}
                                        {server.serverVersion ? ` • v${server.serverVersion}` : ''}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleDeleteServer(server.id, server.name)}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))
                )}
            </Animated.View>

            {/* Playback Section */}
            <Animated.View entering={FadeInDown.duration(500).delay(150)}>
                <Text style={styles.sectionTitle}>Playback</Text>

                {/* Stream Quality */}
                <View style={styles.settingCard}>
                    <View style={styles.settingCardHeader}>
                        <Ionicons name="speedometer" size={20} color={Colors.primary} />
                        <Text style={styles.settingLabel}>Stream Quality</Text>
                    </View>
                    <View style={styles.segmentRow}>
                        {QUALITY_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.segmentBtn,
                                    streamQuality === opt.value && styles.segmentBtnActive,
                                ]}
                                onPress={() => setStreamQuality(opt.value as any)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.segmentText,
                                    streamQuality === opt.value && styles.segmentTextActive,
                                ]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Subtitles */}
                <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="text" size={20} color={Colors.textSecondary} />
                        <Text style={styles.settingLabel}>Show Subtitles</Text>
                    </View>
                    <Switch
                        value={showSubtitles}
                        onValueChange={setShowSubtitles}
                        trackColor={{ false: Colors.surfaceBorder, true: Colors.primary + '60' }}
                        thumbColor={showSubtitles ? Colors.primary : Colors.textTertiary}
                    />
                </View>
            </Animated.View>

            {/* Data Section */}
            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
                <Text style={styles.sectionTitle}>Data</Text>

                {/* Auto Refresh */}
                <View style={styles.settingCard}>
                    <View style={styles.settingCardHeader}>
                        <Ionicons name="refresh" size={20} color={Colors.info} />
                        <Text style={styles.settingLabel}>Auto Refresh Interval</Text>
                    </View>
                    <View style={styles.segmentRow}>
                        {REFRESH_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.segmentBtn,
                                    autoRefreshInterval === opt.value && styles.segmentBtnActive,
                                ]}
                                onPress={() => setAutoRefreshInterval(opt.value)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.segmentText,
                                    autoRefreshInterval === opt.value && styles.segmentTextActive,
                                ]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Animated.View>

            {/* Notifications Section */}
            <Animated.View entering={FadeInDown.duration(500).delay(250)}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="notifications" size={20} color={Colors.warning} />
                        <Text style={styles.settingLabel}>Download Alerts</Text>
                    </View>
                    <Switch
                        value={enableNotifications}
                        onValueChange={setEnableNotifications}
                        trackColor={{ false: Colors.surfaceBorder, true: Colors.primary + '60' }}
                        thumbColor={enableNotifications ? Colors.primary : Colors.textTertiary}
                    />
                </View>
            </Animated.View>

            {/* Appearance Section */}
            <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                <Text style={styles.sectionTitle}>Appearance</Text>
                <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="moon" size={20} color={Colors.textSecondary} />
                        <Text style={styles.settingLabel}>Theme</Text>
                    </View>
                    <View style={styles.settingValue}>
                        <Text style={styles.settingValueText}>Dark</Text>
                        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                    </View>
                </View>
            </Animated.View>

            {/* About Section */}
            <Animated.View entering={FadeInDown.duration(500).delay(350)}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.aboutCard}>
                    <View style={styles.aboutLogoContainer}>
                        <Ionicons name="planet" size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.aboutAppName}>JellyRoll</Text>
                    <Text style={styles.aboutVersion}>Version 1.0.0 · Build 1</Text>
                    <Text style={styles.aboutDescription}>
                        A unified media hub for Jellyfin and *arr services.
                    </Text>
                </View>
            </Animated.View>

            {/* Security Info */}
            <Animated.View entering={FadeInDown.duration(500).delay(400)}>
                <Text style={styles.sectionTitle}>Security</Text>
                <View style={styles.securityInfo}>
                    <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                    <Text style={styles.securityText}>
                        API keys and tokens are encrypted using {Platform.OS === 'ios' ? 'iOS Keychain' : Platform.OS === 'android' ? 'Android Keystore' : 'secure storage'}.
                        All connections use HTTPS when available.
                    </Text>
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    contentContainer: { paddingBottom: 48 },
    header: { fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.text, paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl, paddingBottom: Spacing.md },

    // Sections
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.xxl, marginBottom: Spacing.md },
    sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.xxl, marginBottom: Spacing.md },

    // Server rows
    emptyServers: { marginHorizontal: Spacing.screenPadding, backgroundColor: Colors.backgroundTertiary, borderRadius: Spacing.radiusMd, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
    emptyServersText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textTertiary },
    serverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.backgroundTertiary, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.sm, borderRadius: Spacing.radiusMd, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder },
    serverRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    serverIcon: { width: 40, height: 40, borderRadius: Spacing.radiusSm, justifyContent: 'center', alignItems: 'center' },
    serverInfo: { flex: 1 },
    serverName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
    serverMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

    // Settings rows
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.backgroundTertiary, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.sm, borderRadius: Spacing.radiusMd, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    settingLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text },
    settingValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    settingValueText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary },

    // Setting card with segments
    settingCard: { backgroundColor: Colors.backgroundTertiary, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.sm, borderRadius: Spacing.radiusMd, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder },
    settingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    segmentRow: { flexDirection: 'row', gap: Spacing.sm },
    segmentBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Spacing.radiusSm, backgroundColor: Colors.surfaceHover },
    segmentBtnActive: { backgroundColor: Colors.primary + '25', borderWidth: 1, borderColor: Colors.primary + '50' },
    segmentText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textTertiary },
    segmentTextActive: { color: Colors.primary },

    // About
    aboutCard: { backgroundColor: Colors.backgroundTertiary, marginHorizontal: Spacing.screenPadding, borderRadius: Spacing.radiusMd, padding: Spacing.xxl, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: 'center' },
    aboutLogoContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.glassHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
    aboutAppName: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.text, marginBottom: 4 },
    aboutVersion: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md },
    aboutDescription: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },

    // Security
    securityInfo: { flexDirection: 'row', backgroundColor: Colors.backgroundTertiary, marginHorizontal: Spacing.screenPadding, borderRadius: Spacing.radiusMd, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.md, alignItems: 'flex-start' },
    securityText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
});
