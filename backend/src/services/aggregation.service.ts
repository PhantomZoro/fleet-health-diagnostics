import { AppDataSource } from '../config/database.js';
import { DiagnosticEvent } from '../entities/diagnostic-event.entity.js';
import type {
  AggregationTimeRange,
  CriticalVehicle,
  DiagnosticLevel,
  ErrorsPerVehicle,
  TopCode,
} from '../types/index.js';

export class AggregationService {
  static async errorsPerVehicle(
    params: AggregationTimeRange
  ): Promise<ErrorsPerVehicle[]> {
    const repo = AppDataSource.getRepository(DiagnosticEvent);
    const qb = repo
      .createQueryBuilder('event')
      .select('event.vehicleId', 'vehicleId')
      .addSelect(
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
      .groupBy('event.vehicleId')
      .orderBy('total', 'DESC');

    if (params.from !== undefined) {
      qb.andWhere('event.timestamp >= :from', { from: params.from });
    }

    if (params.to !== undefined) {
      qb.andWhere('event.timestamp <= :to', { to: params.to });
    }

    const raw = await qb.getRawMany<Record<string, string>>();

    return raw.map((r) => ({
      vehicleId: r['vehicleId'],
      errorCount: Number(r['errorCount']),
      warnCount: Number(r['warnCount']),
      infoCount: Number(r['infoCount']),
      total: Number(r['total']),
    }));
  }

  static async topCodes(
    params: { level?: DiagnosticLevel; vehicleId?: string; code?: string } & AggregationTimeRange
  ): Promise<TopCode[]> {
    const repo = AppDataSource.getRepository(DiagnosticEvent);
    const qb = repo
      .createQueryBuilder('event')
      .select('event.code', 'code')
      .addSelect('COUNT(*)', 'count')
      .addSelect('event.level', 'level')
      .groupBy('event.code')
      .addGroupBy('event.level')
      .orderBy('count', 'DESC')
      .limit(10);

    if (params.code !== undefined) {
      qb.andWhere('UPPER(event.code) = UPPER(:code)', { code: params.code });
    }

    if (params.vehicleId !== undefined) {
      qb.andWhere('UPPER(event.vehicleId) = UPPER(:vehicleId)', { vehicleId: params.vehicleId });
    }

    if (params.level !== undefined) {
      qb.andWhere('event.level = :level', { level: params.level });
    }

    if (params.from !== undefined) {
      qb.andWhere('event.timestamp >= :from', { from: params.from });
    }

    if (params.to !== undefined) {
      qb.andWhere('event.timestamp <= :to', { to: params.to });
    }

    const raw = await qb.getRawMany<Record<string, string>>();

    return raw.map((r) => ({
      code: r['code'],
      count: Number(r['count']),
      level: r['level'] as DiagnosticLevel,
    }));
  }

  static async criticalVehicles(): Promise<CriticalVehicle[]> {
    const repo = AppDataSource.getRepository(DiagnosticEvent);

    // Get the latest event timestamp from the DB (not system time)
    const latestResult = await repo
      .createQueryBuilder('event')
      .select('MAX(event.timestamp)', 'latest')
      .getRawOne<{ latest: string }>();

    if (!latestResult?.latest) {
      return [];
    }

    // Calculate 24h before the latest event
    const latestDate = new Date(latestResult.latest);
    const twentyFourHoursAgo = new Date(
      latestDate.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();

    const raw = await repo
      .createQueryBuilder('event')
      .select('event.vehicleId', 'vehicleId')
      .addSelect('COUNT(*)', 'errorCount')
      .addSelect('MAX(event.timestamp)', 'latestError')
      .where('event.level = :level', { level: 'ERROR' })
      .andWhere('event.timestamp >= :since', { since: twentyFourHoursAgo })
      .groupBy('event.vehicleId')
      .having('COUNT(*) >= 3')
      .orderBy('errorCount', 'DESC')
      .getRawMany<Record<string, string>>();

    return raw.map((r) => ({
      vehicleId: r['vehicleId'],
      errorCount: Number(r['errorCount']),
      latestError: r['latestError'],
    }));
  }
}
