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
import { SOURCE_COLORS } from '../../constants/Sources';
import { Spacing } from '../../constants/Spacing';
import { AppColors } from '../../hooks/useColors';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { JellyfinClient } from '../../services/api/jellyfin';
import { LidarrClient } from '../../services/api/lidarr';
import { RadarrClient } from '../../services/api/radarr';
import { SonarrClient } from '../../services/api/sonarr';
import { useServerStore } from '../../services/stores/serverStore';
import { SERVER_TYPE_DESCRIPTIONS, SERVER_TYPE_LABELS, ServerType } from '../../types/server';

type Step = 'type' | 'connection' | 'credentials' | 'testing' | 'success';

const SERVER_TYPES: { type: ServerType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { type: 'jellyfin', icon: 'play-circle' },
    { type: 'sonarr', icon: 'tv' },
    { type: 'radarr', icon: 'film' },
    { type: 'lidarr', icon: 'musical-notes' },
];

export default function AddServerScreen() {
    const router = useRouter();
    const styles = useThemedStyles(createStyles);
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
        if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
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

                const connResult = await client.testConnection();
                if (!connResult.success) {
                    throw new Error(connResult.error || 'Could not reach server');
                }

                const authResult = await client.authenticateByName(username, password);

                setServerName(connResult.serverName || 'Jellyfin Server');
                setServerVersion(connResult.serverVersion || '');

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
                            {SERVER_TYPES.map((st, index) => {
                                const color = SOURCE_COLORS[st.type];
                                return (
                                    <Animated.View
                                        key={st.type}
                                        entering={FadeInDown.duration(400).delay(100 + index * 80)}
                                    >
                                        <TouchableOpacity
                                            style={styles.typeCard}
                                            onPress={() => handleSelectType(st.type)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.typeIconBg, { backgroundColor: color + '20' }]}>
                                                <Ionicons name={st.icon} size={32} color={color} />
                                            </View>
                                            <Text style={styles.typeLabel}>{SERVER_TYPE_LABELS[st.type]}</Text>
                                            <Text style={styles.typeDescription}>{SERVER_TYPE_DESCRIPTIONS[st.type]}</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </Animated.View>
                )}

                {/* Step 2: Server URL */}
                {step === 'connection' && (
                    <Animated.View entering={FadeInRight.duration(400)}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setStep('type')}>
                            <Ionicons name="arrow-back" size={20} color={styles.backButtonText.color} />
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
                                placeholderTextColor={styles.inputHint.color as string}
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
                                color={useHttp ? (styles.httpWarning.color as string) : (styles.inputHint.color as string)}
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
                                    placeholderTextColor={styles.inputHint.color as string}
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
                                <Ionicons name="alert-circle" size={18} color={styles.errorText.color} />
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
                            <Ionicons name="arrow-forward" size={18} color={styles.primaryButtonText.color} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Step 3: Jellyfin Credentials */}
                {step === 'credentials' && isJellyfin && (
                    <Animated.View entering={FadeInRight.duration(400)}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setStep('connection')}>
                            <Ionicons name="arrow-back" size={20} color={styles.backButtonText.color} />
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
                                placeholderTextColor={styles.inputHint.color as string}
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
                                    placeholderTextColor={styles.inputHint.color as string}
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
                                        color={styles.iconSecondary.color}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {testError && (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={18} color={styles.errorText.color} />
                                <Text style={styles.errorText}>{testError}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleCredentials}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Connect</Text>
                            <Ionicons name="arrow-forward" size={18} color={styles.primaryButtonText.color} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Step 4: Testing Connection */}
                {step === 'testing' && (
                    <Animated.View entering={FadeInDown.duration(400)} style={styles.testingContainer}>
                        <ActivityIndicator size="large" color={styles.iconPrimary.color as string} />
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
                            <Ionicons name="checkmark-circle" size={64} color={styles.successTitle.color} />
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
                            <Ionicons name="add" size={18} color={styles.secondaryButtonText.color} />
                            <Text style={styles.secondaryButtonText}>Add Another Server</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        color: colors.text,
        marginBottom: Spacing.sm,
    },
    stepSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        color: colors.textSecondary,
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
        color: colors.primary,
    },

    // Type selection
    typeGrid: {
        gap: Spacing.md,
    },
    typeCard: {
        backgroundColor: colors.backgroundTertiary,
        borderRadius: Spacing.radiusMd,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
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
        color: colors.text,
        marginBottom: 4,
    },
    typeDescription: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },

    // Inputs
    inputGroup: {
        marginBottom: Spacing.xl,
    },
    inputLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: colors.text,
        marginBottom: Spacing.sm,
    },
    textInput: {
        backgroundColor: colors.backgroundTertiary,
        borderRadius: Spacing.radiusMd,
        padding: Spacing.lg,
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    inputHint: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: colors.textTertiary,
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
        color: colors.text,
    },
    httpWarning: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: colors.warning,
        marginTop: 4,
        lineHeight: 18,
    },

    // Error
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '15',
        borderRadius: Spacing.radiusMd,
        borderWidth: 1,
        borderColor: colors.error + '30',
        padding: Spacing.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    errorText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: colors.error,
        flex: 1,
        lineHeight: 18,
    },

    // Buttons
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        padding: Spacing.lg,
        borderRadius: Spacing.radiusMd,
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    primaryButtonText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: colors.textInverse,
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
        borderColor: colors.surfaceBorder,
    },
    secondaryButtonText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: colors.primary,
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
        color: colors.text,
        marginTop: Spacing.xxl,
    },
    testingSubtext: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: colors.textTertiary,
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
        color: colors.success,
        marginBottom: Spacing.sm,
    },
    successServerName: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 18,
        color: colors.text,
        marginBottom: 4,
    },
    successVersion: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: Spacing.xl,
    },
    successMessage: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xxl,
        maxWidth: 300,
    },

    // Color tokens for inline use
    iconPrimary: { color: colors.primary },
    iconSecondary: { color: colors.textSecondary },
});
