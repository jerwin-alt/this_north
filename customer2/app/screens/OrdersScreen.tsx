// import React, { useState, useEffect } from 'react';
// import { View, Text, FlatList } from 'react-native';
// import api from '../../../customer2/services/api';
// import { Ionicons } from '@expo/vector-icons';

// export default function OrdersScreen() {
//   const [orders, setOrders] = useState([]);

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const fetchOrders = async () => {
//     const res = await api.get('/orders');
//     setOrders(res.data);
//   };

//   const statusColors = {
//     pending: '#D4A03D', confirmed: '#5B7A8A', preparing: '#7A5B8A', ready: '#5B8A5E', completed: '#4F5F52', cancelled: '#C75B5B',
//   };

//   return (
//     <View className="flex-1 bg-cream p-4">
//       <Text className="text-2xl font-playfair text-sage mb-4">My Orders</Text>
//       <FlatList
//         data={orders}
//         keyExtractor={item => item.id.toString()}
//         renderItem={({ item }) => (
//           <View className="bg-white rounded-xl p-4 mb-3">
//             <View className="flex-row justify-between">
//               <Text className="font-semibold">{item.order_number}</Text>
//               <Text style={{ color: statusColors[item.status] }} className="capitalize">{item.status}</Text>
//             </View>
//             <Text className="text-warm-gray mt-1">Pickup: {item.pickup_date} {item.pickup_time}</Text>
//             <Text className="text-sage font-bold mt-2">₱{item.total_amount}</Text>
//           </View>
//         )}
//       />
//     </View>
//   );
// }