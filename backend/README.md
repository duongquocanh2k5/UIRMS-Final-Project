# UIRMS Backend API Documentation

## 📋 Overview

The UIRMS (Urban Incident Reporting & Management System) Backend API is a Node.js + Express + TypeScript REST API that manages urban incident reporting, categorization, assignment, and tracking with spatial analysis using PostgreSQL and PostGIS.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ with PostGIS
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Update .env with your database credentials
# NODE_ENV=development
# DATABASE_URL=postgresql://user:password@localhost:5432/uirms
# JWT_SECRET=your_secret_key

# Run development server
npm run dev
```

### Server starts on:
- **API**: http://localhost:5000/api
- **Health check**: http://localhost:5000/api/health

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts        # PostgreSQL connection pool
│   │   ├── environment.ts     # Env validation
│   │   └── constants.ts       # App constants & enums
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # JWT authentication
│   │   ├── errorHandler.ts         # Global error handler
│   │   ├── validateRequest.ts      # Request validation
│   │   └── corsConfig.ts           # CORS setup
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints
│   │   ├── incidents.routes.ts # Incident endpoints
│   │   ├── admin.routes.ts    # Admin endpoints
│   │   ├── notifications.routes.ts # Notification endpoints
│   │   └── index.ts           # Route aggregator
│   ├── services/
│   │   ├── auth.service.ts        # Auth logic
│   │   ├── incident.service.ts    # Incident CRUD
│   │   ├── ai.service.ts          # Gemini AI integration
│   │   ├── notification.service.ts # Notifications
│   │   └── heatmap.service.ts     # Heatmap data
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── incident.controller.ts
│   │   ├── admin.controller.ts
│   │   └── notification.controller.ts
│   ├── utils/
│   │   ├── jwt.ts           # JWT utilities
│   │   ├── password.ts      # Password hashing
│   │   ├── validators.ts    # Input validators
│   │   ├── logger.ts        # Logging
│   │   └── helpers.ts       # Helper functions
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   ├── server.ts            # Express app setup
│   └── index.ts             # Entry point
├── .env.example
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

## 🔐 API Endpoints

### Authentication

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
POST   /api/auth/verify-email      # Verify email (requires auth)
POST   /api/auth/forgot-password   # Request password reset
```

### Incidents

```
GET    /api/incidents              # Get all incidents (paginated)
GET    /api/incidents/:id          # Get incident by ID
POST   /api/incidents              # Create incident (requires auth)
PUT    /api/incidents/:id          # Update incident (requires auth)
GET    /api/incidents/search/nearby # Get nearby incidents
```

### Admin

```
GET    /api/admin/dashboard/stats      # Dashboard statistics (requires admin)
GET    /api/admin/incidents/heatmap    # Heatmap data (requires admin)
GET    /api/admin/technicians/active   # Active technicians (requires admin)
```

### Notifications

```
GET    /api/notifications              # Get user notifications (requires auth)
PUT    /api/notifications/:id/read     # Mark as read (requires auth)
GET    /api/notifications/unread/count # Get unread count (requires auth)
```

### Health

```
GET    /api/health                # Server health check
```

## 📝 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@host:5432/db

# Authentication
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# AI Services
GEMINI_API_KEY=your_api_key

# Configuration
OTP_EXPIRY_MINUTES=10
MAX_FILE_SIZE_MB=10
```

## 🔑 Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens are obtained from the login endpoint and valid for 7 days (configurable via `JWT_EXPIRY`).

## 📦 Dependencies

### Main
- **express**: Web framework
- **pg**: PostgreSQL client
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variables
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **uuid**: ID generation

### Dev
- **typescript**: Type safety
- **ts-node-dev**: Development server
- **@types/***: Type definitions

## 🛠️ Development

### Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
npm run test     # Run tests (placeholder)
npm run lint     # Run linter (placeholder)
```

### Database Connection

The application uses a PostgreSQL connection pool for efficient resource management:

- **Pool size**: 20 connections
- **Idle timeout**: 30 seconds
- **Connection timeout**: 2 seconds
- **SSL**: Enabled in production

## 🗄️ Database

### Assumptions
- Database schema is pre-created using `database/schema.sql`
- Database name: `uirms`
- User: `uirms_app`
- Port: `5432` (default)

### Initialization

```bash
# Copy database schema from ../database/
psql -U postgres -d uirms -f ../database/schema.sql
```

## 📊 API Response Format

All responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": { /* validation errors */ }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 🔍 Request Validation

Request bodies are validated against defined rules. Example error response:

```json
{
  "error": "Invalid input data",
  "details": {
    "email": "email has invalid format",
    "password": "password must be at least 6 characters"
  }
}
```

## 🚨 Error Codes

| Code | Meaning |
|------|---------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 400  | Bad Request - Invalid input |
| 401  | Unauthorized - Missing/invalid token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Duplicate entry |
| 500  | Internal Server Error |
| 503  | Service Unavailable |

## 🌐 CORS Configuration

CORS is configured to allow specific origins defined in the `CORS_ORIGIN` environment variable:

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

Methods allowed: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`

## 🔑 JWT Token Structure

JWT tokens contain:
```json
{
  "id": 123,
  "email": "user@example.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1241234567
}
```

## 📍 Spatial Features

The API supports PostGIS spatial queries:

- **Location Point**: Store incident locations as WGS84 coordinates
- **Service Area**: Technician service areas as polygons
- **Nearby Search**: Find incidents within a radius (default: 5km)

Example nearby query:
```
GET /api/incidents/search/nearby?latitude=10.7755&longitude=106.6878&radius=5000
```

## 🔄 Database Transactions

The database client supports transactions for multi-step operations:

```typescript
import { transaction } from './config/database';

await transaction(async (client) => {
  // Multiple queries executed atomically
  await client.query('...');
  await client.query('...');
});
```

## 🧪 Testing

Endpoints can be tested using:

- **Postman**: Import the API collection
- **curl**: Command-line HTTP client
- **Thunder Client**: VS Code extension

Example curl request:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0912345678",
    "email": "user@example.com",
    "password": "SecurePass123",
    "full_name": "Nguyễn Văn A"
  }'
```

## 🚀 Deployment

### Docker Support (Future)
A Dockerfile will be provided for containerization.

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET`
- [ ] Enable database SSL
- [ ] Configure CORS origins
- [ ] Set up proper logging
- [ ] Configure backup strategy
- [ ] Enable monitoring
- [ ] Set up CI/CD pipeline

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Ensure PostgreSQL is running and `DATABASE_URL` is correct.

### JWT Token Expired
```
error: "Unauthorized - Invalid or missing token"
```
**Solution**: Obtain a new token by logging in again.

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**: Add your frontend URL to `CORS_ORIGIN` in `.env`.

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/docs/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [REST API Design Guide](https://restfulapi.net/)

## 📄 License

MIT License

## 👥 Contributors

- Development Team

## 📞 Support

For issues or questions, please check:
1. `.env` configuration
2. Database connection
3. Network/firewall settings
4. Error logs in console
