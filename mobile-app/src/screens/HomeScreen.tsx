import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // Khi đã logout thành công, RootNavigator sẽ chuyển về AuthStack tự động.
    } catch (e) {
      console.log('Logout error', e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trang chủ</Text>
        <Text style={styles.subtitle}>Chào mừng bạn đến với UIRMS</Text>
      </View>

      <View style={styles.card}>
        <Image
          source={{ uri: user?.avatar_url || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{user?.full_name || 'Người dùng'}</Text>
          <Text style={styles.meta}>{user?.phone || ''}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('ReportIncident' as any)}>
        <Text style={styles.primaryButtonText}>Báo cáo sự cố mới</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          const parent = (navigation as any).getParent && (navigation as any).getParent();
          if (parent && typeof parent.navigate === 'function') {
            parent.navigate('MyIncidents');
          } else {
            navigation.navigate('MyIncidents');
          }
        }}
      >
        <Text style={styles.secondaryButtonText}>Xem báo cáo của tôi</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'stretch' },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#666', marginTop: 6 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, marginVertical: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700' },
  meta: { color: '#777', marginTop: 4 },
  primaryButton: { backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#2563eb', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  secondaryButtonText: { color: '#2563eb', fontWeight: '700' },
  logoutButton: { marginTop: 20, alignItems: 'center' },
  logoutButtonText: { color: 'red' },
});