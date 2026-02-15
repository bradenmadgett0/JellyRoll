/**
 * Add Server Wizard — Multi-step form for connecting new servers
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { JellyfinClient } from '../../services/api/jellyfin';
import { LidarrClient } from '../../services/api/lidarr';
import { RadarrClient } from '../../services/api/radarr';
import { SonarrClient } from '../../services/api/sonarr';
import { useServerStore } from '../../services/stores/serverStore';
import { SERVER_TYPE_DESCRIPTIONS, SERVER_TYPE_LABELS, ServerType } from '../../types/server';

type Step = 'type' | 'connection' | 'credentials' | 'testing' | 'success';

const SERVER_TYPES: { type: ServerType; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { type: 'jellyfin', icon: 'play-circle', color: Colors.jellyfin },
    { type: 'sonarr', icon: 'tv', color: Colors.sonarr },
    { type: 'radarr', icon: 'film', color: Colors.radarr },
    { type: 'lidarr', icon: 'musical-notes', color: Colors.lidarr },
];

export default function AddServerScreen() {
    const router = useRouter();
    const addServer = useServerStore((s) => s.addServer);

    const [step, setStep] = useState<Step>('type');
    const [serverType, setServerType] = useState<ServerType | null>(null);
    const [url, setUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);
    const [serverName, setServerName] = useState('');
    const [serverVersion, setServerVersion] = useState('');
    const [useHttp, setUseHttp] = useState(false);

    const isJellyfin = serverType === 'jellyfin';

    const normalizeUrl = (input: string): string => {
        let normalized = input.trim();
        // Remove trailing slash
        if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
        // Add protocol if missing
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = (useHttp ? 'http://' : 'https://') + normalized;
        }
        return normalized;
    };

    const handleSelectType = (type: ServerType) => {
        setServerType(type);
        setStep('connection');
    };

    const handleConnection = () => {
        if (!url.trim()) {
            setTestError('Please enter a server URL');
            return;
        }
        setTestError(null);
        setStep(isJellyfin ? 'credentials' : 'testing');
        if (!isJellyfin) {
            testConnection();
        }
    };

    const handleCredentials = () => {
        if (isJellyfin && (!username.trim() || !password.trim())) {
            setTestError('Please enter both username and password');
            return;
        }
        if (!isJellyfin && !apiKey.trim()) {
            setTestError('Please enter an API key');
            return;
        }
        setTestError(null);
        setStep('testing');
        testConnection();
    };

    const testConnection = async () => {
        setIsTesting(true);
        setTestError(null);

        const normalizedUrl = normalizeUrl(url);

        try {
            if (isJellyfin) {
                const client = new JellyfinClient({
                    id: 'temp',
                    name: '',
                    type: 'jellyfin',
                    url: normalizedUrl,
                    isHttps: normalizedUrl.startsWith('https'),
                    httpAllowed: useHttp,
                    sortOrder: 0,
                });

                // First test basic connectivity
                const connResult = await client.testConnection();
                if (!connResult.success) {
                    throw new Error(connResult.error || 'Could not reach server');
                }

                // Then authenticate
                const authResult = await client.authenticateByName(username, password);

                setServerName(connResult.serverName || 'Jellyfin Server');
                setServerVersion(connResult.serverVersion || '');

                // Save server
                await addServer({
                    name: connResult.serverName || 'Jellyfin Server',
                    type: 'jellyfin',
                    url: normalizedUrl,
                    accessToken: authResult.AccessToken,
                    userId: authResult.User.Id,
                    isHttps: normalizedUrl.startsWith('https'),
                    httpAllowed: useHttp,
                    lastConnected: new Date().toISOString(),
                    serverVersion: connResult.serverVersion,
                });

                setStep('success');
            } else {
                // *arr servers
                const tempConfig = {
                    id: 'temp',
                    name: '',
                    type: serverType!,
                    url: normalizedUrl,
                    apiKey,
                    isHttps: normalizedUrl.startsWith('https'),
                    httpAllowed: useHttp,
                    sortOrder: 0,
                };

                let client;
                switch (serverType) {
                    case 'sonarr':
                        client = new SonarrClient(tempConfig);
                        break;
                    case 'radarr':
                        client = new RadarrClient(tempConfig);
                        break;
                    case 'lidarr':
                        client = new LidarrClient(tempConfig);
                        break;
                    default:
                        throw new Error('Unknown server type');
                }

                const result = await client.testConnection();
                if (!result.success) {
                    throw new Error(result.error || 'Connection failed');
                }

                setServerName(result.serverName || SERVER_TYPE_LABELS[serverType!]);
                setServerVersion(result.serverVersion || '');

                // Save server
                await addServer({
                    name: result.serverName || SERVER_TYPE_LABELS[serverType!],
                    type: serverType!,
                    url: normalizedUrl,
                    apiKey,
                    isHttps: normalizedUrl.startsWith('https'),
                    httpAllowed: useHttp,
                    lastConnected: new Date().toISOString(),
                    serverVersion: result.serverVersion,
                });

                setStep('success');
            }
        } catch (error) {
            setTestError(error instanceof Error ? error.message : 'Connection failed');
            setStep(isJellyfin ? 'credentials' : 'connection');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Step 1: Select Server Type */}
                {step === 'type' && (
                    <Animated.View entering={FadeInDown.duration(500)}>
                        <Text style={styles.stepTitle}>Choose Server Type</Text>
                        <Text style={styles.stepSubtitle}>
                            What type of server would you like to connect?
                        </Text>

                        <View style={styles.typeGrid}>
                            {SERVER_TYPES.map((st, index) => (
                                <Animated.View
                                    key={st.type}
                                    entering={FadeInDown.duration(400).delay(100 + index * 80)}
                                >
                                    <TouchableOpacity
                                        style={styles.typeCard}
                                        onPress={() => handleSelectType(st.type)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.typeIconBg, { backgroundColor: st.color + '20' }]}>
                                            <Ionicons name={st.icon} size={32} color={st.color} />
                                        </View>
                                        <Text style={styles.typeLabel}>{SERVER_TYPE_LABELS[st.type]}</Text>
                                        <Text style={styles.typeDescription}>{SERVER_TYPE_DESCRIPTIONS[st.type]}</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Step 2: Server URL */}
                {step === 'connection' && (
                    <Animated.View entering={FadeInRight.duration(400)}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setStep('type')}>
                            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>

                        <Text style={styles.stepTitle}>Server Address</Text>
                        <Text style={styles.stepSubtitle}>
                            Enter the URL of your {SERVER_TYPE_LABELS[serverType!]} server.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Server URL</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="https://your-server.com:8096"
                                placeholderTextColor={Colors.textTertiary}
                                value={url}
                                onChangeText={setUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                returnKeyType="next"
                            />
                        </View>

                        {/* HTTP toggle for local network */}
                        <TouchableOpacity
                            style={styles.httpToggle}
                            onPress={() => setUseHttp(!useHttp)}
                        >
                            <Ionicons
                                name={useHttp ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={useHttp ? Colors.warning : Colors.textTertiary}
                            />
                            <View>
                                <Text style={styles.httpToggleText}>Allow HTTP (local network)</Text>
                                {useHttp && (
                                    <Text style={styles.httpWarning}>
                                        ⚠️ HTTP is not encrypted. Only use on trusted local networks.
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {!isJellyfin && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>API Key</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your API key"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={apiKey}
                                    onChangeText={setApiKey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    secureTextEntry
                                />
                                <Text style={styles.inputHint}>
                                    Found in {SERVER_TYPE_LABELS[serverType!]} → Settings → General → API Key
                                </Text>
                            </View>
                        )}

                        {testError && (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                                <Text style={styles.errorText}>{testError}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={isJellyfin ? handleConnection : handleCredentials}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>
                                {isJellyfin ? 'Next' : 'Test Connection'}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Step 3: Jellyfin Credentials */}
                {step === 'credentials' && isJellyfin && (
                    <Animated.View entering={FadeInRight.duration(400)}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setStep('connection')}>
                            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>

                        <Text style={styles.stepTitle}>Sign In</Text>
                        <Text style={styles.stepSubtitle}>
                            Enter your Jellyfin username and password.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Your Jellyfin username"
                                placeholderTextColor={Colors.textTertiary}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.textInput, styles.passwordInput]}
                                    placeholder="Your password"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    style={styles.showPasswordBtn}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off' : 'eye'}
                                        size={20}
                                        color={Colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {testError && (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                                <Text style={styles.errorText}>{testError}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleCredentials}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Connect</Text>
                            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Step 4: Testing Connection */}
                {step === 'testing' && (
                    <Animated.View entering={FadeInDown.duration(400)} style={styles.testingContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.testingText}>
                            Connecting to {SERVER_TYPE_LABELS[serverType!]}...
                        </Text>
                        <Text style={styles.testingSubtext}>
                            {normalizeUrl(url)}
                        </Text>
                    </Animated.View>
                )}

                {/* Step 5: Success */}
                {step === 'success' && (
                    <Animated.View entering={FadeInDown.duration(600)} style={styles.successContainer}>
                        <View style={styles.successIconBg}>
                            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
                        </View>
                        <Text style={styles.successTitle}>Connected!</Text>
                        <Text style={styles.successServerName}>{serverName}</Text>
                        {serverVersion && (
                            <Text style={styles.successVersion}>Version {serverVersion}</Text>
                        )}
                        <Text style={styles.successMessage}>
                            Your {SERVER_TYPE_LABELS[serverType!]} server has been added successfully.
                            {isJellyfin
                                ? ' You can now browse your media library.'
                                : ' You can now manage your media from the app.'}
                        </Text>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Done</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => {
                                setStep('type');
                                setServerType(null);
                                setUrl('');
                                setApiKey('');
                                setUsername('');
                                setPassword('');
                                setTestError(null);
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add" size={18} color={Colors.primary} />
                            <Text style={styles.secondaryButtonText}>Add Another Server</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    contentContainer: {
        padding: Spacing.screenPadding,
        paddingTop: Spacing.xl,
        paddingBottom: 48,
        flexGrow: 1,
    },

    // Steps
    stepTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 24,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    stepSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        color: Colors.textSecondary,
        lineHeight: 22,
        marginBottom: Spacing.xxl,
    },

    // Back button
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.xl,
    },
    backButtonText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.primary,
    },

    // Type selection
    typeGrid: {
        gap: Spacing.md,
    },
    typeCard: {
        backgroundColor: Colors.backgroundTertiary,
        borderRadius: Spacing.radiusMd,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
    },
    typeIconBg: {
        width: 56,
        height: 56,
        borderRadius: Spacing.radiusMd,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    typeLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 18,
        color: Colors.text,
        marginBottom: 4,
    },
    typeDescription: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },

    // Inputs
    inputGroup: {
        marginBottom: Spacing.xl,
    },
    inputLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    textInput: {
        backgroundColor: Colors.backgroundTertiary,
        borderRadius: Spacing.radiusMd,
        padding: Spacing.lg,
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
    },
    inputHint: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: Colors.textTertiary,
        marginTop: Spacing.sm,
        lineHeight: 18,
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    showPasswordBtn: {
        position: 'absolute',
        right: Spacing.lg,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },

    // HTTP toggle
    httpToggle: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
        paddingVertical: Spacing.sm,
    },
    httpToggleText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.text,
    },
    httpWarning: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: Colors.warning,
        marginTop: 4,
        lineHeight: 18,
    },

    // Error
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.error + '15',
        borderRadius: Spacing.radiusMd,
        borderWidth: 1,
        borderColor: Colors.error + '30',
        padding: Spacing.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    errorText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: Colors.error,
        flex: 1,
        lineHeight: 18,
    },

    // Buttons
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: Spacing.radiusMd,
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    primaryButtonText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: Colors.textInverse,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.lg,
        borderRadius: Spacing.radiusMd,
        gap: Spacing.sm,
        marginTop: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
    },
    secondaryButtonText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.primary,
    },

    // Testing state
    testingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    testingText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 18,
        color: Colors.text,
        marginTop: Spacing.xxl,
    },
    testingSubtext: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: Colors.textTertiary,
        marginTop: Spacing.sm,
    },

    // Success state
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    successIconBg: {
        marginBottom: Spacing.xl,
    },
    successTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 28,
        color: Colors.success,
        marginBottom: Spacing.sm,
    },
    successServerName: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 18,
        color: Colors.text,
        marginBottom: 4,
    },
    successVersion: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.xl,
    },
    successMessage: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xxl,
        maxWidth: 300,
    },
});
