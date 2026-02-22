import { AppDataSource } from '../config/database.js';
import { DiagnosticEvent } from '../entities/diagnostic-event.entity.js';
import type { EventQueryParams, EventSortField, PaginatedResponse } from '../types/index.js';

export class EventService {
  static async queryEvents(
    params: EventQueryParams
  ): Promise<PaginatedResponse<DiagnosticEvent>> {
    const repo = AppDataSource.getRepository(DiagnosticEvent);
    const qb = repo.createQueryBuilder('event');

    if (params.vehicleId !== undefined) {
      qb.andWhere('event.vehicleId = :vehicleId', {
        vehicleId: params.vehicleId,
      });
    }

    if (params.code !== undefined) {
      qb.andWhere('event.code = :code', { code: params.code });
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

    const sortColumnMap: Record<EventSortField, string> = {
      timestamp: 'event.timestamp',
      vehicleId: 'event.vehicleId',
      level: 'event.level',
      code: 'event.code',
    };

    const sortColumn = params.sortBy
      ? sortColumnMap[params.sortBy]
      : 'event.timestamp';
    const sortOrder = params.sortOrder ?? 'DESC';

    qb.orderBy(sortColumn, sortOrder);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }
}
