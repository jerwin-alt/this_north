// import React, { useState } from 'react';
// import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
// import { useAuth } from '@/contexts/AuthContext';
// import { Ionicons } from '@expo/vector-icons';

// export default function OtpScreen({ route, navigation }: any) {
//   const { email } = route.params;
//   const [otp, setOtp] = useState('');
//   const { verifyOtp } = useAuth();

//   const handleVerify = async () => {
//     try {
//       await verifyOtp(email, otp);
//       Alert.alert('Success', 'Account verified! Please login.');
//       navigation.navigate('Login');
//     } catch (err: any) {
//       Alert.alert('Error', err.response?.data?.message || 'Invalid OTP');
//     }
//   };

//   return (
//     <View className="flex-1 bg-cream justify-center p-6">
//       <Ionicons name="mail-outline" size={80} color="#4F5F52" className="self-center mb-4" />
//       <Text className="text-xl font-playfair text-sage text-center mb-2">Verify OTP</Text>
//       <Text className="text-center text-warm-gray mb-6">Enter the code sent to {email}</Text>
//       <TextInput placeholder="6-digit code" value={otp} onChangeText={setOtp} keyboardType="number-pad" className="border border-warm-gray/40 rounded-lg p-3 mb-4 bg-white text-center text-lg" />
//       <TouchableOpacity onPress={handleVerify} className="bg-sage py-3 rounded-lg">
//         <Text className="text-white text-center font-bold">Verify</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }