// import React from 'react';
// import { View, Text, TouchableOpacity } from 'react-native';
// import { useAuth } from '@/contexts/AuthContext';
// import { Ionicons } from '@expo/vector-icons';

// export default function ProfileScreen({ navigation }: any) {
//   const { user, logout } = useAuth();

//   const handleLogout = async () => {
//     await logout();
//     navigation.replace('Login');
//   };

//   return (
//     <View className="flex-1 bg-cream p-4">
//       <View className="items-center mb-6">
//         <View className="w-24 h-24 bg-sage/20 rounded-full items-center justify-center">
//           <Ionicons name="person" size={48} color="#4F5F52" />
//         </View>
//         <Text className="text-xl font-playfair text-sage mt-2">{user?.first_name} {user?.last_name}</Text>
//         <Text className="text-warm-gray">{user?.email}</Text>
//       </View>
//       <View className="bg-white rounded-xl p-4 mb-3">
//         <Text className="text-warm-gray">Phone</Text>
//         <Text>{user?.phone || 'Not set'}</Text>
//       </View>
//       <View className="bg-white rounded-xl p-4 mb-3">
//         <Text className="text-warm-gray">Address</Text>
//         <Text>{user?.address || 'Not set'}</Text>
//       </View>
//       <View className="bg-white rounded-xl p-4 mb-3">
//         <Text className="text-warm-gray">Verification Status</Text>
//         <Text className="capitalize">{user?.verification_status || 'pending'}</Text>
//       </View>
//       <TouchableOpacity onPress={handleLogout} className="bg-red/10 py-3 rounded-lg mt-4">
//         <Text className="text-red text-center font-bold">Logout</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }