import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TabLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: '#1e40af' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700' },
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: { borderTopColor: '#e5e7eb', elevation: 8, shadowColor: '#000', shadowOpacity: 0.08 },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
      }} />
      <Tabs.Screen name="courses" options={{
        title: 'Courses',
        tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
      }} />
      <Tabs.Screen name="quizzes" options={{
        title: 'Quizzes',
        tabBarIcon: ({ color, size }) => <Ionicons name="help-circle" color={color} size={size} />,
      }} />
      <Tabs.Screen name="payments" options={{
        title: 'Payments',
        tabBarIcon: ({ color, size }) => <Ionicons name="card" color={color} size={size} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
      }} />
    </Tabs>
  );
}
