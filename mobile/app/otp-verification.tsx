import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StatusBar, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from '@/api/axios';

const SAGE = '#4F5F52';
const SAGE_DARK = '#3e4c42';
const SOFT_WHITE = '#FFF3D9';
const MUTED_GRAY = '#A6A29A';

export default function OtpVerification() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email as string) || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const maskEmail = (e: string) => {
    if (!e.includes('@')) return e;
    const [user, domain] = e.split('@');
    const visible = user.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(0, user.length - 2))}@${domain}`;
  };

  const handleChange = (value: string, index: number) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      const next = [...otp];
      next[index] = '';
      setOtp(next);
      return;
    }
    if (digits.length > 1) {
      const chars = digits.slice(0, 6 - index).split('');
      const next = [...otp];
      chars.forEach((c, i) => { next[index + i] = c; });
      setOtp(next);
      const focusIdx = Math.min(index + chars.length, 5);
      inputs.current[focusIdx]?.focus();
      return;
    }
    const next = [...otp];
    next[index] = digits;
    setOtp(next);
    if (index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    setMessage(null);
    if (code.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the complete 6-digit code.' });
      return;
    }
    setLoading(true);
    try {
      await axios.post('/verify-otp', { email, otp: code });
      setMessage({ type: 'success', text: 'Email verified successfully!' });
      setTimeout(() => router.replace('/login'), 1200);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setMessage(null);
    setResending(true);
    try {
      const res = await axios.post('/resend-otp', { email });
      setCooldown(60);
      setMessage({ type: 'success', text: res.data?.message || 'A new code has been sent.' });
    } catch (err: any) {
      if (err.response?.status === 429) {
        const c = err.response.data?.cooldown || 60;
        setCooldown(c);
        setMessage({ type: 'error', text: err.response.data?.message || `Please wait ${c}s.` });
      } else {
        setMessage({
          type: 'error',
          text: err.response?.data?.message || 'Failed to resend code.',
        });
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={SAGE} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[SAGE, SAGE_DARK]} style={styles.hero}>
            <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={SOFT_WHITE} />
            </TouchableOpacity>
            <View style={styles.heroBlob1} />
            <View style={styles.heroBlob2} />
            <View style={styles.heroIcon}>
              <Ionicons name="mail-outline" size={26} color={SOFT_WHITE} />
            </View>
            <Text style={styles.heroTitle}>Verify Your Email</Text>
            <Text style={styles.heroSub}>We sent a 6-digit code to</Text>
            <Text style={styles.heroEmail}>{maskEmail(email)}</Text>
          </LinearGradient>

          <View style={styles.card}>
            {message && (
              <View style={[styles.banner, message.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
                <Ionicons
                  name={message.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                  size={16}
                  color={message.type === 'error' ? '#DC2626' : '#059669'}
                />
                <Text style={[styles.bannerText, { color: message.type === 'error' ? '#DC2626' : '#059669' }]}>
                  {message.text}
                </Text>
              </View>
            )}

            <Text style={styles.label}>ENTER THE 6-DIGIT CODE</Text>

            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  value={digit}
                  onChangeText={(v) => handleChange(v, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                  placeholderTextColor={MUTED_GRAY}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleVerify} disabled={loading} activeOpacity={0.88} style={[styles.primaryBtn, loading && { opacity: 0.7 }]}>
              <LinearGradient colors={[SAGE, SAGE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify Email</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn't receive the code?</Text>
              <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || resending}>
                <Text style={[styles.resendLink, (cooldown > 0 || resending) && { opacity: 0.5 }]}>
                  {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                🔒 Never share this code with anyone. North Cakes staff will never ask you for it.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SAGE },
  hero: { alignItems: 'center', paddingTop: 40, paddingBottom: 48, overflow: 'hidden', position: 'relative' },
  backBtn: { position: 'absolute', top: 16, left: 24, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  heroBlob1: { position: 'absolute', width: 220, height: 220, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
  heroBlob2: { position: 'absolute', width: 140, height: 140, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', bottom: 0, left: -40 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,243,217,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,243,217,0.24)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: SOFT_WHITE, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 13, color: 'rgba(255,243,217,0.75)' },
  heroEmail: { fontSize: 14, color: SOFT_WHITE, fontWeight: '700', marginTop: 4, letterSpacing: 0.2 },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 26, paddingTop: 32, paddingBottom: 40, marginTop: -28, flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 18, borderWidth: 1 },
  bannerError: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
  bannerSuccess: { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
  bannerText: { fontSize: 13, fontWeight: '500', flex: 1 },
  label: { fontSize: 10, fontWeight: '700', color: SAGE, letterSpacing: 0.9, marginBottom: 12, marginLeft: 2 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 24 },
  otpBox: { flex: 1, height: 56, borderRadius: 14, backgroundColor: '#FAFAFA', borderWidth: 1.5, borderColor: 'rgba(166,162,154,0.3)', fontSize: 22, fontWeight: '800', color: SAGE, textAlign: 'center' },
  otpBoxFilled: { borderColor: SAGE, backgroundColor: 'rgba(79,95,82,0.04)' },
  primaryBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: SAGE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6, marginBottom: 18 },
  primaryBtnGrad: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 20 },
  resendLabel: { fontSize: 13, color: MUTED_GRAY },
  resendLink: { fontSize: 13, color: SAGE, fontWeight: '700' },
  noteBox: { backgroundColor: 'rgba(212,160,61,0.08)', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: '#D4A03D' },
  noteText: { fontSize: 12, color: '#92670a', lineHeight: 18 },
});


