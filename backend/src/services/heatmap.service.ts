/**
 * Heatmap Service
 * Provides incident data for heatmap visualization
 */

import { query } from '../config/database';

export interface HeatmapData {
  id: number;
  location_point: any;
  priority: string;
  status: string;
  created_at: Date;
}

export class HeatmapService {
  /**
   * Get incidents for heatmap within bounding box
   */
  async getHeatmapData(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number
  ): Promise<HeatmapData[]> {
    return query<HeatmapData>(
      `SELECT id, location_point, priority, status, created_at
       FROM incidents
       WHERE ST_Contains(
         ST_SetSRID(ST_MakeBox2D(ST_Point($1, $2), ST_Point($3, $4)), 4326),
         location_point
       )
       AND deleted_at IS NULL;`,
      [minLon, minLat, maxLon, maxLat]
    );
  }

  /**
   * Get incident density
   */
  async getIncidentDensity(gridSize: number = 0.01): Promise<any[]> {
    return query(
      `SELECT
        FLOOR(ST_Y(location_point) / $1) * $1 as lat_grid,
        FLOOR(ST_X(location_point) / $1) * $1 as lon_grid,
        COUNT(*) as incident_count,
        AVG(CASE WHEN priority = 'critical' THEN 4
                 WHEN priority = 'high' THEN 3
                 WHEN priority = 'medium' THEN 2
                 ELSE 1 END) as avg_priority
       FROM incidents
       WHERE deleted_at IS NULL AND location_point IS NOT NULL
       GROUP BY lat_grid, lon_grid;`,
      [gridSize]
    );
  }

  /**
   * Get incidents by category for heatmap
   */
  async getIncidentsByCategory(categoryId: number): Promise<HeatmapData[]> {
    return query<HeatmapData>(
      `SELECT id, location_point, priority, status, created_at
       FROM incidents
       WHERE category_id = $1 AND deleted_at IS NULL;`,
      [categoryId]
    );
  }
}

export const heatmapService = new HeatmapService();
