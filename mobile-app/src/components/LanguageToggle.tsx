import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={language === 'vi' ? 'Switch language to English' : 'Chuyển ngôn ngữ sang tiếng Việt'}
      onPress={() => {
        void toggleLanguage().catch((error) => {
          console.error('Unable to change language:', error);
          Alert.alert(
            language === 'vi' ? 'Lỗi' : 'Error',
            language === 'vi' ? 'Không thể lưu tùy chọn ngôn ngữ.' : 'Unable to save your language preference.'
          );
        });
      }}
      style={styles.button}
    >
      <Text style={styles.label}>{language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BCE6E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: { color: '#087F7A', fontSize: 12, fontWeight: '800' },
});
