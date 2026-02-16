/**
 * TabSafeView — Wrapper that adds bottom padding to clear the tab bar.
 *
 * Use as the `contentContainerStyle` padding or wrap your ScrollView content.
 * Accounts for the absolute-positioned iOS tab bar and safe area insets.
 */

import React, { ReactNode } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * Bottom inset constant matching the tab bar height + comfortable margin.
 * iOS tab bar: 88px (absolute) + 12px margin = 100px
 * Android tab bar: 64px (relative, doesn't overlap) + 16px margin = 16px extra only
 *
 * Import this directly if you need the raw value (e.g. for FlatList
 * `contentContainerStyle` or `ListFooterComponent`).
 */
export const TAB_BAR_BOTTOM_INSET = Platform.OS === 'ios' ? 100 : 16;

interface TabSafeViewProps {
    children: ReactNode;
    style?: ViewStyle;
}

/**
 * Adds bottom padding so content doesn't hide behind the tab bar.
 *
 * ```tsx
 * <ScrollView>
 *     <TabSafeView>
 *         {/* your content *​/}
 *     </TabSafeView>
 * </ScrollView>
 * ```
 */
export default function TabSafeView({ children, style }: TabSafeViewProps) {
    return (
        <View style={[styles.container, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: TAB_BAR_BOTTOM_INSET,
    },
});
