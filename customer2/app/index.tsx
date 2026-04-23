import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '@/contexts/auth-context'; // Adjust path as needed
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router'; 

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [isChecked, setChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    
    setIsLocalLoading(true);

    try {
      await login({ email, password });

      let currentUser = useAuth.getState().user;
      let retries = 0;

      while (!currentUser && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        currentUser = useAuth.getState().user;
        retries++;
        console.log(`Waiting for user data... attempt ${retries}`);
      }

      if (currentUser) {
        switch(currentUser.role) {
          case "customer" :
            router.replace("/screens/CustomerDashboard");
            break;
          case "staff" :
            navigation.replace("StaffDashboard");
            break;
          default:
            navigation.replace("CustomerDashboard");
        }
      } else {
        Alert.alert("Login Failed", "Unable to Fetch User Information");
      }
    } catch (error: any) {
      let errorMessage = "Invalid Email or Password";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert("Login Failed", errorMessage);
    } finally {
      setIsLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Illustration */}
        <LinearGradient
          colors={['#2D6A4F', '#1B4D2E', '#0F3623']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: height * 0.08,
            paddingBottom: height * 0.05,
            paddingHorizontal: 24,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            {/* Animated Cake Icon */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 60,
              padding: 20,
              marginBottom: 20,
            }}>
              <Ionicons name="restaurant-outline" size={50} color="#FFFFFF" />
            </View>
            
            <Text style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#FFFFFF',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              North Cakes CDO
            </Text>
            
            <Text style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.85)',
              textAlign: 'center',
              marginBottom: 4,
            }}>
              Mobile Management System
            </Text>
            
            <Text style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)',
              textAlign: 'center',
              marginTop: 12,
              paddingHorizontal: 20,
            }}>
              Manage your bakery on the go
            </Text>
          </View>
        </LinearGradient>

        {/* Login Form Card */}
        <View style={{
          backgroundColor: '#FFFFFF',
          marginTop: -20,
          marginHorizontal: 20,
          borderRadius: 24,
          padding: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
        }}>
          {/* Welcome Text */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#1F2937',
              marginBottom: 4,
            }}>
              Welcome Back! 👋
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
            }}>
              Sign in to continue to your account
            </Text>
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: '#374151',
              marginBottom: 8,
            }}>
              Email Address
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 16,
            }}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  color: '#1F2937',
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLocalLoading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: '#374151',
              marginBottom: 8,
            }}>
              Password
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 16,
            }}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  color: '#1F2937',
                }}
                editable={!isLocalLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password & Remember Me */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 24 
          }}>
            <TouchableOpacity 
              onPress={() => setChecked(!isChecked)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: '#2D6A4F',
                backgroundColor: isChecked ? '#2D6A4F' : 'transparent',
                marginRight: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {isChecked && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={{
                fontSize: 13,
                color: '#6B7280',
              }}>
                Remember me
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity>
              <Text style={{
                fontSize: 13,
                color: '#2D6A4F',
                fontWeight: '500',
              }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLocalLoading}
            activeOpacity={0.9}
            style={{
              backgroundColor: '#2D6A4F',
              paddingVertical: 16,
              borderRadius: 16,
              marginBottom: 20,
            }}
          >
            {isLocalLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{
                color: '#FFFFFF',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: 16,
              }}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            <Text style={{
              marginHorizontal: 16,
              color: '#9CA3AF',
              fontSize: 12,
            }}>
              OR
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={{
              backgroundColor: '#F3F4F6',
              paddingVertical: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Text style={{
              color: '#374151',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: 16,
            }}>
              Create New Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo Credentials */}
        <View style={{
          marginHorizontal: 20,
          marginTop: 20,
          marginBottom: 30,
          padding: 16,
          backgroundColor: '#F0FDF4',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#D1FAE5',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="information-circle-outline" size={18} color="#059669" />
            <Text style={{
              fontSize: 12,
              color: '#065F46',
              fontWeight: '600',
              marginLeft: 6,
            }}>
              Demo Credentials
            </Text>
          </View>
          <Text style={{
            fontSize: 11,
            color: '#047857',
            marginBottom: 4,
          }}>
            📧 admin@northcakes.com
          </Text>
          <Text style={{
            fontSize: 11,
            color: '#047857',
            marginBottom: 4,
          }}>
            🔑 admin123
          </Text>
          <Text style={{
            fontSize: 11,
            color: '#9CA3AF',
            marginTop: 8,
          }}>
            * Staff access also available
          </Text>
        </View>

        {/* Footer */}
        <View style={{ paddingBottom: 20, alignItems: 'center' }}>
          <Text style={{
            fontSize: 11,
            color: '#9CA3AF',
            textAlign: 'center',
          }}>
            North Cakes CDO © 2024
          </Text>
          <Text style={{
            fontSize: 10,
            color: '#D1D5DB',
            textAlign: 'center',
            marginTop: 4,
          }}>
            Mobile Management System v1.0
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}