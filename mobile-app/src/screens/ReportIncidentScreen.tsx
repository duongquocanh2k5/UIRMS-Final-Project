/**
 * Report Incident Screen
 * Create new incident report
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { apiClient } from '../services/api';

const CATEGORIES = [
  { id: 1, name: 'Mất điện' },
  { id: 2, name: 'Nước bị ô nhiễm' },
  { id: 3, name: 'Đường bị hỏng' },
  { id: 4, name: 'Rác thải' },
  { id: 5, name: 'Cây cối đổ' },
  { id: 6, name: 'Khác' },
];

export default function ReportIncidentScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('1');
  const [coordinates, setCoordinates] = useState({ latitude: 0, longitude: 0 });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập vị trí');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setCoordinates({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        if (addresses.length > 0) {
          const addr = addresses[0];
          setLocation(`${addr.name}, ${addr.city}`);
        }
      } catch (e) {
        console.error('Error reverse geocoding:', e);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề sự cố');
      return;
    }

    try {
      setLoading(true);
      await apiClient.createIncident({
        category_id: parseInt(category),
        title,
        description,
        location_name: location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      Alert.alert('Thành công', 'Báo cáo sự cố thành công', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể gửi báo cáo');
    } finally {
      setLoading(false);
    }
  };

  if (gettingLocation) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Đang lấy vị trí...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Loại sự cố *</Text>
        <View style={styles.categoryList}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                category === cat.id.toString() && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(cat.id.toString())}
              disabled={loading}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat.id.toString() && styles.categoryChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tiêu đề *</Text>
        <TextInput
          style={styles.input}
          placeholder="Mô tả ngắn gọn sự cố"
          value={title}
          onChangeText={setTitle}
          editable={!loading}
        />

        <Text style={styles.label}>Chi tiết</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Mô tả chi tiết hơn..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          editable={!loading}
        />

        <Text style={styles.label}>Địa điểm</Text>
        <TextInput
          style={styles.input}
          placeholder="Địa điểm sự cố"
          value={location}
          onChangeText={setLocation}
          editable={!loading}
        />

        <View style={styles.coordinatesContainer}>
          <Text style={styles.coordinatesLabel}>Vị trí: ({coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)})</Text>
          <TouchableOpacity onPress={getLocation} disabled={loading}>
            <Text style={styles.updateLocationButton}>Cập nhật vị trí</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginBottom: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryChipText: {
    color: '#333',
    fontSize: 14,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  coordinatesContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordinatesLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  updateLocationButton: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
