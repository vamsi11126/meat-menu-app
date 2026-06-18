import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { fetchTodayPrices, updateTodayPrices } from '../api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { PriceFormValues } from '../types';

const emptyForm: PriceFormValues = {
  chicken_kg: '',
  mutton_kg: '',
  fish_kg: '',
  eggs_kg: '',
};

// An unset/zero price loads as an empty field so the owner must enter a real rate.
function priceToField(value: number) {
  return value > 0 ? String(value) : '';
}

export function UpdatePricesScreen() {
  const { token } = useAuth();
  const [form, setForm] = useState<PriceFormValues>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCurrentPrices = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const prices = await fetchTodayPrices(token);
      setForm({
        chicken_kg: priceToField(prices.chicken_kg),
        mutton_kg: priceToField(prices.mutton_kg),
        fish_kg: priceToField(prices.fish_kg),
        eggs_kg: priceToField(prices.eggs_kg),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load current prices');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadCurrentPrices();
    }, [loadCurrentPrices])
  );

  const handleChange = (key: keyof PriceFormValues, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!token) {
      return;
    }

    try {
      setError('');

      const hasEmptyField = Object.values(form).some(
        (value) => value.trim() === ''
      );

      const payload = {
        chicken_kg: Number(form.chicken_kg),
        mutton_kg: Number(form.mutton_kg),
        fish_kg: Number(form.fish_kg),
        eggs_kg: Number(form.eggs_kg),
      };

      if (
        hasEmptyField ||
        Object.values(payload).some((value) => Number.isNaN(value) || value <= 0)
      ) {
        setError('Please enter a valid price for all items');
        return;
      }

      setIsSaving(true);

      await updateTodayPrices(token, payload);
      Alert.alert('Prices updated', "Today's prices were saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update prices');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading current prices...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Update Today&apos;s Prices</Text>
        <Text style={styles.subtitle}>All values are per kg in Indian Rupees.</Text>

        <PriceField
          label="Chicken"
          value={form.chicken_kg}
          onChangeText={(value) => handleChange('chicken_kg', value)}
        />
        <PriceField
          label="Mutton"
          value={form.mutton_kg}
          onChangeText={(value) => handleChange('mutton_kg', value)}
        />
        <PriceField
          label="Fish"
          value={form.fish_kg}
          onChangeText={(value) => handleChange('fish_kg', value)}
        />
        <PriceField
          label="Eggs"
          value={form.eggs_kg}
          onChangeText={(value) => handleChange('eggs_kg', value)}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable onPress={handleSubmit} style={styles.button} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Save Prices</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function PriceField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
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
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  fieldWrapper: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#fda4af',
    fontSize: 14,
  },
});
