import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';

const { width, height } = Dimensions.get('window');
const { logout } = useAuth();

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

export default function CustomerDashboard({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [userName] = useState("John Doe");
  
  // Sample data
  const recentOrders: Order[] = [
    { id: '1', order_number: 'ORD-001', total_amount: 250, status: 'pending', date: '2024-01-15' },
    { id: '2', order_number: 'ORD-002', total_amount: 450, status: 'completed', date: '2024-01-14' },
    { id: '3', order_number: 'ORD-003', total_amount: 180, status: 'completed', date: '2024-01-13' },
  ];

  const featuredItems: MenuItem[] = [
    { id: '1', name: 'Chocolate Cake', price: 350, category: 'Cakes' },
    { id: '2', name: 'Red Velvet', price: 400, category: 'Cakes' },
    { id: '3', name: 'Cheesecake', price: 380, category: 'Cakes' },
    { id: '4', name: 'Cupcakes', price: 120, category: 'Pastries' },
  ];

  const stats = [
    { label: 'Total Orders', value: '12', icon: 'cart-outline', color: '#2D6A4F' },
    { label: 'Points Earned', value: '850', icon: 'star-outline', color: '#F59E0B' },
    { label: 'Pending', value: '2', icon: 'time-outline', color: '#EF4444' },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error){
      console.log("Logout Error.", error);
      router.replace("/");
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="light" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#2D6A4F', '#1B4D2E', '#0F3623']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: height * 0.06,
          paddingBottom: height * 0.03,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        {/* Header Top Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Welcome back,</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 2 }}>
              {userName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: 10,
              borderRadius: 12,
            }}
          >
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Welcome Message */}
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>
          Ready to satisfy your sweet cravings? 🎂
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D6A4F']} />
        }
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Stats Cards */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          marginHorizontal: 20, 
          marginTop: -30,
          marginBottom: 24,
        }}>
          {stats.map((stat, index) => (
            <View key={index} style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              marginHorizontal: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                    {stat.label}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: `${stat.color}15`,
                  padding: 8,
                  borderRadius: 12,
                }}>
                  <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              marginRight: 8,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <Ionicons name="restaurant-outline" size={32} color="#2D6A4F" />
              <Text style={{ fontSize: 13, color: '#374151', marginTop: 8, fontWeight: '500' }}>
                Order Now
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              marginLeft: 8,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <Ionicons name="time-outline" size={32} color="#2D6A4F" />
              <Text style={{ fontSize: 13, color: '#374151', marginTop: 8, fontWeight: '500' }}>
                Track Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Menu Items */}
        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937' }}>
              Featured Items
            </Text>
            <TouchableOpacity>
              <Text style={{ fontSize: 13, color: '#2D6A4F', fontWeight: '500' }}>
                See All →
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredItems.map((item) => (
              <TouchableOpacity key={item.id} style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginRight: 12,
                width: 150,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <View style={{
                  backgroundColor: '#E8F5E9',
                  borderRadius: 12,
                  padding: 20,
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  {/* <Ionicons name="cake-outline" size={40} color="#2D6A4F" /> */}
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {item.category}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2D6A4F', marginTop: 8 }}>
                  ₱{item.price}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Orders */}
        <View style={{ marginHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937' }}>
              Recent Orders
            </Text>
            <TouchableOpacity>
              <Text style={{ fontSize: 13, color: '#2D6A4F', fontWeight: '500' }}>
                View All →
              </Text>
            </TouchableOpacity>
          </View>
          
          {recentOrders.map((order) => (
            <TouchableOpacity key={order.id} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                    {order.order_number}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    {order.date}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2D6A4F' }}>
                    ₱{order.total_amount}
                  </Text>
                  <View style={{
                    backgroundColor: `${getStatusColor(order.status)}15`,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    marginTop: 4,
                  }}>
                    <Text style={{
                      fontSize: 11,
                      color: getStatusColor(order.status),
                      fontWeight: '500',
                    }}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Navigation Placeholder */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-around', 
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          marginTop: 24,
          marginHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <TouchableOpacity style={{ alignItems: 'center' }}>
            <Ionicons name="home" size={24} color="#2D6A4F" />
            <Text style={{ fontSize: 11, color: '#2D6A4F', marginTop: 4 }}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }}>
            <Ionicons name="cart-outline" size={24} color="#6B7280" />
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }}>
            <Ionicons name="heart-outline" size={24} color="#6B7280" />
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Favorites</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }}>
            <Ionicons name="person-outline" size={24} color="#6B7280" />
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}