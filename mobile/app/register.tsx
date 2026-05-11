// app/(auth)/register.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import CameraCapture from "./carmera";   // keep your actual import path
import axios from "@/api/axios";

const { width } = Dimensions.get("window");

const SAGE       = "#4F5F52";
const SAGE_DARK  = "#3e4c42";
const SAGE_LIGHT = "#6B7F6E";
const CREAM      = "#F2EDE4";
const SOFT_WHITE = "#FFF3D9";
const MUTED_GRAY = "#A6A29A";

// ── Reusable labelled field ──
function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}{" "}
        {required && <Text style={{ color: "#EF4444" }}>*</Text>}
      </Text>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ── Styled text input ──
function StyledInput(props: React.ComponentProps<typeof TextInput> & { hasError?: boolean }) {
  const { hasError, style, ...rest } = props;
  return (
    <TextInput
      {...rest}
      placeholderTextColor={MUTED_GRAY}
      style={[styles.input, hasError && styles.inputError, style]}
    />
  );
}

// ── Section label ──
function SectionLabel({ label, icon }: { label: string; icon: string }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionIconBox}>
        <Ionicons name={icon as any} size={13} color="#fff" />
      </View>
      <Text style={styles.sectionLabelText}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export default function Register() {
  const { register } = useAuth();   // not used for register call now, but keep
  const router = useRouter();

  const [id_image,             setIdImage]            = useState<any>(null);
  const [first_name,           setFirstName]          = useState("");
  const [last_name,            setLastName]           = useState("");
  const [phone,                setPhone]              = useState("");
  const [birth_date,           setBirthdate]          = useState("");
  const [address,              setAddress]            = useState("");
  const [verification_type,    setVerificationType]   = useState<string | null>(null);
  const [email,                setEmail]              = useState("");
  const [password,             setPassword]           = useState("");
  const [password_confirmation,setConfirmPassword]    = useState("");
  const [id_number,            setIdNumber]           = useState("");
  const [generalError,         setGeneralError]       = useState<string | any>(null);
  const [errors,               setErrors]             = useState<any>({});
  const [loading,              setLoading]            = useState(false);
  const [showPass,             setShowPass]           = useState(false);
  const [showConfirmPass,      setShowConfirmPass]    = useState(false);
  const [showCamera,           setShowCamera]         = useState(false);

  // ── Gallery picker ──
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Gallery permission is required to select an image");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      const a = result.assets[0];
      setIdImage({ uri: a.uri, name: `id_${Date.now()}.jpg`, type: "image/jpeg" });
    }
  };

  // ── Custom camera capture ──
  const handleCameraCapture = (uri: string) => {
    setIdImage({
      uri,
      name: `id_${Date.now()}.jpg`,
      type: "image/jpeg",
    });
    setShowCamera(false);
  };

  // ── Upload options (now uses custom camera) ──
  const handleUploadOptions = () => {
    Alert.alert("Upload ID", "Choose how to provide your ID", [
      { text: "Take Photo", onPress: () => setShowCamera(true) },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ── Registration logic (FIXED) ──
  const handleRegister = async () => {
    if (!first_name || !last_name || !phone || !address || !birth_date || !email || !password || !password_confirmation) {
      setGeneralError("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      // Create FormData to handle file upload correctly
      const formData = new FormData();
      formData.append('role', 'customer');
      formData.append('first_name', first_name);
      formData.append('last_name', last_name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('password_confirmation', password_confirmation);
      formData.append('phone', phone);
      formData.append('birth_date', birth_date);
      formData.append('address', address);
      if (verification_type) {
        formData.append('verification_type', verification_type);
      }
      if (id_number) {
        formData.append('id_number', id_number);
      }
      if (id_image) {
        // Append image as a file object
        formData.append('image', {
          uri: id_image.uri,
          name: id_image.name,
          type: id_image.type,
        } as any);
      }

      // Send the request (override header to multipart/form-data)
      await axios.post('/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // ✅ Success message (exact wording)
      Alert.alert('Success', 'Registration successful. Please wait for admin verification.', [
        { text: 'OK', onPress: () => router.push('/login') },
      ]);
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        setGeneralError(null);
      } else if (err.response?.data?.message) {
        setGeneralError(err.response.data.message);
        setErrors({});
      } else {
        setGeneralError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Verification type button ──
  const VerifBtn = ({
    value,
    label,
    icon,
  }: { value: string | null; label: string; icon: string }) => {
    const active = verification_type === value;
    return (
      <TouchableOpacity
        onPress={() => { setVerificationType(value); if (!value) setIdImage(null); }}
        style={[styles.verifBtn, active && styles.verifBtnActive]}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={18}
          color={active ? "#fff" : SAGE}
        />
        <Text style={[styles.verifBtnText, active && { color: "#fff" }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={SAGE} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Sage header ── */}
          <LinearGradient colors={[SAGE, SAGE_DARK]} style={styles.header}>
            <View style={styles.blob1} />
            <View style={styles.blob2} />

            {/* 🔙 Back arrow fixed */}
            <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={SOFT_WHITE} />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <View style={styles.headerIconBox}>
                <Ionicons name="person-add-outline" size={22} color={SOFT_WHITE} />
              </View>
              <Text style={styles.headerTitle}>Create Account</Text>
              <Text style={styles.headerSub}>Join North Cakes today</Text>
            </View>
          </LinearGradient>

          {/* ── White card ── */}
          <View style={styles.card}>
            {generalError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{generalError}</Text>
              </View>
            )}

            <SectionLabel label="Personal Information" icon="person-outline" />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="First Name" required error={errors.first_name?.[0]}>
                  <StyledInput
                    placeholder="First name"
                    value={first_name}
                    onChangeText={setFirstName}
                    hasError={!!errors.first_name}
                  />
                </Field>
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Field label="Last Name" required error={errors.last_name?.[0]}>
                  <StyledInput
                    placeholder="Last name"
                    value={last_name}
                    onChangeText={setLastName}
                    hasError={!!errors.last_name}
                  />
                </Field>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Phone" required error={errors.phone?.[0]}>
                  <StyledInput
                    placeholder="09XXXXXXXXX"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    hasError={!!errors.phone}
                  />
                </Field>
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Field label="Birth Date" required error={errors.birth_date?.[0]}>
                  <StyledInput
                    placeholder="YYYY-MM-DD"
                    value={birth_date}
                    onChangeText={setBirthdate}
                    hasError={!!errors.birth_date}
                  />
                </Field>
              </View>
            </View>

            <Field label="Address" required error={errors.address?.[0]}>
              <StyledInput
                placeholder="Your home address"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
                hasError={!!errors.address}
                style={{ height: 70, textAlignVertical: "top", paddingTop: 12 }}
              />
            </Field>

            <SectionLabel label="Account Details" icon="lock-closed-outline" />

            <Field label="Email Address" required error={errors.email?.[0]}>
              <StyledInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                hasError={!!errors.email}
              />
            </Field>

            <Field label="Password" required error={errors.password?.[0]}>
              <View style={[styles.inputRow, errors.password && styles.inputError]}>
                <TextInput
                  placeholder="Create a password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  placeholderTextColor={MUTED_GRAY}
                  style={[styles.inputInner]}
                />
                <TouchableOpacity onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showPass ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
              </View>
            </Field>

            <Field label="Confirm Password" required error={errors.password_confirmation?.[0]}>
              <View style={[styles.inputRow, errors.password_confirmation && styles.inputError]}>
                <TextInput
                  placeholder="Repeat your password"
                  value={password_confirmation}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPass}
                  placeholderTextColor={MUTED_GRAY}
                  style={[styles.inputInner]}
                />
                <TouchableOpacity onPress={() => setShowConfirmPass(s => !s)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showConfirmPass ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
              </View>
            </Field>

            <SectionLabel label="Verification" icon="shield-checkmark-outline" />

            <Field label="ID Number" required error={errors.id_number?.[0]}>
              <StyledInput
                placeholder="Your government ID number"
                value={id_number}
                onChangeText={setIdNumber}
                hasError={!!errors.id_number}
              />
            </Field>

            <Text style={styles.fieldLabel}>VERIFICATION TYPE <Text style={{ color: "#EF4444" }}>*</Text></Text>
            <View style={[styles.row, { marginBottom: 16 }]}>
              <VerifBtn value={null}             label="Regular" icon="account"        />
              <View style={{ width: 8 }} />
              <VerifBtn value="senior_citizen"   label="Senior"  icon="account-star"   />
              <View style={{ width: 8 }} />
              <VerifBtn value="pwd"              label="PWD"     icon="wheelchair-accessibility" />
            </View>

            {/* ── ID upload — now uses custom camera ── */}
            {!id_image ? (
              <TouchableOpacity
                onPress={handleUploadOptions}
                style={styles.uploadBtn}
              >
                <Ionicons name="camera-outline" size={20} color={SAGE} />
                <Text style={styles.uploadBtnText}>
                  {verification_type
                    ? `Upload ${verification_type} ID`
                    : "Upload ID Document (Optional)"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.idPreviewWrap}>
                <Image source={{ uri: id_image.uri }} style={styles.idPreview} resizeMode="cover" />
                <View style={styles.idBtnRow}>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert("Replace ID", "Choose option", [
                        { text: "Take Photo", onPress: () => setShowCamera(true) },
                        { text: "Choose from Gallery", onPress: pickImage },
                        { text: "Cancel", style: "cancel" },
                      ])
                    }
                    style={styles.idBtnSecondary}
                  >
                    <Ionicons name="refresh" size={15} color={SAGE} />
                    <Text style={styles.idBtnSecondaryText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIdImage(null)}
                    style={styles.idBtnDanger}
                  >
                    <Ionicons name="trash-outline" size={15} color="#fff" />
                    <Text style={styles.idBtnDangerText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Terms */}
            <View style={styles.termsRow}>
              <View style={styles.checkbox}>
                <Ionicons name="checkmark" size={13} color="#fff" />
              </View>
              <Text style={styles.termsText}>
                I agree to the processing of{" "}
                <Text style={{ color: SAGE, fontWeight: "700" }}>Personal Data</Text>
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleRegister}
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
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Create Account</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.signinRow}>
              <Text style={styles.signinPre}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/login")}>
                <Text style={styles.signinLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ═══ FULL‑SCREEN CAMERA MODAL ═══ */}
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowCamera(false)}
      >
        <CameraCapture onCapture={handleCameraCapture} />
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 50,
            left: 20,
            zIndex: 10,
            backgroundColor: "rgba(0,0,0,0.4)",
            borderRadius: 20,
            padding: 8,
          }}
          onPress={() => setShowCamera(false)}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles (unchanged) ──
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SAGE,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 52,
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute", width: 200, height: 200, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)", top: -60, right: -60,
  },
  blob2: {
    position: "absolute", width: 120, height: 120, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)", bottom: -20, left: -30,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  headerContent: {
    alignItems: "center",
  },
  headerIconBox: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: "rgba(255,243,217,0.15)",
    borderWidth: 1.5, borderColor: "rgba(255,243,217,0.22)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
  },
  headerTitle: {
    fontSize: 24, fontWeight: "800", color: SOFT_WHITE,
    letterSpacing: -0.5, marginBottom: 4,
  },
  headerSub: {
    fontSize: 13, color: "rgba(255,243,217,0.7)", letterSpacing: 0.3,
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    marginTop: -28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF2F2", borderRadius: 12,
    padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: "#FEE2E2",
  },
  errorBannerText: {
    color: "#DC2626", fontSize: 13, fontWeight: "500", flex: 1,
  },
  sectionLabel: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 16, marginTop: 8,
  },
  sectionIconBox: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: SAGE,
    alignItems: "center", justifyContent: "center",
  },
  sectionLabelText: {
    fontSize: 11, fontWeight: "700", color: SAGE,
    letterSpacing: 0.7, textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1, height: 1,
    backgroundColor: "rgba(79,95,82,0.12)",
  },
  row: {
    flexDirection: "row",
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10, fontWeight: "700", color: SAGE,
    letterSpacing: 0.8, marginBottom: 6, marginLeft: 2,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: SAGE,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.3)",
    paddingHorizontal: 14,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: SAGE,
  },
  eyeBtn: {
    paddingLeft: 10, paddingVertical: 6,
  },
  eyeText: {
    fontSize: 12, color: MUTED_GRAY, fontWeight: "600",
  },
  fieldError: {
    fontSize: 11, color: "#EF4444", marginTop: 4, marginLeft: 2,
  },
  verifBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(166,162,154,0.25)",
    backgroundColor: "#FAFAFA",
    gap: 5,
  },
  verifBtnActive: {
    backgroundColor: SAGE,
    borderColor: SAGE,
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  verifBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED_GRAY,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SAGE,
    borderStyle: "dashed",
    backgroundColor: "rgba(79,95,82,0.04)",
    marginBottom: 16,
  },
  uploadBtnText: {
    color: SAGE, fontWeight: "600", fontSize: 13,
  },
  idPreviewWrap: {
    marginBottom: 16,
  },
  idPreview: {
    width: "100%", height: 160, borderRadius: 14,
    borderWidth: 1.5, borderColor: "rgba(79,95,82,0.15)",
  },
  idBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10, gap: 8,
  },
  idBtnSecondary: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "rgba(79,95,82,0.08)",
    borderWidth: 1, borderColor: "rgba(79,95,82,0.15)",
  },
  idBtnSecondaryText: {
    fontSize: 13, fontWeight: "600", color: SAGE,
  },
  idBtnDanger: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#EF4444",
  },
  idBtnDangerText: {
    fontSize: 13, fontWeight: "600", color: "#fff",
  },
  termsRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 24, marginTop: 8, gap: 10,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    backgroundColor: SAGE,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: SAGE,
  },
  termsText: {
    fontSize: 13, color: MUTED_GRAY, flex: 1, lineHeight: 20,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: SAGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  primaryBtnGrad: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
  },
  primaryBtnText: {
    color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3,
  },
  signinRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  signinPre: {
    fontSize: 14, color: MUTED_GRAY,
  },
  signinLink: {
    fontSize: 14, color: SAGE, fontWeight: "700",
  },
});