import { AppDataSource } from '../config/database.js';
import { DiagnosticEvent } from '../entities/diagnostic-event.entity.js';
import type { DiagnosticLevel, VehicleSummary, VehicleTopCode } from '../types/index.js';

export class VehicleService {
  static async getVehicleSummary(
    vehicleId: string
  ): Promise<VehicleSummary | null> {
    const repo = AppDataSource.getRepository(DiagnosticEvent);

    // Run 4 queries in parallel
    const [severityCounts, timeRange, topCodes, recentEvents] =
      await Promise.all([
        // 1. Severity counts via CASE/SUM
        repo
          .createQueryBuilder('event')
          .select(
            "SUM(CASE WHEN event.level = 'ERROR' THEN 1 ELSE 0 END)",
            'errorCount'
          )
          .addSelect(
            "SUM(CASE WHEN event.level = 'WARN' THEN 1 ELSE 0 END)",
            'warnCount'
          )
          .addSelect(
            "SUM(CASE WHEN event.level = 'INFO' THEN 1 ELSE 0 END)",
            'infoCount'
          )
          .addSelect('COUNT(*)', 'total')
          .where('event.vehicleId = :vehicleId', { vehicleId })
          .getRawOne<Record<string, string>>(),

        // 2. First/last seen via MIN/MAX
        repo
          .createQueryBuilder('event')
          .select('MIN(event.timestamp)', 'firstSeen')
          .addSelect('MAX(event.timestamp)', 'lastSeen')
          .where('event.vehicleId = :vehicleId', { vehicleId })
          .getRawOne<Record<string, string>>(),

        // 3. Top 10 codes via GROUP BY
        repo
          .createQueryBuilder('event')
          .select('event.code', 'code')
          .addSelect('COUNT(*)', 'count')
          .addSelect('event.level', 'level')
          .where('event.vehicleId = :vehicleId', { vehicleId })
          .groupBy('event.code')
          .addGroupBy('event.level')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany<Record<string, string>>(),

        // 4. Recent 10 events
        repo.find({
          where: { vehicleId },
          order: { timestamp: 'DESC' },
          take: 10,
        }),
      ]);

    // If no events found for this vehicle, return null
    if (!severityCounts || Number(severityCounts['total']) === 0) {
      return null;
    }

    const mappedTopCodes: VehicleTopCode[] = topCodes.map((r) => ({
      code: r['code'],
      count: Number(r['count']),
      level: r['level'] as DiagnosticLevel,
    }));

    return {
      vehicleId,
      errorCount: Number(severityCounts['errorCount']),
      warnCount: Number(severityCounts['warnCount']),
      infoCount: Number(severityCounts['infoCount']),
      total: Number(severityCounts['total']),
      firstSeen: timeRange?.['firstSeen'] ?? '',
      lastSeen: timeRange?.['lastSeen'] ?? '',
      topCodes: mappedTopCodes,
      recentEvents: recentEvents,
    };
  }
}
