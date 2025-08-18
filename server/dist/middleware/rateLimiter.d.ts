import { Request, Response, NextFunction } from 'express';
export declare const generalRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export { generalRateLimiter as rateLimiter };
//# sourceMappingURL=rateLimiter.d.ts.map