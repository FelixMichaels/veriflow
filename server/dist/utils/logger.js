"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logDir = 'logs';
// Create logger configuration
const createLogger = () => {
    const logger = winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        defaultMeta: { service: 'identity-verification-api' },
        transports: [
            // Write all logs with level 'error' and below to error.log
            new winston_1.default.transports.File({
                filename: path_1.default.join(logDir, 'error.log'),
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            // Write all logs to combined.log
            new winston_1.default.transports.File({
                filename: path_1.default.join(logDir, 'combined.log'),
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
        ],
    });
    // If we're not in production, log to the console with colorized simple format
    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }));
    }
    return logger;
};
exports.createLogger = createLogger;
