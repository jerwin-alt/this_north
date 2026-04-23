// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import api from '../../../customer2/services/api';

// const elements = [
//   { type: 'shape', name: 'Round', icon: 'radio-button-on' },
//   { type: 'shape', name: 'Square', icon: 'square' },
//   { type: 'shape', name: 'Heart', icon: 'heart' },
//   { type: 'icing', name: 'Buttercream', icon: 'color-fill' },
//   { type: 'icing', name: 'Fondant', icon: 'brush' },
//   { type: 'topping', name: 'Sprinkles', icon: 'sparkles' },
//   { type: 'topping', name: 'Flowers', icon: 'flower' },
//   { type: 'decoration', name: 'Candles', icon: 'cafe' },
// ];

// export default function DesignScreen() {
//   const [selected, setSelected] = useState({});
//   const [submitted, setSubmitted] = useState(false);

//   const toggle = (cat, name) => {
//     setSelected(prev => ({ ...prev, [cat]: name }));
//   };

//   const submitDesign = async () => {
//     if (Object.keys(selected).length === 0) return;
//     try {
//       await api.post('/custom-designs', {
//         design_name: 'Custom Cake',
//         custom_flavor: 'Vanilla',
//         cake_size_id: 1,
//         design_data: selected,
//       });
//       setSubmitted(true);
//     } catch (err) {
//       Alert.alert('Error', 'Failed to save design');
//     }
//   };

//   if (submitted) {
//     return (
//       <View className="flex-1 bg-cream justify-center items-center p-4">
//         <Ionicons name="checkmark-circle" size={64} color="#5B8A5E" />
//         <Text className="text-xl font-playfair text-sage mt-2">Design Submitted!</Text>
//         <Text className="text-warm-gray text-center mt-2">Our team will review your custom cake.</Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView className="flex-1 bg-cream p-4">
//       <Text className="text-2xl font-playfair text-sage mb-4">🎨 Custom Cake Designer</Text>
//       <View className="bg-white rounded-xl p-6 items-center mb-4 border border-dashed border-sage">
//         <Ionicons name="cafe-outline" size={64} color="#4F5F52" />
//         <Text className="text-warm-gray mt-2">Preview</Text>
//         {Object.entries(selected).map(([cat, val]) => (
//           <Text key={cat} className="text-sage text-sm mt-1">{val}</Text>
//         ))}
//       </View>
//       {['Shape', 'Icing', 'Topping', 'Decoration'].map(cat => (
//         <View key={cat} className="mb-4">
//           <Text className="font-semibold text-sage mb-2">{cat}</Text>
//           <View className="flex-row flex-wrap">
//             {elements.filter(e => e.type === cat.toLowerCase()).map(el => (
//               <TouchableOpacity key={el.name} onPress={() => toggle(cat.toLowerCase(), el.name)} className={`mr-2 mb-2 px-4 py-2 rounded-full border ${selected[cat.toLowerCase()] === el.name ? 'bg-sage border-sage' : 'bg-white border-warm-gray/40'}`}>
//                 <Text className={selected[cat.toLowerCase()] === el.name ? 'text-white' : 'text-sage'}>{el.name}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//       ))}
//       <TouchableOpacity onPress={submitDesign} className="bg-sage py-3 rounded-lg mt-4">
//         <Text className="text-white text-center font-bold">Submit Design</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }