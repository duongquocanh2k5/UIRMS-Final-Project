# Database Migrations Guide

## Overview
All database migrations are located in `/src/database/migrations/`. They are executed in numerical order when the application starts.

## Migrations

### 001_init_extensions.sql
Enables required PostgreSQL extensions:
- **PostGIS** - For spatial data and geographic queries (GPS coordinates)
- **uuid-ossp** - For UUID generation

### 002_create_users_table.sql
Creates the `users` table for citizen accounts:
- Phone and email authentication
- Verification code for email verification
- Indexes on email, phone, and verification status
- Automatic timestamp updates

### 003_create_categories_table.sql
Creates the `categories` table for incident types:
- Pre-populated with 8 common Vietnamese incident categories
- Severity weight for priority calculation
- Color coding for UI representation
- Includes emoji icons

### 004_create_incidents_table.sql
Creates the `incidents` table with PostGIS support:
- User reports incidents with GPS coordinates
- Spatial index for efficient location-based queries
- Priority levels: low, medium, high, critical
- Status tracking: pending, assigned, in_progress, completed, rejected
- Assignment tracking for admin technicians
- AI confidence score and suggested category
- Duplicate detection capability

### 005_create_admins_table.sql
Creates the `admins` table for administrator accounts:
- Role-based access: super_admin, manager, technician
- Login tracking (last_login)
- Soft delete support

### 006_create_notifications_table.sql
Creates the `notifications` table for user notifications:
- Linked to incidents for context
- Types: status_update, new_reply, system, reminder
- Read/unread status tracking
- Timestamp for read events

### 007_create_incident_images_table.sql
Creates the `incident_images` table for photo uploads:
- Multiple images per incident
- Thumbnail storage
- File metadata (size, mime type)
- Upload tracking

### 008_create_incident_comments_table.sql
Creates the `incident_comments` table for discussions:
- Comments from users and admins on incidents
- Soft delete support
- Edit history via updated_at timestamp

## Spatial Queries (PostGIS)

The `incidents` table uses PostGIS geometry for location-based queries:

```sql
-- Find incidents within 5km radius
SELECT * FROM incidents
WHERE ST_DistanceSphere(location_point, ST_Point(longitude, latitude)) <= 5000;

-- Order incidents by distance
SELECT *, 
  ST_DistanceSphere(location_point, ST_Point(lng, lat)) as distance_meters
FROM incidents
ORDER BY distance_meters ASC;

-- Heatmap data (grid aggregation)
SELECT 
  ST_X(location_point) as lon,
  ST_Y(location_point) as lat,
  COUNT(*) as incident_count
FROM incidents
GROUP BY ST_X(location_point), ST_Y(location_point);
```

## Running Migrations

Migrations are executed automatically on application startup:

```bash
# Start development server (runs migrations)
npm run dev

# Check migration status (see schema_migrations table)
```

## Manual Migration

To execute migrations programmatically:

```typescript
import { runMigrations } from './database/migrator';

await runMigrations();
```

## Constraints & Indexes

All tables include:
- **Primary keys** for unique identification
- **Foreign keys** with cascade/restrict rules
- **Indexes** on frequently queried columns
- **Spatial indexes** (GIST) for PostGIS queries
- **Soft deletes** with `deleted_at` timestamp
- **Automatic timestamp updates** via triggers

## Default Data

The `categories` table is pre-populated with 8 common incident types relevant to Vietnamese urban environments.

## Schema Diagram

```
users (1) ─────→ (N) incidents
               ↓
         incident_images
         incident_comments
         notifications
         
users (1) ─────→ (N) admins
categories (1) ─────→ (N) incidents
incidents (1) ─────→ (N) incidents (for duplicates)
```
