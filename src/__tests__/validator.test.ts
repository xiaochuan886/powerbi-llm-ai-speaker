import { DataValidator } from '../validator';

describe('DataValidator', () => {
    describe('validateData', () => {
        test('should pass for valid data', () => {
            const data = Array(500).fill({}).map((_, i) => ({
                id: i,
                name: 'Test'
            }));
            
            const result = DataValidator.validateData(data);
            expect(result.isValid).toBe(true);
        });

        test('should fail for too many rows', () => {
            const data = Array(1001).fill({}).map((_, i) => ({
                id: i,
                name: 'Test'
            }));
            
            const result = DataValidator.validateData(data);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('数据行数超过限制');
        });

        test('should fail for too many columns', () => {
            const data = [{
                ...Array(51).fill(0).reduce((acc, _, i) => ({
                    ...acc,
                    [`col${i}`]: i
                }), {})
            }];
            
            const result = DataValidator.validateData(data);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('列数超过限制');
        });
    });

    describe('validateAPISettings', () => {
        test('should pass for valid settings', () => {
            const settings = {
                provider: 'openai',
                apiKey: 'test-key',
                apiBase: 'https://api.openai.com/v1',
                model: 'gpt-4',
                promptTemplate: 'Analyze this: {data}'
            };
            
            const result = DataValidator.validateAPISettings(settings);
            expect(result.isValid).toBe(true);
        });

        test('should fail for missing API key', () => {
            const settings = {
                provider: 'openai',
                apiKey: '',
                apiBase: 'https://api.openai.com/v1',
                model: 'gpt-4',
                promptTemplate: 'Analyze this: {data}'
            };
            
            const result = DataValidator.validateAPISettings(settings);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('API密钥');
        });
    });
}); 