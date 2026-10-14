import { Request, Response } from 'express';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';
import { StatsDateRange } from '../services/stats.service';
import { statsService } from '../services/stats.service';

function startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

function toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: unknown): Date | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
        throw new Error('Invalid date');
    }

    const parsed = new Date(value);
    const datePart = value.slice(0, 10);
    const calendarDate = new Date(`${datePart}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || calendarDate.toISOString().slice(0, 10) !== datePart) {
        throw new Error('Invalid date');
    }

    return calendarDate;
}

export class StatsController {
    private getDateRange(req: Request, res: Response): StatsDateRange | null {
        try {
            const requestedFrom = parseIsoDate(req.query.from);
            const requestedTo = parseIsoDate(req.query.to);
            const to = requestedTo ?? startOfUtcDay(new Date());
            const from = requestedFrom ?? addDays(to, -29);

            if (from > to) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'from must not be later than to' });
                return null;
            }

            const durationDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
            const previousFrom = addDays(from, -durationDays);

            return {
                from: toDateString(from),
                toExclusive: toDateString(addDays(to, 1)),
                previousFrom: toDateString(previousFrom),
                previousToExclusive: toDateString(from),
            };
        } catch {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'from and to must be valid ISO date strings' });
            return null;
        }
    }

    async getOverview(req: Request, res: Response): Promise<void> {
        const range = this.getDateRange(req, res);
        if (!range) return;

        try {
            res.json(await statsService.getOverview(range));
        } catch (error) {
            console.error('Get stats overview error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async getByDistrict(req: Request, res: Response): Promise<void> {
        const range = this.getDateRange(req, res);
        if (!range) return;

        try {
            res.json(await statsService.getByDistrict(range));
        } catch (error) {
            console.error('Get district stats error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }

    async getByCategoryMonthly(req: Request, res: Response): Promise<void> {
        const range = this.getDateRange(req, res);
        if (!range) return;

        try {
            res.json(await statsService.getByCategoryMonthly(range));
        } catch (error) {
            console.error('Get monthly category stats error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
        }
    }
}

export const statsController = new StatsController();