
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const SAGE = "#4F5F52";
const SAGE_DARK = "#3e4c42";
const SAGE_LIGHT = "#6B7F6E";
const CREAM = "#F2EDE4";
const SOFT_WHITE = "#FFF3D9";
const MUTED_GRAY = "#A6A29A";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
  if (!email || !password) {
    setGeneralError("Please fill in all fields");
    return;
  }

  setLoading(true);
  setGeneralError(null);
  setErrors({});

  try {
    await login({ email, password });

    router.replace("/customer/customerDashboard");
  } catch (err: any) {
    if (err.message === "Network Error") {
      setGeneralError(
        "Cannot reach the server. Check your internet or backend IP."
      );
    } else if (err.response?.status === 422) {
      const data = err.response.data;

      if (data.errors) {
        setErrors(data.errors);
      } else if (data.message) {
        setGeneralError(data.message);
      }
    } else if (err.response?.status === 403) {
      setGeneralError(
        err.response.data?.message ||
        "Your account is not yet verified."
      );
    } else if (err.response?.status) {
      setGeneralError(
        err.response.data?.message ||
        `Server error (${err.response.status})`
      );
    } else {
      setGeneralError("Something went wrong.");
    }
  } finally {
    setLoading(false);
  }
 };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={SAGE} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero / header area ── */}
          <LinearGradient colors={[SAGE, SAGE_DARK]} style={styles.hero}>
            {/* 🔙 Back button */}
            <TouchableOpacity
              onPress={() => router.push("/")}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={20} color={SOFT_WHITE} />
            </TouchableOpacity>

            <View style={styles.heroBlob1} />
            <View style={styles.heroBlob2} />

            <View style={styles.logoCircle}>
              <Text style={styles.logoInitial}>N</Text>
            </View>
            <Text style={styles.heroTitle}>NORTH</Text>
            <Text style={styles.heroSub}>Cakes and Pastries</Text>
          </LinearGradient>

          {/* ── Login card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            {generalError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠ {generalError}</Text>
              </View>
            )}

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <View
                style={[styles.inputWrap, errors.email && styles.inputError]}
              >
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErrors((e: any) => ({ ...e, email: null }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  placeholderTextColor={MUTED_GRAY}
                />
              </View>
              {errors.email && (
                <Text style={styles.fieldError}>{errors.email[0]}</Text>
              )}
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View
                style={[styles.inputWrap, errors.password && styles.inputError]}
              >
                <TextInput
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((e: any) => ({ ...e, password: null }));
                  }}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { flex: 1 }]}
                  placeholderTextColor={MUTED_GRAY}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eyeBtn}
                >
                  <Text style={{ color: MUTED_GRAY, fontSize: 13 }}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.fieldError}>{errors.password[0]}</Text>
              )}
            </View>

            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            >
              <LinearGradient
                colors={[SAGE, SAGE_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGrad}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupPre}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.signupLink}>Create one</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SAGE,
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 24,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  hero: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 56,
    overflow: "hidden",
    position: "relative",
  },
  heroBlob1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    right: -60,
  },
  heroBlob2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 0,
    left: -40,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,243,217,0.18)",
    borderWidth: 2,
    borderColor: "rgba(255,243,217,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoInitial: {
    fontSize: 32,
    fontWeight: "800",
    color: SOFT_WHITE,
    letterSpacing: -1,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 8,
    color: SOFT_WHITE,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 15,
    fontStyle: "italic",
    color: "rgba(255,243,217,0.75)",
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    marginTop: -24,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: SAGE,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: MUTED_GRAY,
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorBannerText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "500",
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: SAGE,
    letterSpacing: 0.9,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  input: {
    paddingVertical: 13,
    fontSize: 14,
    color: SAGE,
    flex: 1,
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  fieldError: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 2,
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 12,
    color: SAGE,
    fontWeight: "600",
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  primaryBtnGrad: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(166,162,154,0.25)",
  },
  orText: {
    fontSize: 12,
    color: MUTED_GRAY,
    fontWeight: "500",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupPre: {
    fontSize: 14,
    color: MUTED_GRAY,
  },
  signupLink: {
    fontSize: 14,
    color: SAGE,
    fontWeight: "700",
  },
});