// app/index.tsx

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StatusBar,
  Dimensions,
  StyleSheet,
  Pressable,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';

const { width, height } = Dimensions.get('window');

// Colors
const SAGE = '#4F5F52';
const SAGE_LIGHT = '#6B7F6E';
const CREAM = '#F2EDE4';
const SOFT_WHITE = '#FFF3D9';
const MUTED_GRAY = '#A6A29A';
const SAGE_DARK = '#3e4c42';

export default function Index() {
  const { user, getUser } = useAuth();

  // ── Load user on mount ──
  useEffect(() => {
    getUser();
  }, []);

  // ── Navigate to dashboard once user is loaded and authenticated ──
  useEffect(() => {
    if (user !== undefined && user !== null) {
      router.replace('/customer/customerDashboard');
    }
  }, [user]);

  // ── Show loading spinner while user is being fetched ──
  if (user === undefined) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={SAGE} />
        </View>
      </SafeAreaView>
    );
  }

  // ── If user is null (not logged in), show the landing page ──
  const navigateTo = (path: any) => {
    Keyboard.dismiss();

    if (Platform.OS === 'web') {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) activeElement.blur();
      requestAnimationFrame(() => router.push(path));
    } else {
      router.push(path);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={CREAM} />

      {/* Background Gradient */}
      <LinearGradient
        colors={[CREAM, '#EDE8DF', '#E5DFD4']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative Blobs */}
      <View
        style={[
          styles.blob,
          {
            width: width * 0.75,
            height: width * 0.75,
            top: -width * 0.25,
            right: -width * 0.2,
            backgroundColor: SOFT_WHITE,
            opacity: 0.7,
          },
        ]}
      />

      <View
        style={[
          styles.blob,
          {
            width: width * 0.5,
            height: width * 0.5,
            bottom: height * 0.12,
            left: -width * 0.15,
            backgroundColor: '#E8E2D8',
            opacity: 0.6,
          },
        ]}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoRing}>
            <Image
              source={require('../assets/images/northcakes_logo.jpg')}
              resizeMode="cover"
              style={styles.logoImg}
            />
          </View>
        </View>

        {/* Brand */}
        <Text style={styles.brandName}>NORTH</Text>
        <Text style={styles.brandSub}>Cakes and Pastries</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Tagline */}
        <Text style={styles.tagline}>
          Freshly baked cakes, handcrafted pastries, and coffee made specially
          for you.
        </Text>

        {/* Feature Pills */}
        <View style={styles.pillRow}>
          {['🎂 Custom Cakes', '☕ Coffee', '🥐 Pastries'].map((tag) => (
            <View key={tag} style={styles.pill}>
              <Text style={styles.pillText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnGroup}>
          {/* Register Button */}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigateTo('/register')}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={[SAGE, SAGE_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              <Text style={styles.primaryBtnText}>Create an Account</Text>
            </LinearGradient>
          </Pressable>

          {/* Login Button */}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigateTo('/login')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={styles.secondaryBtnText}>Sign In</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={styles.footerNote}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },

  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 16,
  },

  // Logo
  logoWrap: {
    marginBottom: 24,
    alignItems: 'center',
  },

  logoRing: {
    width: width * 0.38,
    height: width * 0.38,
    borderRadius: width * 0.19,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(79,95,82,0.18)',
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: SOFT_WHITE,
  },

  logoImg: {
    width: '100%',
    height: '100%',
  },

  // Brand
  brandName: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 10,
    color: SAGE,
    marginBottom: 4,
  },

  brandSub: {
    fontSize: 18,
    fontStyle: 'italic',
    color: SAGE_LIGHT,
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    width: 48,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(79,95,82,0.2)',
    marginVertical: 20,
  },

  // Tagline
  tagline: {
    fontSize: 14,
    lineHeight: 22,
    color: MUTED_GRAY,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 20,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 36,
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(79,95,82,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(79,95,82,0.14)',
  },

  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: SAGE,
    letterSpacing: 0.2,
  },

  // Buttons
  btnGroup: {
    width: '100%',
    gap: 12,
  },

  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },

  primaryBtnGrad: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },

  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  secondaryBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: SAGE,
    alignItems: 'center',
    backgroundColor: 'rgba(79,95,82,0.04)',
  },

  secondaryBtnText: {
    color: SAGE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // Footer
  footerNote: {
    marginTop: 24,
    fontSize: 11,
    color: MUTED_GRAY,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});