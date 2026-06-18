import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { fetchTodayPrices } from '../api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { OwnerTodayPrices } from '../types';

function formatCurrency(value: number) {
  return `₹${Number(value).toFixed(2)}`;
}

// Format an ISO date string ("2026-06-17T18:30:00.000Z") as "17 Jun 2026".
function formatDate(date: string | undefined) {
  if (!date) {
    return 'Today';
  }

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatLastUpdated(timestamp: string | null) {
  if (!timestamp) {
    return 'Not updated yet today';
  }

  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DashboardScreen() {
  const { token, user } = useAuth();
  const [prices, setPrices] = useState<OwnerTodayPrices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPrices = useCallback(
    async (isPullToRefresh = false) => {
      if (!token) {
        return;
      }

      try {
        setError('');
        if (isPullToRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const result = await fetchTodayPrices(token);
        setPrices(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load today's prices");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      loadPrices();
    }, [loadPrices])
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading today&apos;s prices...</Text>
      </View>
    );
  }

  const hasAnyPrice = [
    prices?.chicken_kg,
    prices?.mutton_kg,
    prices?.fish_kg,
    prices?.eggs_kg,
  ].some((value) => Number(value) > 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadPrices(true)}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Welcome back, {user?.name}</Text>
        <Text style={styles.heroSubtitle}>
          {prices?.shop_name || 'Your shop'} • {formatDate(prices?.date)}
        </Text>
        <Text style={styles.heroMeta}>
          Last updated: {formatLastUpdated(prices?.updated_at ?? null)}
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today&apos;s prices</Text>
        <View style={styles.priceCard}>
          <PriceRow label="Chicken" value={prices?.chicken_kg ?? 0} />
          <PriceRow label="Mutton" value={prices?.mutton_kg ?? 0} />
          <PriceRow label="Fish" value={prices?.fish_kg ?? 0} />
          <PriceRow label="Eggs" value={prices?.eggs_kg ?? 0} />
        </View>
        {!hasAnyPrice ? (
          <Text style={styles.pricePrompt}>
            Tap Update Prices to set today&apos;s rates
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function PriceRow({ label, value }: { label: string; value: number }) {
  const isUnset = !value || Number(value) <= 0;

  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, isUnset && styles.priceValueUnset]}>
        {isUnset ? '—' : `${formatCurrency(value)} / kg`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    gap: 6,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#ffedd5',
    fontSize: 15,
  },
  heroMeta: {
    color: '#fff7ed',
    fontSize: 13,
    marginTop: 6,
  },
  section: {
    gap: 12,
    marginTop: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  priceCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  priceLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  priceValue: {
    color: colors.primaryMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  priceValueUnset: {
    color: colors.textMuted,
  },
  pricePrompt: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  errorText: {
    color: '#fda4af',
    fontSize: 14,
  },
});
