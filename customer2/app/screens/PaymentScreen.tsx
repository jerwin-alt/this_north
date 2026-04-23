// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
// import api from '../../../customer2/services/api';
// import { Ionicons } from '@expo/vector-icons';

// export default function PaymentScreen({ route, navigation }: any) {
//   const { order } = route.params;
//   const [method, setMethod] = useState<'cash' | 'gcash'>('cash');
//   const [amountPaid, setAmountPaid] = useState('');

//   const processPayment = async () => {
//     if (method === 'cash' && parseFloat(amountPaid) < order.total_amount) {
//       Alert.alert('Error', 'Amount paid is less than total');
//       return;
//     }
//     try {
//       const res = await api.post('/payments', {
//         order_id: order.id,
//         payment_method: method,
//         amount_paid: method === 'cash' ? parseFloat(amountPaid) : order.total_amount,
//       });
//       navigation.replace('Receipt', { payment: res.data.payment, order: res.data.order });
//     } catch (err) {
//       Alert.alert('Error', 'Payment failed');
//     }
//   };

//   return (
//     <View className="flex-1 bg-cream p-4">
//       <Text className="text-2xl font-playfair text-sage mb-4">Payment</Text>
//       <View className="bg-white rounded-xl p-4 mb-4">
//         <Text className="text-lg">Order: {order.order_number}</Text>
//         <Text className="text-2xl font-bold text-sage mt-2">Total: ₱{order.total_amount}</Text>
//       </View>
//       <View className="flex-row gap-3 mb-4">
//         <TouchableOpacity onPress={() => setMethod('cash')} className={`flex-1 p-3 rounded-xl border ${method === 'cash' ? 'border-sage bg-sage/10' : 'border-warm-gray'}`}>
//           <Text className="text-center">💵 Cash</Text>
//         </TouchableOpacity>
//         <TouchableOpacity onPress={() => setMethod('gcash')} className={`flex-1 p-3 rounded-xl border ${method === 'gcash' ? 'border-sage bg-sage/10' : 'border-warm-gray'}`}>
//           <Text className="text-center">📱 GCash</Text>
//         </TouchableOpacity>
//       </View>
//       {method === 'cash' && (
//         <TextInput placeholder="Amount Tendered" value={amountPaid} onChangeText={setAmountPaid} keyboardType="numeric" className="border border-warm-gray/40 rounded-lg p-3 mb-4 bg-white" />
//       )}
//       <TouchableOpacity onPress={processPayment} className="bg-sage py-3 rounded-lg">
//         <Text className="text-white text-center font-bold">Pay Now</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }