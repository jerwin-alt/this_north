// import React from 'react';
// import { View, Text, TouchableOpacity } from 'react-native';
// import { useAuth } from '@/contexts/AuthContext';
// import { Ionicons } from '@expo/vector-icons';

// export default function LoyaltyScreen() {
//   const { user } = useAuth();
//   const stamps = user?.signature_stamps || 0;

//   return (
//     <View className="flex-1 bg-cream p-4">
//       <Text className="text-2xl font-playfair text-sage mb-4">⭐ Loyalty Rewards</Text>
//       <View className="bg-sage rounded-xl p-6 items-center mb-6">
//         <Text className="text-white text-lg">Your Stamps</Text>
//         <Text className="text-4xl font-bold text-gold">{stamps} / 10</Text>
//         <View className="flex-row flex-wrap justify-center mt-4">
//           {[...Array(10)].map((_, i) => (
//             <View key={i} className={`w-10 h-10 rounded-full m-1 items-center justify-center ${i < stamps ? 'bg-gold' : 'bg-white/30'}`}>
//               {i < stamps && <Ionicons name="star" size={16} color="#fff" />}
//             </View>
//           ))}
//         </View>
//       </View>
//       <Text className="font-semibold text-sage mb-2">Available Rewards:</Text>
//       <View className="bg-white rounded-xl p-4 mb-2 flex-row justify-between items-center">
//         <View><Text>🎂 Free Cake Slice</Text><Text className="text-xs text-warm-gray">5 stamps</Text></View>
//         <TouchableOpacity disabled={stamps < 5} className={`px-4 py-2 rounded-lg ${stamps >= 5 ? 'bg-gold' : 'bg-warm-gray/30'}`}><Text className={stamps >= 5 ? 'text-white' : 'text-warm-gray'}>Claim</Text></TouchableOpacity>
//       </View>
//       <View className="bg-white rounded-xl p-4 flex-row justify-between items-center">
//         <View><Text>🎫 30% Off</Text><Text className="text-xs text-warm-gray">10 stamps</Text></View>
//         <TouchableOpacity disabled={stamps < 10} className={`px-4 py-2 rounded-lg ${stamps >= 10 ? 'bg-gold' : 'bg-warm-gray/30'}`}><Text className={stamps >= 10 ? 'text-white' : 'text-warm-gray'}>Claim</Text></TouchableOpacity>
//       </View>
//     </View>
//   );
// }