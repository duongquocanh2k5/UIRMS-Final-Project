/**
 * Navigation Structure
 * Routes and tab navigation for the app
 */

import React from 'react';
// Bỏ NavigationContainer ở đây để App.tsx bọc ngoài là chuẩn nhất
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native'; // 🛠️ SỬA LỖI 1: Đã thêm Text vào đây

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import ReportIncidentScreen from '../screens/ReportIncidentScreen';
import MyIncidentsScreen from '../screens/MyIncidentsScreen';
import IncidentDetailScreen from '../screens/IncidentDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Tạo một Stack tổng để quản lý luồng Auth và App gọn gàng theo chuẩn v7
const RootStack = createNativeStackNavigator();
const AuthStackNavigator = createNativeStackNavigator();
const HomeStackNavigator = createNativeStackNavigator();
const MyIncidentsStackNavigator = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <AuthStackNavigator.Navigator
    initialRouteName="Login"
    screenOptions={{ headerShown: false }}
  >
    <AuthStackNavigator.Screen name="Login" component={LoginScreen} />
    <AuthStackNavigator.Screen name="Register" component={RegisterScreen} />
    <AuthStackNavigator.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStackNavigator.Navigator>
);

const HomeStack = () => (
  <HomeStackNavigator.Navigator
    screenOptions={{
      headerShown: true,
      headerBackTitle: 'Quay lại',
    }}
  >
    <HomeStackNavigator.Screen
      name="HomeMain"
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <HomeStackNavigator.Screen
      name="ReportIncident"
      component={ReportIncidentScreen}
      options={{ title: 'Báo cáo sự cố' }}
    />
    <HomeStackNavigator.Screen
      name="IncidentDetail"
      component={IncidentDetailScreen}
      options={{ title: 'Chi tiết sự cố' }}
    />
  </HomeStackNavigator.Navigator>
);

const MyIncidentsStack = () => (
  <MyIncidentsStackNavigator.Navigator
    screenOptions={{
      headerShown: true,
      headerBackTitle: 'Quay lại',
    }}
  >
    <MyIncidentsStackNavigator.Screen
      name="MyIncidentsMain"
      component={MyIncidentsScreen}
      options={{ headerShown: false }}
    />
    <MyIncidentsStackNavigator.Screen
      name="IncidentDetail"
      component={IncidentDetailScreen}
      options={{ title: 'Chi tiết sự cố' }}
    />
  </MyIncidentsStackNavigator.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={() => ({
      headerShown: false,
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#999',
      tabBarLabelStyle: { fontSize: 12 },
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        height: 60,
        paddingBottom: 8,
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomeStack}
      options={{ title: 'Trang chủ', tabBarLabel: 'Trang chủ' }}
    />
    <Tab.Screen
      name="MyIncidents"
      component={MyIncidentsStack}
      options={{ title: 'Báo cáo của tôi', tabBarLabel: 'Báo cáo' }}
    />
    <Tab.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Thông báo', tabBarLabel: 'Thông báo' }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Hồ sơ', tabBarLabel: 'Hồ sơ' }}
    />
  </Tab.Navigator>
);

export const RootNavigator = () => {
  const { isSignedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10, color: '#333' }}>Đang tải cấu hình hệ thống...</Text>
      </View>
    );
  }

  // 🛠️ SỬA LỖI 2: Chỉ cần return trực tiếp luồng Navigator, việc bọc Container hãy để App.tsx lo
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isSignedIn ? (
        <RootStack.Screen name="App" component={AppTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthStack} />
      )}
    </RootStack.Navigator>
  );
};