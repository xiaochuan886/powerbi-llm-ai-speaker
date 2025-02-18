export interface IValidationResult {
    isValid: boolean;
    error?: string;
}

export interface IAPISettings {
    provider: string;
    apiKey: string;
    apiBase: string;
    model: string;
    promptTemplate: string;
}

export class DataValidator {
    private static readonly MAX_ROWS = 1000;
    private static readonly MAX_COLUMNS = 50;
    private static readonly MAX_CELL_LENGTH = 1000;

    public static validateData(data: any[]): IValidationResult {
        // 检查行数限制
        if (data.length > this.MAX_ROWS) {
            return {
                isValid: false,
                error: `数据行数超过限制（${this.MAX_ROWS}行）`
            };
        }

        // 检查列数限制
        if (data.length > 0 && Object.keys(data[0]).length > this.MAX_COLUMNS) {
            return {
                isValid: false,
                error: `数据列数超过限制（${this.MAX_COLUMNS}列）`
            };
        }

        // 检查单元格长度限制
        for (const row of data) {
            for (const value of Object.values(row)) {
                if (String(value).length > this.MAX_CELL_LENGTH) {
                    return {
                        isValid: false,
                        error: `单元格内容超过长度限制（${this.MAX_CELL_LENGTH}字符）`
                    };
                }
            }
        }

        // 所有检查通过
        return {
            isValid: true
        };
    }

    public static validateAPISettings(settings: IAPISettings): IValidationResult {
        if (!settings.apiKey) {
            return {
                isValid: false,
                error: '请提供API密钥'
            };
        }

        if (!settings.apiBase) {
            return {
                isValid: false,
                error: '请提供API地址'
            };
        }

        if (!settings.model) {
            return {
                isValid: false,
                error: '请提供模型名称'
            };
        }

        if (!settings.promptTemplate) {
            return {
                isValid: false,
                error: '请提供分析提示模板'
            };
        }

        return {
            isValid: true
        };
    }
} 