import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { QRCodeScreen } from '../screens/QRCodeScreen';
import { UpdatePricesScreen } from '../screens/UpdatePricesScreen';
import { colors } from '../theme';

type AuthStackParamList = {
  Login: undefined;
};

type AppTabsParamList = {
  Dashboard: undefined;
  UpdatePrices: undefined;
  QRCode: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<AppTabsParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading your shop account...</Text>
    </View>
  );
}

function AppTabsNavigator() {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const headerRight = useCallback(
    () => (
      <Pressable onPress={logout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    ),
    [logout]
  );

  return (
    <Tabs.Navigator
      sceneContainerStyle={{ backgroundColor: colors.background }}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        // Push the title + Logout below the status bar on every Android device.
        headerStatusBarHeight: insets.top,
        headerRight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 6,
          height: 64,
        },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="UpdatePrices"
        component={UpdatePricesScreen}
        options={{
          title: 'Update Prices',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="QRCode"
        component={QRCodeScreen}
        options={{
          title: 'QR Code',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" color={color} size={size} />
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <AuthStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <AuthStack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Shop Owner Login' }}
        />
      </AuthStack.Navigator>
    );
  }

  return <AppTabsNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  logoutButton: {
    paddingHorizontal: 16,
  },
  logoutText: {
    color: colors.primaryMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
