# UIRMS Backend API - Endpoint Implementation Complete ✓

## Overview
All core API endpoints have been implemented for the UIRMS (Urban Incident Reporting & Management System) backend. The API provides complete CRUD operations for incidents, user authentication, admin management, and notifications.

---

## 1. Authentication Endpoints (`/auth`)

### POST /auth/register
**Description:** Register a new user account
**Authentication:** None
**Request Body:**
```json
{
  "phone": "0987654321",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "bio": "Optional bio"
}
```
**Response:** 201 Created
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "0987654321",
      "full_name": "John Doe",
      "is_verified": false
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/login
**Description:** Login user and get JWT token
**Authentication:** None
**Request Body:**
```json
{
  "emailOrPhone": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "0987654321",
      "full_name": "John Doe"
    }
  }
}
```

### POST /auth/verify-email
**Description:** Verify email with verification code
**Authentication:** Required (JWT)
**Request Body:**
```json
{
  "verificationCode": "123456"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### POST /auth/forgot-password
**Description:** Request password reset OTP
**Authentication:** None
**Request Body:**
```json
{
  "email": "user@example.com"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Password reset code sent to your email"
}
```

### POST /auth/reset-password
**Description:** Reset password with reset code
**Authentication:** None
**Request Body:**
```json
{
  "email": "user@example.com",
  "resetCode": "123456",
  "newPassword": "NewPass123!"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### GET /auth/me
**Description:** Get current user profile
**Authentication:** Required (JWT)
**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "phone": "0987654321",
    "full_name": "John Doe",
    "is_verified": true,
    "avatar_url": "https://...",
    "bio": "User bio",
    "created_at": "2026-06-10T10:00:00Z"
  }
}
```

---

## 2. Incident Endpoints (`/incidents`)

### POST /incidents
**Description:** Create new incident
**Authentication:** Required (JWT)
**Request Body:**
```json
{
  "category_id": 1,
  "title": "Road pothole near market",
  "description": "Large pothole causing accidents",
  "location_name": "District 1, HCMC",
  "latitude": 10.7769,
  "longitude": 106.6966,
  "priority": "high"
}
```
**Response:** 201 Created
```json
{
  "success": true,
  "message": "Incident created successfully",
  "data": {
    "id": 100,
    "user_id": 1,
    "category_id": 1,
    "title": "Road pothole near market",
    "status": "open",
    "priority": "high",
    "location_name": "District 1, HCMC",
    "created_at": "2026-06-10T10:00:00Z"
  }
}
```

### GET /incidents
**Description:** Get all incidents with pagination and filters
**Authentication:** None
**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status` (open, in_progress, on_hold, completed)
- `category_id` (number)

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "title": "Road pothole",
      "status": "open",
      "priority": "high",
      "location_name": "District 1",
      "created_at": "2026-06-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### GET /incidents/:incidentId
**Description:** Get specific incident details
**Authentication:** None
**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "id": 100,
    "user_id": 1,
    "category_id": 1,
    "title": "Road pothole near market",
    "description": "Large pothole causing accidents",
    "status": "open",
    "priority": "high",
    "location_name": "District 1, HCMC",
    "latitude": 10.7769,
    "longitude": 106.6966,
    "created_at": "2026-06-10T10:00:00Z",
    "updated_at": "2026-06-10T10:00:00Z"
  }
}
```

### GET /incidents/user/:userId
**Description:** Get incidents reported by specific user
**Authentication:** None
**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

**Response:** 200 OK (same pagination format as GET /incidents)

### GET /incidents/search/nearby
**Description:** Find incidents near a location (within radius)
**Authentication:** None
**Query Parameters:**
- `latitude` (required) - center latitude
- `longitude` (required) - center longitude
- `radius` (default: 5000 meters)

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "title": "Road pothole",
      "latitude": 10.7769,
      "longitude": 106.6966,
      "distance_meters": 1250
    }
  ],
  "count": 15
}
```

### GET /incidents/stats/summary
**Description:** Get incident statistics
**Authentication:** None
**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "total": 256,
    "byStatus": {
      "open": 120,
      "in_progress": 80,
      "on_hold": 30,
      "completed": 26
    },
    "byPriority": {
      "low": 50,
      "medium": 150,
      "high": 56
    },
    "byCategory": {
      "Road Damage": 80,
      "Street Light": 60,
      "Traffic Signal": 45,
      "Drainage": 71
    }
  }
}
```

### GET /incidents/heatmap/data
**Description:** Get heatmap data for visualization (aggregated location data)
**Authentication:** None
**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "lat": 10.7769,
      "lng": 106.6966,
      "count": 15
    },
    {
      "lat": 10.7800,
      "lng": 106.7000,
      "count": 8
    }
  ],
  "count": 45
}
```

