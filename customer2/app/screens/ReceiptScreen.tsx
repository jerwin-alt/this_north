// import React from 'react';
// import { View, Text, TouchableOpacity } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';

// export default function ReceiptScreen({ route, navigation }: any) {
//   const { payment, order } = route.params;

//   return (
//     <View className="flex-1 bg-cream justify-center p-6">
//       <View className="bg-white rounded-xl p-6 items-center">
//         <Ionicons name="checkmark-circle" size={64} color="#5B8A5E" />
//         <Text className="text-xl font-playfair text-sage mt-2">Payment Successful</Text>
//         <View className="w-full border-t border-warm-gray/20 my-4" />
//         <Text>Order #{order.order_number}</Text>
//         <Text className="text-2xl font-bold text-sage mt-2">₱{payment.final_amount}</Text>
//         <Text>Paid via {payment.payment_method.toUpperCase()}</Text>
//         {payment.change_amount > 0 && <Text>Change: ₱{payment.change_amount}</Text>}
//         <TouchableOpacity onPress={() => navigation.replace('Home')} className="mt-6 bg-sage py-3 px-6 rounded-lg">
//           <Text className="text-white font-bold">Back to Home</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }