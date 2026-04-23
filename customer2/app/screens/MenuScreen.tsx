// import React, { useState, useEffect } from 'react';
// import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
// import api from '../../../customer2/services/api';
// import { Ionicons } from '@expo/vector-icons';

// export default function MenuScreen({ navigation }: any) {
//   const [products, setProducts] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [selectedCat, setSelectedCat] = useState('all');

//   useEffect(() => {
//     fetchProducts();
//     fetchCategories();
//   }, []);

//   const fetchProducts = async () => {
//     const res = await api.get('/products');
//     setProducts(res.data);
//   };
//   const fetchCategories = async () => {
//     const res = await api.get('/categories');
//     setCategories(res.data);
//   };

//   const filtered = selectedCat === 'all' ? products : products.filter(p => p.category_id === selectedCat);

//   const addToCart = (product) => {
//     // Store in global cart context or AsyncStorage – simplified
//     navigation.navigate('Cart', { addedProduct: product });
//   };

//   return (
//     <View className="flex-1 bg-cream">
//       <View className="p-4">
//         <Text className="text-2xl font-playfair text-sage">Our Menu</Text>
//         <FlatList
//           horizontal
//           data={[{ id: 'all', name: 'All' }, ...categories]}
//           keyExtractor={item => item.id.toString()}
//           renderItem={({ item }) => (
//             <TouchableOpacity onPress={() => setSelectedCat(item.id)} className={`mr-3 px-4 py-2 rounded-full ${selectedCat === item.id ? 'bg-sage' : 'bg-white'}`}>
//               <Text className={selectedCat === item.id ? 'text-white' : 'text-sage'}>{item.name}</Text>
//             </TouchableOpacity>
//           )}
//           className="mb-4"
//         />
//         <FlatList
//           data={filtered}
//           keyExtractor={item => item.id.toString()}
//           numColumns={2}
//           columnWrapperStyle={{ justifyContent: 'space-between' }}
//           renderItem={({ item }) => (
//             <View className="bg-white w-[48%] rounded-xl mb-4 overflow-hidden shadow">
//               <View className="h-32 bg-cream-light items-center justify-center">
//                 <Ionicons name="cake-outline" size={48} color="#4F5F52" />
//               </View>
//               <View className="p-3">
//                 <Text className="font-semibold text-sage">{item.name}</Text>
//                 <Text className="text-warm-gray text-sm mt-1">₱{item.base_price}</Text>
//                 <TouchableOpacity onPress={() => addToCart(item)} className="mt-2 bg-sage py-2 rounded-lg">
//                   <Text className="text-white text-center text-sm">Add to Cart</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}
//         />
//       </View>
//     </View>
//   );
// }