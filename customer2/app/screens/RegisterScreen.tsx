// import React, { useState } from 'react';
// import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
// import { useAuth } from '@/contexts/AuthContext';
// import { Ionicons } from '@expo/vector-icons';

// export default function RegisterScreen({ navigation }: any) {
//   const [form, setForm] = useState({
//     first_name: '', last_name: '', email: '', password: '', password_confirmation: '',
//     phone: '', birth_date: '', address: '',
//   });
//   const [secure, setSecure] = useState(true);
//   const { register } = useAuth();

//   const handleRegister = async () => {
//     if (form.password !== form.password_confirmation) {
//       Alert.alert('Error', 'Passwords do not match');
//       return;
//     }
//     try {
//       await register(form);
//       navigation.navigate('Otp', { email: form.email });
//     } catch (err: any) {
//       Alert.alert('Error', err.response?.data?.message || 'Registration failed');
//     }
//   };

//   return (
//     <ScrollView className="flex-1 bg-cream p-6">
//       <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
//         <Ionicons name="arrow-back" size={24} color="#4F5F52" />
//       </TouchableOpacity>
//       <View className="items-center mb-6">
//         <Ionicons name="person-add-outline" size={60} color="#4F5F52" />
//         <Text className="text-2xl font-playfair text-sage mt-2">Create Account</Text>
//       </View>
//       <TextInput placeholder="First Name" value={form.first_name} onChangeText={t => setForm({...form, first_name: t})} className="border border-warm-gray/40 rounded-lg p-3 mb-3 bg-white" />
//       <TextInput placeholder="Last Name" value={form.last_name} onChangeText={t => setForm({...form, last_name: t})} className="border border-warm-gray/40 rounded-lg p-3 mb-3 bg-white" />
//       <TextInput placeholder="Email" value={form.email} onChangeText={t => setForm({...form, email: t})} className="border border-warm-gray/40 rounded-lg p-3 mb-3 bg-white" autoCapitalize="none" />
//       <TextInput placeholder="Phone" value={form.phone} onChangeText={t => setForm({...form, phone: t})} className="border border-warm-gray/40 rounded-lg p-3 mb-3 bg-white" />
//       <TextInput placeholder="Birth Date (YYYY-MM-DD)" value={form.birth_date} onChangeText={t => setForm({...form, birth_date: t})} className="border border-warm-gray/40 rounded-lg p-3 mb-3 bg-white" />
//       <TextInput placeholder="Address" value={form.address} onChangeText={t => setForm({...form, address: t})} className="border border-warm-gray/40 rounded-lg p-3 mb-3 bg-white" />
//       <View className="flex-row border border-warm-gray/40 rounded-lg p-3 mb-3 bg-white items-center">
//         <TextInput placeholder="Password" secureTextEntry={secure} value={form.password} onChangeText={t => setForm({...form, password: t})} className="flex-1" />
//         <TouchableOpacity onPress={() => setSecure(!secure)}><Ionicons name={secure ? 'eye-off' : 'eye'} size={20} color="#A6A29A" /></TouchableOpacity>
//       </View>
//       <TextInput placeholder="Confirm Password" secureTextEntry={secure} value={form.password_confirmation} onChangeText={t => setForm({...form, password_confirmation: t})} className="border border-warm-gray/40 rounded-lg p-3 mb-6 bg-white" />
//       <TouchableOpacity onPress={handleRegister} className="bg-sage py-3 rounded-lg">
//         <Text className="text-black text-center font-bold">Register</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }