/**
 * Navigation Structure
 * Routes and tab navigation for the app
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import HomeScreen from '@/screens/HomeScreen';
import ReportIncidentScreen from '@/screens/ReportIncidentScreen';
import MyIncidentsScreen from '@/screens/MyIncidentsScreen';
import IncidentDetailScreen from '@/screens/IncidentDetailScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import AIChatScreen from '@/screens/AIChatScreen';

const RootStack = createNativeStackNavigator();
const AuthStackNavigator = createNativeStackNavigator();
const HomeStackNavigator = createNativeStackNavigator();
const MyIncidentsStackNavigator = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <AuthStackNavigator.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
    <AuthStackNavigator.Screen name="Login" component={LoginScreen} />
    <AuthStackNavigator.Screen name="Register" component={RegisterScreen} />
    <AuthStackNavigator.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStackNavigator.Navigator>
);

const HomeStack = () => {
  const { t } = useLanguage();
  return <HomeStackNavigator.Navigator
    screenOptions={{
      headerShown: true,
      headerBackTitle: t('Quay lại', 'Back'),
      headerTintColor: '#142532',
      headerTitleStyle: { fontWeight: '700' },
    }}
  >
    <HomeStackNavigator.Screen
      name="HomeMain"
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <HomeStackNavigator.Screen
      name="AIChat"
      component={AIChatScreen}
      options={{ title: t('Trợ lý AI Đô thị', 'Urban AI Assistant') }}
    />
    <HomeStackNavigator.Screen
      name="ReportIncident"
      component={ReportIncidentScreen}
      options={{ title: t('Báo cáo sự cố', 'Report an Incident') }}
    />
    <HomeStackNavigator.Screen
      name="IncidentDetail"
      component={IncidentDetailScreen}
      options={{ title: t('Chi tiết sự cố', 'Incident Details') }}
    />
  </HomeStackNavigator.Navigator>;
};

const MyIncidentsStack = () => {
  const { t } = useLanguage();
  return <MyIncidentsStackNavigator.Navigator
    screenOptions={{
      headerShown: true,
      headerBackTitle: t('Quay lại', 'Back'),
      headerTintColor: '#142532',
      headerTitleStyle: { fontWeight: '700' },
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
      options={{ title: t('Chi tiết sự cố', 'Incident Details') }}
    />
  </MyIncidentsStackNavigator.Navigator>;
};

const AppTabs = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#0A9D96',
        tabBarInactiveTintColor: '#8B9AA6',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            MyIncidents: focused ? 'document-text' : 'document-text-outline',
            Notifications: focused ? 'notifications' : 'notifications-outline',
            Profile: focused ? 'person' : 'person-outline',
          } as const;

          return (
            <Ionicons
              name={icons[route.name as keyof typeof icons]}
              size={size}
              color={color}
            />
          );
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5EDF1',
          height: 58 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 8,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ title: t('Trang chủ', 'Home'), tabBarLabel: t('Trang chủ', 'Home') }}
      />
      <Tab.Screen
        name="MyIncidents"
        component={MyIncidentsStack}
        options={{ title: t('Báo cáo của tôi', 'My Reports'), tabBarLabel: t('Báo cáo', 'Reports') }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('Thông báo', 'Notifications'), tabBarLabel: t('Thông báo', 'Notifications') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('Hồ sơ', 'Profile'), tabBarLabel: t('Hồ sơ', 'Profile') }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { isSignedIn, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F5F8FA',
        }}
      >
        <ActivityIndicator size="large" color="#0A9D96" />
        <Text style={{ marginTop: 10, color: '#334155', fontWeight: '600' }}>
          {t('Đang tải cấu hình hệ thống...', 'Loading your account...')}
        </Text>
      </View>
    );
  }

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