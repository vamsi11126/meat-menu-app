import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import { fetchOwnerShop } from '../api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { ShopDetails } from '../types';

function extractBase64Data(dataUrl: string) {
  return dataUrl.replace(/^data:image\/png;base64,/, '');
}

async function createQrFile(dataUrl: string, shopId: number) {
  const file = new File(Paths.cache, `shop-${shopId}-qr.png`);
  if (file.exists) {
    file.delete();
  }
  file.write(extractBase64Data(dataUrl), { encoding: 'base64' });
  return file.uri;
}

export function QRCodeScreen() {
  const { token } = useAuth();
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');

  const loadShop = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const result = await fetchOwnerShop(token);
      setShop(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load shop QR code');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadShop();
    }, [loadShop])
  );

  const handleShare = async () => {
    if (!shop?.qr_code_url) {
      return;
    }

    try {
      setIsWorking(true);
      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        throw new Error('Sharing is not available on this device.');
      }

      const fileUri = await createQrFile(shop.qr_code_url, shop.id);
      await Sharing.shareAsync(fileUri);
    } catch (err) {
      Alert.alert('Share failed', err instanceof Error ? err.message : 'Could not share the QR code.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleSave = async () => {
    if (!shop?.qr_code_url) {
      return;
    }

    try {
      setIsWorking(true);
      const permission = await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        throw new Error('Media library permission is required to save the QR code.');
      }

      const fileUri = await createQrFile(shop.qr_code_url, shop.id);
      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert('Saved', 'QR code saved to your photo library.');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Could not save the QR code.');
    } finally {
      setIsWorking(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading QR code...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{shop?.name || 'Your Shop QR Code'}</Text>
        <Text style={styles.subtitle}>
          Customers can scan this code to view your live menu prices.
        </Text>

        {shop?.qr_code_url ? (
          <View style={styles.qrWrapper}>
            <Image source={{ uri: shop.qr_code_url }} style={styles.qrImage} />
          </View>
        ) : null}

        {shop?.qr_target_url ? (
          <Text style={styles.qrTarget}>Linked menu: {shop.qr_target_url}</Text>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            onPress={handleShare}
            style={[styles.button, styles.secondaryButton]}
            disabled={isWorking}
          >
            <Text style={styles.secondaryButtonText}>Share</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={styles.button} disabled={isWorking}>
            {isWorking ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
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
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
  },
  qrImage: {
    width: 240,
    height: 240,
  },
  qrTarget: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#fda4af',
    fontSize: 14,
    textAlign: 'center',
  },
});
