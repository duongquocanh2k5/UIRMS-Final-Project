# UIRMS Mobile App - React Native + Expo

## ✅ MUST-HAVE Features Implemented

### 1️⃣ **Authentication (Xác thực)**
- ✅ Login Screen - Đăng nhập với email & mật khẩu
- ✅ Register Screen - Đăng ký tài khoản mới
- ✅ Auto-restore token - Tự động đăng nhập nếu có token
- ✅ JWT token management

### 2️⃣ **Home Screen (Trang chủ)**
- ✅ Danh sách sự cố gần bạn (5km bán kính)
- ✅ GPS location tracking
- ✅ Status & Priority badges
- ✅ Swipe to refresh
- ✅ Quick report button

### 3️⃣ **Report Incident (Báo cáo sự cố)**
- ✅ Form báo cáo với các trường:
  - Loại sự cố (Categories)
  - Tiêu đề
  - Chi tiết mô tả
  - Địa điểm tự động
  - Vị trí GPS (latitude, longitude)
- ✅ Location picker & auto-reverse geocoding
- ✅ Submit validation

### 4️⃣ **My Incidents (Báo cáo của tôi)**
- ✅ Danh sách incidents của user
- ✅ Status filters (pending, in_progress, completed)
- ✅ Xem chi tiết từng incident
- ✅ Pagination support
- ✅ Refresh functionality

### 5️⃣ **Incident Detail Screen**
- ✅ Xem đầy đủ chi tiết incident
- ✅ Status & Priority display
- ✅ Location information
- ✅ Timestamps (created_at, completed_at)
- ✅ Mark as complete button
- ✅ Soft delete support

### 6️⃣ **Notifications Screen**
- ✅ Danh sách thông báo từ admin
- ✅ Unread count indicator
- ✅ Mark as read functionality
- ✅ Notification types: status_update, new_reply, reminder
- ✅ Pagination & refresh

### 7️⃣ **Profile Screen (Hồ sơ)**
- ✅ Xem thông tin cá nhân
- ✅ User avatar (initial)
- ✅ Settings menu (edit, password, notifications)
- ✅ Logout functionality
- ✅ App version display

### 8️⃣ **Navigation**
- ✅ Tab-based navigation (Home, Reports, Notifications, Profile)
- ✅ Stack navigation for detail screens
- ✅ Auth/App stack switching
- ✅ Back button handling

---

## 📦 Package Dependencies

```json
{
  "dependencies": {
    "react": "19.2.3",
    "react-native": "0.86.3",
    "expo": "~57.0.23",
    "expo-location": "~57.0.18",
    "@react-navigation/native": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "@react-navigation/native-stack": "^6.x",
    "axios": "^1.x",
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-maps": "^1.x",
    "react-native-gesture-handler": "~2.32.0"
  }
}
```

---

## 🗂️ File Structure

```
mobile-app/
├── src/
│   ├── screens/                    # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ReportIncidentScreen.tsx
│   │   ├── MyIncidentsScreen.tsx
│   │   ├── IncidentDetailScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/
│   │   └── api.ts                 # API client
│   ├── context/
│   │   └── AuthContext.tsx        # Auth state management
│   ├── navigation/
│   │   └── RootNavigator.tsx      # Navigation setup
│   ├── constants/
│   │   └── theme.ts               # Theme configuration
│   ├── hooks/                      # Custom hooks
│   └── components/                 # Reusable components
├── App.tsx                         # Main entrypoint
├── app.json                        # Expo configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 16
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
cd mobile-app
npm install
```

### Run the app

```bash
# Start development server
npm start

# Options during start:
# i - Open in iOS Simulator
# a - Open in Android Emulator
# w - Open in web browser
# j - Open debugger
```

### Environment Setup

Create `.env` file in mobile-app directory:
```
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```
For local network switching, use `.env.home` and `.env.school`, then run `npm run env:home` or `npm run env:school`. Restart Expo with `npx expo start -c` after switching.

---

## 🔌 API Integration

All API calls go through `src/services/api.ts`:

```typescript
// Import API client
import { apiClient } from '../services/api';

// Use in components
const response = await apiClient.createIncident({
  category_id: 1,
  title: 'Pothole on Main Street',
  description: 'Large hole in the road',
  latitude: 10.7769,
  longitude: 106.6966,
});
```

**Endpoints used:**
- POST `/auth/register` - Register user
- POST `/auth/login` - Login
- GET `/auth/me` - Get current user
- POST `/incidents` - Create incident
- GET `/incidents` - List incidents
- GET `/incidents/user/:userId` - User's incidents
- GET `/incidents/:id` - Get incident detail
- GET `/incidents/search/nearby` - Nearby incidents
- PATCH `/incidents/:id/complete` - Mark complete
- GET `/notifications` - List notifications
- PATCH `/notifications/:id/read` - Mark as read
- GET `/notifications/unread/count` - Unread count

---

## 🎨 UI/UX Features

- ✅ Clean Material-inspired design
- ✅ Color-coded status & priority badges
- ✅ Smooth animations
- ✅ Loading states & error handling
- ✅ Pull-to-refresh functionality
- ✅ Responsive layout
- ✅ Vietnamese localization
- ✅ Toast notifications for feedback

---

## 🔐 Security

- ✅ JWT token in AsyncStorage
- ✅ Authorization header on all requests
- ✅ Token auto-refresh on 401
- ✅ Secure logout (token removal)
- ✅ Input validation

---

## 📝 TODO - Future Enhancements

- [ ] Map view with incident markers
- [ ] Photo upload for incidents
- [ ] Real-time notifications via WebSocket
- [ ] Offline support with Redux persistence
- [ ] Push notifications
- [ ] Chat with admin/technician
- [ ] Rating & review system
- [ ] Advanced filters & search
- [ ] Dark mode support

---

## 🐛 Troubleshooting

### API Connection Issues
- Ensure backend is running on `http://localhost:5000`
- Check network connectivity
- Verify `EXPO_PUBLIC_API_URL` in `.env`

### Location Permission Denied
- Android: Grant location permission in app settings
- iOS: Enable location in Settings > Privacy

### Build Errors
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 Support

For issues or questions about the mobile app, check:
- Backend API status: `http://localhost:5000/api/health`
- Expo documentation: https://docs.expo.dev
- React Native docs: https://reactnative.dev

---

**Status:** ✅ Ready for Development & Testing  
**Last Updated:** 2026-06-11  
**Version:** 1.0.0
