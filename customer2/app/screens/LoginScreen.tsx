// import React, { useState } from 'react';
// import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
// import { useAuth } from '@/contexts/AuthContext';
// import { Ionicons } from '@expo/vector-icons';

// export default function LoginScreen({ navigation }: any) {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [secure, setSecure] = useState(true);
//   const { login } = useAuth();

//   const handleLogin = async () => {
//     try {
//       await login(email, password);
//       navigation.replace('Home');
//     } catch (err: any) {
//       Alert.alert('Error', err.response?.data?.message || 'Invalid credentials');
//     }
//   };

//   return (
//     <View className="flex-1 bg-cream justify-center p-6">
//       <View className="items-center mb-10">
//         <Ionicons name="cafe-outline" size={80} color="#4F5F52" />
//         <Text className="text-3xl font-playfair text-sage mt-2">North Cakes CDO</Text>
//       </View>
//       <TextInput
//         placeholder="Email"
//         value={email}
//         onChangeText={setEmail}
//         className="border border-warm-gray/40 rounded-lg p-3 mb-4 bg-white"
//         autoCapitalize="none"
//       />
//       <View className="flex-row border border-warm-gray/40 rounded-lg p-3 mb-4 bg-white items-center">
//         <TextInput
//           placeholder="Password"
//           secureTextEntry={secure}
//           value={password}
//           onChangeText={setPassword}
//           className="flex-1"
//         />
//         <TouchableOpacity onPress={() => setSecure(!secure)}>
//           <Ionicons name={secure ? 'eye-off' : 'eye'} size={20} color="#A6A29A" />
//         </TouchableOpacity>
//       </View>
//       <TouchableOpacity onPress={handleLogin} className="bg-sage py-3 rounded-lg">
//         <Text className="text-white text-center font-bold">Sign In</Text>
//       </TouchableOpacity>
//       <TouchableOpacity onPress={() => navigation.navigate('Register')} className="mt-4">
//         <Text className="text-sage text-center">Create Account</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }