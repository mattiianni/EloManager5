import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================
// LOGGER CONFIGURATION
// ==============================================

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
};

const LEVEL_COLORS = {
    debug: COLORS.cyan,
    info: COLORS.green,
    warn: COLORS.yellow,
    error: COLORS.red,
};

const LEVEL_EMOJIS = {
    debug: '🔍',
    info: '✅',
    warn: '⚠️',
    error: '❌',
};

// ==============================================
// LOGGER CLASS
// ==============================================

class Logger {
    constructor(options = {}) {
        this.currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase() || 'info'] || LOG_LEVELS.info;
        this.logToFile = process.env.LOG_TO_FILE === 'true' && process.env.VERCEL !== '1';
        this.logDir = process.env.LOG_DIR || 'logs';
        this.maxFileSize = parseInt(process.env.LOG_MAX_SIZE || '10485760'); // 10MB
        this.maxFiles = parseInt(process.env.LOG_MAX_FILES || '7');
        this.environment = process.env.NODE_ENV || 'development';
        
        // Create logs directory if it doesn't exist and file logging is enabled
        if (this.logToFile) {
            this.ensureLogDirectory();
        }
    }

    ensureLogDirectory() {
        const logPath = path.join(process.cwd(), this.logDir);
        if (!fs.existsSync(logPath)) {
            fs.mkdirSync(logPath, { recursive: true });
        }
    }

    getLogFilePath(level) {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(process.cwd(), this.logDir, `${level}-${date}.log`);
    }

    formatTimestamp() {
        const now = new Date();
        return now.toISOString();
    }

    formatMessage(level, message, metadata = {}) {
        const timestamp = this.formatTimestamp();
        const meta = Object.keys(metadata).length > 0 
            ? `\n${COLORS.dim}${JSON.stringify(metadata, null, 2)}${COLORS.reset}`
            : '';
        
        return {
            console: `${LEVEL_COLORS[level]}${LEVEL_EMOJIS[level]} [${timestamp}] [${level.toUpperCase()}]${COLORS.reset} ${message}${meta}`,
            file: `[${timestamp}] [${level.toUpperCase()}] ${message}${meta ? '\n' + JSON.stringify(metadata, null, 2) : ''}`,
        };
    }

    rotateLogFile(filePath) {
        try {
            const stats = fs.statSync(filePath);
            if (stats.size > this.maxFileSize) {
                const timestamp = Date.now();
                const newPath = `${filePath}.${timestamp}`;
                fs.renameSync(filePath, newPath);
                this.cleanOldLogs(path.dirname(filePath), path.basename(filePath));
            }
        } catch (error) {
            // File doesn't exist yet, no need to rotate
        }
    }

    cleanOldLogs(dir, baseFilename) {
        try {
            const files = fs.readdirSync(dir)
                .filter(f => f.startsWith(baseFilename) && f !== baseFilename)
                .map(f => ({
                    name: f,
                    path: path.join(dir, f),
                    time: fs.statSync(path.join(dir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            // Keep only maxFiles - 1 (since current file is not counted)
            files.slice(this.maxFiles - 1).forEach(file => {
                fs.unlinkSync(file.path);
            });
        } catch (error) {
            console.error('Error cleaning old logs:', error);
        }
    }

    writeToFile(level, message) {
        if (!this.logToFile) return;

        try {
            const filePath = this.getLogFilePath(level);
            this.rotateLogFile(filePath);
            fs.appendFileSync(filePath, message + '\n', 'utf8');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    log(level, message, metadata = {}) {
        const levelValue = LOG_LEVELS[level];
        
        // Skip if below current log level
        if (levelValue < this.currentLevel) {
            return;
        }

        const formatted = this.formatMessage(level, message, metadata);
        
        // Console output (only in development or if explicitly enabled, or on Vercel)
        if (this.environment === 'development' || process.env.LOG_CONSOLE === 'true' || process.env.VERCEL === '1') {
            console.log(formatted.console);
        }

        // File output
        this.writeToFile(level, formatted.file);
    }

    // Convenience methods
    debug(message, metadata) {
        this.log('debug', message, metadata);
    }

    info(message, metadata) {
        this.log('info', message, metadata);
    }

    warn(message, metadata) {
        this.log('warn', message, metadata);
    }

    error(message, errorOrMetadata) {
        let metadata = {};
        
        // If errorOrMetadata is an Error object, extract stack trace
        if (errorOrMetadata instanceof Error) {
            metadata = {
                message: errorOrMetadata.message,
                stack: errorOrMetadata.stack,
                name: errorOrMetadata.name,
            };
        } else if (errorOrMetadata) {
            metadata = errorOrMetadata;
        }

        this.log('error', message, metadata);
    }

    // API Request logger
    apiRequest(method, url, metadata = {}) {
        this.info(`${COLORS.blue}${method}${COLORS.reset} ${url}`, metadata);
    }

    // API Response logger
    apiResponse(method, url, statusCode, duration, metadata = {}) {
        const statusColor = statusCode >= 200 && statusCode < 300 ? COLORS.green : 
                           statusCode >= 400 && statusCode < 500 ? COLORS.yellow : COLORS.red;
        
        this.info(
            `${COLORS.blue}${method}${COLORS.reset} ${url} ${statusColor}${statusCode}${COLORS.reset} ${COLORS.dim}(${duration}ms)${COLORS.reset}`,
            metadata
        );
    }

    // Database query logger
    dbQuery(query, duration, metadata = {}) {
        this.debug(`${COLORS.magenta}DB${COLORS.reset} ${query} ${COLORS.dim}(${duration}ms)${COLORS.reset}`, metadata);
    }

    // ELO calculation logger
    eloChange(playerId, oldElo, newElo, delta, reason) {
        const arrow = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';
        const color = delta > 0 ? COLORS.green : delta < 0 ? COLORS.red : COLORS.white;
        
        this.info(
            `${arrow} Player ${playerId.substring(0, 8)}: ${color}${oldElo.toFixed(2)} → ${newElo.toFixed(2)} (${delta > 0 ? '+' : ''}${delta.toFixed(2)})${COLORS.reset}`,
            { playerId, reason }
        );
    }

    // Tournament logger
    tournament(action, tournamentId, metadata = {}) {
        const emoji = action === 'create' ? '🆕' : action === 'complete' ? '🏁' : action === 'delete' ? '🗑️' : '🏆';
        this.info(`${emoji} Tournament ${action}: ${tournamentId.substring(0, 8)}`, metadata);
    }

    // Match logger
    match(action, matchId, metadata = {}) {
        const emoji = action === 'create' ? '⚔️' : action === 'update' ? '🔄' : action === 'delete' ? '🗑️' : '🎾';
        this.info(`${emoji} Match ${action}: ${matchId.substring(0, 8)}`, metadata);
    }

    // Startup banner
    banner() {
        const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ${COLORS.green}${COLORS.bright}🎾 PADEL ELO MANAGER - API SERVER${COLORS.reset}                  ║
║                                                           ║
║   Environment: ${COLORS.cyan}${this.environment.toUpperCase().padEnd(42)}${COLORS.reset}║
║   Log Level:   ${COLORS.yellow}${(process.env.LOG_LEVEL || 'INFO').toUpperCase().padEnd(42)}${COLORS.reset}║
║   Log to File: ${this.logToFile ? COLORS.green + 'ENABLED' : COLORS.red + 'DISABLED'}${' '.repeat(35)}${COLORS.reset}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `;
        console.log(banner);
    }
}

// ==============================================
// EXPORT SINGLETON INSTANCE
// ==============================================

export const logger = new Logger();
export default logger;
