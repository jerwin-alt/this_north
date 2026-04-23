// import React from 'react';
// import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
// import { useAuth } from '@/contexts/AuthContext';
// import { Ionicons } from '@expo/vector-icons';

// export default function HomeScreen({ navigation }: any) {
//   const { user } = useAuth();

//   return (
//     <ScrollView className="flex-1 bg-cream">
//       <View className="bg-sage p-6 pt-12">
//         <Text className="text-white text-2xl font-playfair">Welcome, {user?.first_name}!</Text>
//         <Text className="text-white/70 mt-1">⭐ {user?.signature_stamps || 0} loyalty stamps</Text>
//       </View>
//       <View className="p-4">
//         <View className="flex-row flex-wrap justify-between">
//           <TouchableOpacity onPress={() => navigation.navigate('Menu')} className="bg-white w-[30%] p-4 rounded-xl items-center mb-4 shadow">
//             <Ionicons name="restaurant-outline" size={32} color="#4F5F52" />
//             <Text className="text-sage mt-2">Order</Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => navigation.navigate('Design')} className="bg-white w-[30%] p-4 rounded-xl items-center mb-4 shadow">
//             <Ionicons name="color-palette-outline" size={32} color="#4F5F52" />
//             <Text className="text-sage mt-2">Custom Cake</Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => navigation.navigate('Orders')} className="bg-white w-[30%] p-4 rounded-xl items-center mb-4 shadow">
//             <Ionicons name="receipt-outline" size={32} color="#4F5F52" />
//             <Text className="text-sage mt-2">My Orders</Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => navigation.navigate('Loyalty')} className="bg-white w-[30%] p-4 rounded-xl items-center mb-4 shadow">
//             <Ionicons name="star-outline" size={32} color="#4F5F52" />
//             <Text className="text-sage mt-2">Rewards</Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => navigation.navigate('Profile')} className="bg-white w-[30%] p-4 rounded-xl items-center mb-4 shadow">
//             <Ionicons name="person-outline" size={32} color="#4F5F52" />
//             <Text className="text-sage mt-2">Profile</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }