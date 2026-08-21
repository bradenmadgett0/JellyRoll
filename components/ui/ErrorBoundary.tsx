/**
 * ErrorBoundary — Graceful error screen with retry.
 *
 * Error boundaries must be class components, and classes can't use hooks — so
 * the class only catches, and the fallback UI is a function component that can
 * read the theme like everything else.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { Component, ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ThemeTokens } from "../../constants/theme";
import { Spacing } from "../../constants/Spacing";
import type { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function ErrorFallback({
  error,
  onRetry,
}: {
  error?: Error;
  onRetry: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="warning"
          size={48}
          color={styles.iconWarning.color as string}
        />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        {error?.message ?? "An unexpected error occurred."}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Ionicons
          name="refresh"
          size={18}
          color={styles.retryText.color as string}
        />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
      );
    }

    return this.props.children;
  }
}

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.xxl,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.warning + "15",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Spacing.xl,
    },
    title: {
      ...theme.text("h2", "bold"),
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    message: {
      ...theme.text("bodySmall", "regular"),
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: Spacing.xxl,
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.md,
      borderRadius: Spacing.radiusFull,
      gap: Spacing.sm,
    },
    retryText: {
      ...theme.text("body", "semibold"),
      color: colors.textInverse,
    },
        iconWarning: { color: colors.warning },
  });
