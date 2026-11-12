import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View, ViewStyle, StyleProp, ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

interface SafeMapViewProps extends ViewProps {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  markerTitle?: string;
  draggableMarker?: boolean;
  onCoordinateChange?: (coords: { latitude: number; longitude: number }) => void;
  style?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
}

export default function SafeMapView({
  coordinates,
  markerTitle,
  style,
}: SafeMapViewProps) {
  const { t } = useLanguage();

  const openExternalMap = () => {
    const { latitude, longitude } = coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    void Linking.openURL(url);
  };

  return (
    <View style={[styles.fallbackContainer, style]}>
      <View style={styles.fallbackBadge}>
        <Ionicons name="location" size={22} color="#0A9D96" />
      </View>
      <Text style={styles.fallbackTitle}>
        {markerTitle || t('Đã ghi nhận tọa độ GPS', 'GPS Coordinates Recorded')}
      </Text>
      <Text style={styles.fallbackCoords}>
        {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
      </Text>
      <TouchableOpacity style={styles.openMapBtn} onPress={openExternalMap} activeOpacity={0.8}>
        <Ionicons name="map-outline" size={14} color="#0A9D96" />
        <Text style={styles.openMapBtnText}>
          {t('Xem trên Google Maps', 'Open in Google Maps')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#E8F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#BCE6E1',
  },
  fallbackBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  fallbackTitle: {
    color: '#0F524F',
    fontSize: 13,
    fontWeight: '800',
  },
  fallbackCoords: {
    color: '#087F7A',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A9D96',
  },
  openMapBtnText: {
    color: '#0A9D96',
    fontSize: 11,
    fontWeight: '700',
  },
});
