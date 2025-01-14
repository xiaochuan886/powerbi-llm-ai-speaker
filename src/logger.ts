export interface ILogEntry {
    timestamp: string;
    type: 'info' | 'error' | 'api';
    message: string;
    details?: any;
}

export class Logger {
    private static readonly MAX_LOGS = 1000;
    private static readonly STORAGE_KEY = 'ai-insight-visual-logs';

    public static log(type: ILogEntry['type'], message: string, details?: any) {
        try {
            const entry: ILogEntry = {
                timestamp: new Date().toISOString(),
                type,
                message,
                details
            };

            // 获取现有日志
            const logs = this.getLogs();
            
            // 添加新日志
            logs.unshift(entry);
            
            // 保持日志数量在限制内
            if (logs.length > this.MAX_LOGS) {
                logs.length = this.MAX_LOGS;
            }

            // 保存日志
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));

            // 同时输出到控制台
            console.log(`[${entry.type.toUpperCase()}] ${entry.message}`, details || '');
        } catch (error) {
            console.error('Logging failed:', error);
        }
    }

    public static getLogs(): ILogEntry[] {
        try {
            const logsStr = localStorage.getItem(this.STORAGE_KEY);
            return logsStr ? JSON.parse(logsStr) : [];
        } catch (error) {
            console.error('Failed to get logs:', error);
            return [];
        }
    }

    public static clearLogs() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    public static exportLogs(): string {
        const logs = this.getLogs();
        return JSON.stringify(logs, null, 2);
    }
} 