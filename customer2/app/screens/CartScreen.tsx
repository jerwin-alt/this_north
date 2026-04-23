// import React, { useState, useEffect } from 'react';
// import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Ionicons } from '@expo/vector-icons';
// // import api from '../../../customer2/services/api';

// export default function CartScreen({ navigation, route }: any) {
//   const [cart, setCart] = useState([]);
//   const [total, setTotal] = useState(0);

//   useEffect(() => {
//     loadCart();
//   }, []);

//   useEffect(() => {
//     if (route.params?.addedProduct) {
//       addToCart(route.params.addedProduct);
//     }
//   }, [route.params]);

//   const loadCart = async () => {
//     const stored = await AsyncStorage.getItem('cart');
//     if (stored) {
//       const items = JSON.parse(stored);
//       setCart(items);
//       calcTotal(items);
//     }
//   };

//   const saveCart = async (items) => {
//     await AsyncStorage.setItem('cart', JSON.stringify(items));
//     setCart(items);
//     calcTotal(items);
//   };

//   const addToCart = (product) => {
//     const existing = cart.find(i => i.id === product.id);
//     let newCart;
//     if (existing) {
//       newCart = cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
//     } else {
//       newCart = [...cart, { ...product, quantity: 1 }];
//     }
//     saveCart(newCart);
//   };

//   const updateQty = (id, delta) => {
//     const newCart = cart.map(i => {
//       if (i.id === id) {
//         const qty = i.quantity + delta;
//         if (qty <= 0) return null;
//         return { ...i, quantity: qty };
//       }
//       return i;
//     }).filter(Boolean);
//     saveCart(newCart);
//   };

//   const calcTotal = (items) => {
//     const sum = items.reduce((s, i) => s + i.base_price * i.quantity, 0);
//     setTotal(sum);
//   };

//   const checkout = async () => {
//     if (cart.length === 0) return;
//     const orderItems = cart.map(i => ({ product_id: i.id, quantity: i.quantity, cake_type: 'standard' }));
//     try {
//       const res = await api.post('/orders', {
//         items: orderItems,
//         pickup_date: new Date().toISOString().split('T')[0],
//         pickup_time: '12:00:00',
//         is_walk_in: false,
//       });
//       await AsyncStorage.removeItem('cart');
//       navigation.navigate('Payment', { order: res.data });
//     } catch (err) {
//       Alert.alert('Error', 'Failed to place order');
//     }
//   };

//   return (
//     <View className="flex-1 bg-cream p-4">
//       <Text className="text-2xl font-playfair text-sage mb-4">My Cart</Text>
//       {cart.length === 0 ? (
//         <Text className="text-center text-warm-gray mt-10">Your cart is empty</Text>
//       ) : (
//         <>
//           <FlatList
//             data={cart}
//             keyExtractor={item => item.id.toString()}
//             renderItem={({ item }) => (
//               <View className="bg-white rounded-xl p-3 mb-3 flex-row items-center">
//                 <Ionicons name="cake" size={40} color="#4F5F52" />
//                 <View className="flex-1 ml-3">
//                   <Text className="font-semibold">{item.name}</Text>
//                   <Text className="text-warm-gray">₱{item.base_price} x {item.quantity}</Text>
//                 </View>
//                 <View className="flex-row items-center">
//                   <TouchableOpacity onPress={() => updateQty(item.id, -1)} className="bg-cream-light px-3 py-1 rounded"><Text>-</Text></TouchableOpacity>
//                   <Text className="mx-3 w-6 text-center">{item.quantity}</Text>
//                   <TouchableOpacity onPress={() => updateQty(item.id, 1)} className="bg-cream-light px-3 py-1 rounded"><Text>+</Text></TouchableOpacity>
//                 </View>
//               </View>
//             )}
//           />
//           <View className="bg-white rounded-xl p-4 mt-4">
//             <Text className="text-lg font-bold text-sage">Total: ₱{total}</Text>
//             <TouchableOpacity onPress={checkout} className="mt-3 bg-sage py-3 rounded-lg">
//               <Text className="text-white text-center font-bold">Proceed to Payment</Text>
//             </TouchableOpacity>
//           </View>
//         </>
//       )}
//     </View>
//   );
// }