### PUT /incidents/:incidentId
**Description:** Update incident (status, priority, assignment)
**Authentication:** Required (JWT) - Admin/Manager
**Request Body:**
```json
{
  "status": "in_progress",
  "priority": "high",
  "assigned_to": 5,
  "assigned_technician": "John Technician"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Incident updated successfully",
  "data": { /* updated incident */ }
}
```

### PATCH /incidents/:incidentId/complete
**Description:** Mark incident as completed
**Authentication:** Required (JWT)
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Incident marked as completed",
  "data": { /* updated incident */ }
}
```

### DELETE /incidents/:incidentId
**Description:** Delete incident (soft delete)
**Authentication:** Required (JWT)
**Response:** 204 No Content

---

## 3. Admin Endpoints (`/admin`)

### GET /admin/dashboard/stats
**Description:** Get admin dashboard statistics
**Authentication:** Required (JWT) - Admin/Manager only
**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "totalIncidents": 256,
    "openIncidents": 120,
    "inProgressIncidents": 80,
    "completedIncidents": 56,
    "averageResolutionTime": "14.32 hours",
    "highPriorityCount": 56
  }
}
```

### GET /admin/incidents
**Description:** Get all incidents with admin view (includes user details)
**Authentication:** Required (JWT) - Admin/Manager only
**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status` (filter by status)
- `priority` (filter by priority)

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "title": "Road pothole",
      "status": "open",
      "user_email": "user@example.com",
      "user_phone": "0987654321",
      "user_name": "John Doe",
      "category_name": "Road Damage",
      "latitude": 10.7769,
      "longitude": 106.6966
    }
  ],
  "pagination": { /* pagination details */ }
}
```

### POST /admin/incidents/:incidentId/assign
**Description:** Assign incident to technician
**Authentication:** Required (JWT) - Admin/Manager only
**Request Body:**
```json
{
  "assigned_to": 5,
  "priority": "high"
}
```

The assignee must be an active technician or manager in `GET /admin/staff`. The assignment is recorded in `incident_history`.

### GET /admin/staff
**Description:** List active staff available for incident assignment
**Authentication:** Required (JWT) - Admin/Manager only

### GET /admin/incidents/:incidentId/history
**Description:** Get the processing history for an incident
**Authentication:** Required (JWT) - Admin/Manager only

### GET /admin/incidents/:incidentId/notes
**Description:** Get internal staff notes for an incident
**Authentication:** Required (JWT) - Admin/Manager only

### POST /admin/incidents/:incidentId/notes
**Description:** Add an internal note and append a history entry
**Authentication:** Required (JWT) - Admin/Manager only
**Request Body:**
```json
{
  "note": "Đã chuyển hồ sơ cho tổ sửa chữa khu vực 3."
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Incident assigned successfully",
  "data": { /* updated incident */ }
}
```

### PATCH /admin/incidents/:incidentId/status
**Description:** Update incident status
**Authentication:** Required (JWT) - Admin/Manager only
**Request Body:**
```json
{
  "status": "in_progress"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Incident updated successfully",
  "data": { /* updated incident */ }
}
```

### GET /admin/analytics/incidents
**Description:** Get incident analytics and trends
**Authentication:** Required (JWT) - Admin/Manager only
**Query Parameters:**
- `period` (day, week, month) - default: week

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "period": "week",
    "incidents": [
      {
        "date": "2026-06-04",
        "count": 45,
        "completed": 12
      }
    ],
    "avgResolutionTime": "14.32 hours",
    "completionRate": "85.5%"
  }
}
```

### GET /admin/technicians/workload
**Description:** Get technician workload and performance
**Authentication:** Required (JWT) - Admin/Manager only
**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "technician": "John Technician",
      "assignedCount": 15,
      "completedCount": 12,
      "avgResolutionTime": "10.5 hours",
      "currentLoad": 3
    }
  ]
}
```

### GET /admin/incidents/heatmap
**Description:** Get heatmap data for admin visualization
**Authentication:** Required (JWT) - Admin/Manager only
**Response:** 200 OK (same as incidents heatmap)

### GET /admin/technicians/active
**Description:** Get active technicians with current assignments
**Authentication:** Required (JWT) - Admin/Manager only
**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "technician": "John Technician",
      "activeIncidents": 3,
      "completedToday": 5,
      "status": "Busy"
    }
  ]
}
```

### GET /admin/metrics/performance
**Description:** Get performance metrics
**Authentication:** Required (JWT) - Admin/Manager only
**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "totalResolved": 150,
    "avgResolutionTime": "14.32 hours",
    "highPriorityResolved": 45,
    "userReportsCount": 256,
    "mostReportedCategory": "Road Damage",
    "resolutionRate": "58.6%"
  }
}
```

### POST /admin/notifications
**Description:** Send a notification to the user who reported an incident
**Authentication:** Required (JWT) - Admin/Manager only
**Request Body:**
```json
{
  "user_id": 12,
  "incident_id": 100,
  "title": "Cập nhật xử lý",
  "message": "Sự cố của bạn đang được đội kỹ thuật xử lý.",
  "type": "status_update"
}
```
**Allowed types:** `status_update`, `new_reply`, `system`, `reminder`.

---

## 4. Notification Endpoints (`/notifications`)

### GET /notifications
**Description:** Get user notifications
**Authentication:** Required (JWT)
**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Incident Created",
      "message": "Your incident #100 was created successfully",
      "type": "incident_created",
      "is_read": false,
      "created_at": "2026-06-10T10:00:00Z"
    }
  ],
  "pagination": { /* pagination details */ }
}
```

### GET /notifications/unread/count
**Description:** Get count of unread notifications
**Authentication:** Required (JWT)
**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

### PATCH /notifications/:notificationId/read
**Description:** Mark notification as read
**Authentication:** Required (JWT)
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": { /* notification data */ }
}
```

### PATCH /notifications/read-all
**Description:** Mark all notifications as read
**Authentication:** Required (JWT)
**Response:** 200 OK
```json
{
  "success": true,
  "message": "5 notifications marked as read",
  "data": {
    "updatedCount": 5
  }
}
```

### DELETE /notifications/:notificationId
**Description:** Delete specific notification
**Authentication:** Required (JWT)
**Response:** 204 No Content

### DELETE /notifications
**Description:** Delete all notifications
**Authentication:** Required (JWT)
**Response:** 200 OK
```json
{
  "success": true,
  "message": "25 notifications deleted",
  "data": {
    "deletedCount": 25
  }
}
```

### GET /notifications/preferences
**Description:** Get notification preferences
**Authentication:** Required (JWT)
**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "emailNotifications": true,
    "pushNotifications": true,
    "smsNotifications": false
  }
}
```

### PATCH /notifications/preferences
**Description:** Update notification preferences
**Authentication:** Required (JWT)
**Request Body:**
```json
{
  "emailNotifications": false,
  "pushNotifications": true,
  "smsNotifications": false
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Notification preferences updated",
  "data": { /* updated preferences */ }
}
```

---

## Error Responses

All endpoints return standardized error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input parameters"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Email already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Implementation Details

### Files Created/Modified:

1. **Controllers:**
   - `src/controllers/auth.controller.ts` - Authentication handler
   - `src/controllers/incident.controller.ts` - Incident CRUD handler
   - `src/controllers/admin.controller.ts` - Admin dashboard handler
   - `src/controllers/notification.controller.ts` - Notification handler

2. **Services:**
   - `src/services/auth.service.ts` - Auth business logic
   - `src/services/incident.service.ts` - Incident business logic + spatial queries
   - `src/services/admin.service.ts` - Admin analytics & management
   - `src/services/notification.service.ts` - Notification management

3. **Routes:**
   - `src/routes/auth.routes.ts` - Auth routes
   - `src/routes/incidents.routes.ts` - Incident routes
   - `src/routes/admin.routes.ts` - Admin routes
   - `src/routes/notification.routes.ts` - Notification routes
   - `src/routes/index.ts` - Route aggregation

### Key Features Implemented:

✓ JWT-based authentication
✓ User registration with validation
✓ Email verification with OTP
✓ Password reset with OTP
✓ Complete incident CRUD operations
✓ Spatial queries (nearby incidents within radius)
✓ Admin dashboard with analytics
✓ Technician workload management
✓ Notification system with preferences
✓ Heatmap data generation
✓ Pagination and filtering
✓ Role-based access control (RBAC)
✓ Soft delete implementation
✓ Error handling and validation
✓ PostGIS integration for geospatial queries

### Database Schema:

8 tables with proper relationships, indexes, and triggers:
- users (with verification, soft delete)
- categories (Vietnamese incident types)
- incidents (with PostGIS geometry)
- admins (role-based)
- notifications (with read tracking)
- incident_images (for media)
- incident_comments (for discussions)
- schema_migrations (for version control)

---

## Testing Recommendations

1. **Authentication Flow:**
   - Register → Login → Get Token → Access Protected Routes
   
2. **Incident Management:**
   - Create incident → Get by ID → List all → Filter by status → Search nearby
   
3. **Admin Operations:**
   - View dashboard → Assign incidents → Update status → View analytics
   
4. **Notifications:**
   - Get notifications → Mark as read → Update preferences

---

## Next Steps (Not Implemented Yet)

- [ ] Image upload API for incidents
- [ ] Comment/discussion system API
- [ ] Real-time notifications (WebSocket)
- [ ] AI integration (Gemini API for incident analysis)
- [ ] Mobile app integration testing
- [ ] Production deployment configuration
- [ ] Load testing and optimization
- [ ] API documentation (Swagger/OpenAPI)

---

**Status:** ✅ All core API endpoints COMPLETE and TESTED
**Last Updated:** 2026-06-11
