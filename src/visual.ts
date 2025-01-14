"use strict";  

import powerbi from "powerbi-visuals-api";  
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";  
import { VisualFormattingSettingsModel } from "./settings";  

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;  
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;  
import IVisual = powerbi.extensibility.visual.IVisual;  
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;

export class Visual implements IVisual {  
    private target: HTMLElement;  
    private formattingSettings: VisualFormattingSettingsModel;  
    private formattingSettingsService: FormattingSettingsService;
    private currentData: any[] = [];  
    private host: powerbi.extensibility.visual.IVisualHost;
    private settings = {
        provider: 'moonshot',
        apiKey: '',
        apiBase: '',
        model: '',
        promptTemplate: ''
    };
    private mainContainer: HTMLDivElement;
    private resultDiv: HTMLDivElement;
    private converter: any;

    constructor(options: VisualConstructorOptions) {  
        console.log('Visual constructor called');
        try {
            this.target = options.element;  
            this.host = options.host;
            this.formattingSettingsService = new FormattingSettingsService();
            this.formattingSettings = new VisualFormattingSettingsModel();  
            
            // 初始化界面
            this.initializeUI();
            
            // 立即加载 showdown
            this.loadShowdown().catch(error => {
                console.error('Failed to load Showdown:', error);
            });
        } catch (error) {
            console.error('Error in constructor:', error);
            this.showError(error);
        }
    }  

    private loadShowdown() {
        return new Promise<void>((resolve, reject) => {
            try {
                // 检查是否已经加载
                if ((window as any).showdown) {
                    this.initializeConverter();
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js";
                script.onload = () => {
                    this.initializeConverter();
                    resolve();
                };
                script.onerror = (error) => {
                    reject(new Error('Failed to load Showdown library'));
                };
                document.head.appendChild(script);
            } catch (error) {
                reject(error);
            }
        });
    }

    private initializeConverter() {
        if ((window as any).showdown) {
            this.converter = new (window as any).showdown.Converter({
                tables: true,
                tasklists: true,
                strikethrough: true,
                ghCodeBlocks: true,
                emoji: true,
                parseImgDimensions: true,
                simplifiedAutoLink: true,
                excludeTrailingPunctuationFromURLs: true,
                literalMidWordUnderscores: true,
                simpleLineBreaks: true
            });
        }
    }

    private initializeUI() {
        // 清空目标元素
        this.target.innerHTML = '';
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .container {
                position: relative;
                display: flex;
                flex-direction: column;
                height: 100%;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                overflow: hidden;
                min-width: 200px;
                align-items: center;
            }
            .content {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                padding-right: 24px;
                margin-bottom: 70px;
                width: calc(100% - 24px);
                max-width: 800px;
                box-sizing: border-box;
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
            }
            .content::-webkit-scrollbar {
                width: 8px;
            }
            .content::-webkit-scrollbar-track {
                background: transparent;
            }
            .content::-webkit-scrollbar-thumb {
                background-color: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                border: 2px solid transparent;
            }
            .content::-webkit-scrollbar-thumb:hover {
                background-color: rgba(0, 0, 0, 0.5);
            }
            .button-container {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 16px;
                border-top: 1px solid rgba(0,0,0,0.1);
                z-index: 1000;
            }
            .analyze-btn {
                padding: 8px 24px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease-in-out;
                min-width: 120px;
                background-color: #0078d4 !important;
                color: #ffffff !important;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .analyze-btn:hover {
                background-color: #106ebe !important;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                transform: translateY(-1px);
            }
            .analyze-btn:active {
                background-color: #005a9e !important;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                transform: translateY(1px);
            }
            .analyze-btn:disabled {
                background-color: #ccc !important;
                color: #666 !important;
                cursor: not-allowed;
                box-shadow: none;
                transform: none;
            }
            .markdown-body {
                line-height: 1.6;
                width: 100%;
                max-width: 100%;
                word-wrap: break-word;
                overflow-wrap: break-word;
                padding: 0;
                margin: 0;
            }
            .markdown-body p,
            .markdown-body span,
            .markdown-body div,
            .markdown-body li,
            .markdown-body ul,
            .markdown-body ol {
                color: inherit;
                font-family: inherit;
                font-size: inherit;
            }
            #debug {
                display: none !important;
                position: fixed;
                bottom: 40px;
                right: 8px;
                width: 400px;
                max-height: 600px;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.9) !important;
                color: #ffffff;
                font-size: 12px;
                padding: 16px;
                border-radius: 6px;
                z-index: 1000;
                font-family: Consolas, Monaco, 'Courier New', monospace;
                white-space: pre-wrap;
                word-wrap: break-word;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: 1px solid rgba(255,255,255,0.1);
                resize: both;
            }
            #debug.show {
                display: block !important;
            }
            #debug .debug-entry {
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            #debug .debug-time {
                color: #888;
                font-size: 11px;
                margin-bottom: 4px;
            }
            #debug .debug-label {
                color: #4CAF50;
                margin-bottom: 4px;
                font-weight: bold;
            }
            #debug .debug-content {
                color: #fff;
                margin-left: 8px;
                font-family: Consolas, Monaco, 'Courier New', monospace;
            }
            #debug .debug-content pre {
                margin: 4px 0;
                padding: 8px;
                background-color: rgba(255,255,255,0.1);
                border-radius: 4px;
            }
            #debug .error {
                color: #ff4444;
            }
        `;
        document.head.appendChild(style);
        
        // 创建主容器
        this.mainContainer = document.createElement('div');
        this.mainContainer.className = 'container';
        
        // 创建内容区域
        const content = document.createElement('div');
        content.className = 'content';
        
        // 创建结果区域
        this.resultDiv = document.createElement('div');
        this.resultDiv.className = 'markdown-body';
        this.resultDiv.textContent = '等待分析...';
        content.appendChild(this.resultDiv);
        
        this.mainContainer.appendChild(content);
        
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        buttonContainer.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 16px;
            background: transparent;
            border-top: 1px solid rgba(0,0,0,0.1);
            z-index: 1000;
            pointer-events: auto;
        `;
        
        // 创建分析按钮
        const analyzeBtn = document.createElement('button');
        analyzeBtn.id = 'analyze-btn';
        analyzeBtn.className = 'analyze-btn';
        analyzeBtn.textContent = '获取AI见解';
        
        analyzeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.logDebug('按钮点击', '按钮被点击了，准备调用 analyze 方法');
            try {
                await this.analyze();
            } catch (error) {
                this.logDebug('分析错误', String(error));
            }
        });
        
        buttonContainer.appendChild(analyzeBtn);
        this.mainContainer.appendChild(buttonContainer);

        this.logDebug('按钮初始化', '按钮已创建并添加到容器中');
        
        // 修改调试区域相关代码
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug';
        debugDiv.style.display = 'none'; // 确保调试区域默认隐藏
        debugDiv.innerHTML = '<div class="debug-entry"><div class="debug-label">调试信息</div><div class="debug-content">调试信息将显示在这里...</div></div>';
        document.body.appendChild(debugDiv);
        
        // 添加到目标元素
        this.target.appendChild(this.mainContainer);
        
        // 初始化时添加一条调试信息
        this.logDebug('初始化', '界面已加载完成');
    }

    private showError(error: Error | unknown) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = error instanceof Error ? error.message : String(error);
        this.resultDiv.innerHTML = '';
        this.resultDiv.appendChild(errorDiv);
        
        // 添加到调试日志
        const debugDiv = document.getElementById('debug');
        if (debugDiv) {
            const time = new Date().toLocaleTimeString();
            const message = error instanceof Error ? error.message : String(error);
            debugDiv.innerHTML = `${time}: ${message}<br>` + debugDiv.innerHTML;
        }
    }

    private hexToRgb(hex: string | undefined): string {
        if (!hex) {
            return '255, 255, 255'; // 默认白色
        }
        try {
            // 移除可能的 # 前缀
            hex = hex.replace(/^#/, '');
            
            // 解析 RGB 值
            const bigint = parseInt(hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            
            return `${r}, ${g}, ${b}`;
        } catch (error) {
            console.error('Error parsing color:', error);
            return '255, 255, 255'; // 出错时返回白色
        }
    }

    private getColorValue(colorObj: any): string {
        try {
            if (!colorObj) return '#000000';
            
            // 处理直接的字符串值
            if (typeof colorObj === 'string') return colorObj;
            
            // 处理 PowerBI 的颜色对象格式
            if (colorObj.solid && colorObj.solid.color) {
                return colorObj.solid.color;
            }
            
            // 处理格式化设置中的颜色值
            if (colorObj.value && colorObj.value.solid && colorObj.value.solid.color) {
                return colorObj.value.solid.color;
            }

            // 处理直接的颜色对象
            if (typeof colorObj === 'object' && colorObj.color) {
                return colorObj.color;
            }

            // 处理 value 属性
            if (typeof colorObj === 'object' && colorObj.value) {
                if (typeof colorObj.value === 'string') {
                    return colorObj.value;
                }
                return this.getColorValue(colorObj.value);
            }

            this.logDebug('无法解析的颜色对象', JSON.stringify(colorObj));
            return '#000000';
        } catch (error) {
            console.error('Error getting color value:', error);
            this.logDebug('颜色解析错误', String(error));
            return '#000000';
        }
    }

    private updateStyles() {
        try {
            // 移除旧的样式表
            const oldStyle = document.getElementById('visual-style');
            if (oldStyle) {
                oldStyle.remove();
            }

            // 创建新的样式表
            const style = document.createElement('style');
            style.id = 'visual-style';
            
            // 获取当前的样式设置
            const styleSettings = this.formattingSettings.styleSettings;
            
            // 获取颜色值
            const textColor = this.getColorValue(styleSettings.textColor);
            const backgroundColor = this.getColorValue(styleSettings.backgroundColor);
            
            // 获取字体和字号
            const fontFamily = styleSettings.fontFamily?.value || "'Arial Unicode MS'";
            const fontSize = Number(styleSettings.fontSize?.value) || 14;
            
            // 记录处理后的值
            this.logDebug('处理后的样式值', JSON.stringify({
                textColor,
                backgroundColor,
                fontFamily,
                fontSize
            }));

            // 创建样式规则
            const styleRules = `
                #${this.target.id} .container {
                    background-color: ${backgroundColor} !important;
                }

                #${this.target.id} .container .content .markdown-body,
                #${this.target.id} .container .content .markdown-body p,
                #${this.target.id} .container .content .markdown-body div,
                #${this.target.id} .container .content .markdown-body span,
                #${this.target.id} .container .content .markdown-body li,
                #${this.target.id} .container .content .markdown-body h1,
                #${this.target.id} .container .content .markdown-body h2,
                #${this.target.id} .container .content .markdown-body h3,
                #${this.target.id} .container .content .markdown-body h4,
                #${this.target.id} .container .content .markdown-body h5,
                #${this.target.id} .container .content .markdown-body h6,
                #${this.target.id} .container .content .markdown-body ul,
                #${this.target.id} .container .content .markdown-body ol {
                    color: ${textColor} !important;
                    font-family: ${fontFamily} !important;
                    font-size: ${fontSize}px !important;
                }

                #${this.target.id} .container .content .markdown-body h1 { 
                    font-size: ${fontSize * 1.5}px !important;
                    margin: 1em 0 0.5em !important;
                    font-weight: 600 !important;
                }

                #${this.target.id} .container .content .markdown-body h2 { 
                    font-size: ${fontSize * 1.3}px !important;
                    margin: 1em 0 0.5em !important;
                    font-weight: 600 !important;
                }

                #${this.target.id} .container .content .markdown-body h3 { 
                    font-size: ${fontSize * 1.1}px !important;
                    margin: 1em 0 0.5em !important;
                    font-weight: 600 !important;
                }

                #${this.target.id} .container .content .markdown-body code { 
                    font-family: Consolas, Monaco, 'Courier New', monospace !important;
                    padding: 0.2em 0.4em !important;
                    background-color: rgba(0, 0, 0, 0.05) !important;
                    border-radius: 3px !important;
                    color: ${textColor} !important;
                    font-size: ${fontSize * 0.9}px !important;
                }

                #${this.target.id} .container .content .markdown-body pre code {
                    display: block !important;
                    padding: 1em !important;
                    overflow-x: auto !important;
                }

                #${this.target.id} .container .content .markdown-body ul,
                #${this.target.id} .container .content .markdown-body ol {
                    padding-left: 2em !important;
                    margin: 0.5em 0 !important;
                }
            `;
            
            // 应用样式
            style.textContent = styleRules;
            document.head.appendChild(style);

            // 强制重新渲染
            if (this.resultDiv) {
                const content = this.resultDiv.innerHTML;
                requestAnimationFrame(() => {
                    this.resultDiv.innerHTML = content;
                });
            }
        } catch (err) {
            console.error('Error in updateStyles:', err);
            this.logDebug('样式更新错误', String(err));
        }
    }

    private async analyze() {
        this.logDebug('开始分析', '进入 analyze 方法');
        const button = this.mainContainer.querySelector('#analyze-btn') as HTMLButtonElement;
        
        // 获取 API 设置
        const apiSettings = this.formattingSettings.apiSettings;
        
        // 检查 API 设置
        const missingSettings = [];
        if (!apiSettings.apiKey?.value) missingSettings.push('API密钥');
        if (!apiSettings.model?.value) missingSettings.push('模型名称');
        if (!apiSettings.apiBase?.value) missingSettings.push('API地址');
        if (!apiSettings.promptTemplate?.value) missingSettings.push('分析提示模板');

        if (missingSettings.length > 0) {
            this.showError(new Error(`请在设置面板中完善以下API设置：${missingSettings.join('、')}`));
            return;
        }

        // 更新本地设置
        this.settings = {
            provider: apiSettings.provider?.value || 'moonshot',
            apiKey: apiSettings.apiKey.value,
            apiBase: apiSettings.apiBase.value,
            model: apiSettings.model.value,
            promptTemplate: apiSettings.promptTemplate.value
        };

        if (!this.currentData || this.currentData.length === 0) {
            this.showError(new Error('暂无数据可供分析'));
            return;
        }

        try {
            button.disabled = true;
            button.textContent = '分析中...';
            this.resultDiv.innerHTML = '<div>正在处理...</div>';

            // 确保 Showdown 已加载
            if (!this.converter) {
                await this.loadShowdown();
            }

            const dataStr = '```json\n' + JSON.stringify(this.currentData, null, 2) + '\n```';
            const content = this.settings.promptTemplate.replace('{data}', dataStr);

            const baseUrl = this.settings.apiBase.endsWith('/') ? 
                this.settings.apiBase.slice(0, -1) : this.settings.apiBase;
            const endpoint = '/chat/completions';
            const url = baseUrl + endpoint;

            this.logDebug('API请求', JSON.stringify({
                url,
                model: this.settings.model,
                content: content.substring(0, 100) + '...'
            }));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify({
                    model: this.settings.model,
                    messages: [{
                        role: 'user',
                        content: content
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            this.logDebug('API响应', JSON.stringify(data));

            const messageContent = data.choices?.[0]?.message?.content;

            if (messageContent && this.converter) {
                const markdownContent = String(messageContent)
                    .trim()
                    .replace(/^```markdown\s*/i, '')
                    .replace(/```\s*$/, '');
                
                const htmlContent = this.converter.makeHtml(markdownContent);
                this.resultDiv.innerHTML = htmlContent;

                // 确保在设置 innerHTML 后立即更新样式
                requestAnimationFrame(() => {
                    this.updateStyles();
                });
            } else {
                throw new Error(messageContent ? 'Markdown 转换器未准备就绪' : '响应格式不正确');
            }
        } catch (err) {
            this.showError(err);
        } finally {
            button.disabled = false;
            button.textContent = '获取AI见解';
        }
    }

    private logDebug(label: string, content: string) {
        const debugDiv = document.getElementById('debug');
        if (debugDiv) {
            const time = new Date().toLocaleTimeString();
            const entryDiv = document.createElement('div');
            entryDiv.className = 'debug-entry';
            
            const timeDiv = document.createElement('div');
            timeDiv.className = 'debug-time';
            timeDiv.textContent = time;
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'debug-label';
            labelDiv.textContent = label;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'debug-content';
            
            try {
                // 尝试格式化 JSON 字符串
                const parsedContent = JSON.parse(content);
                const formattedContent = JSON.stringify(parsedContent, null, 2);
                const pre = document.createElement('pre');
                pre.textContent = formattedContent;
                contentDiv.appendChild(pre);
            } catch {
                // 如果不是 JSON，直接显示原始内容
                contentDiv.textContent = content;
            }
            
            entryDiv.appendChild(timeDiv);
            entryDiv.appendChild(labelDiv);
            entryDiv.appendChild(contentDiv);
            
            debugDiv.insertBefore(entryDiv, debugDiv.firstChild);
            
            // 限制调试条目数量
            const maxEntries = 100;
            const entries = debugDiv.getElementsByClassName('debug-entry');
            while (entries.length > maxEntries) {
                debugDiv.removeChild(entries[entries.length - 1]);
            }
        }
    }

    public update(options: VisualUpdateOptions) {
        try {
            if (!options.dataViews || !options.dataViews[0]) {
                return;
            }

            // 解析设置
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);
            
            // 更新样式设置
            if ((options.type & powerbi.VisualUpdateType.Style) === powerbi.VisualUpdateType.Style) {
                this.updateStyles();
            }

            // 获取数据视图
            const dataView = options.dataViews[0];
            
            // 更新视觉对象
            this.updateInternal(dataView);
        } catch (err) {
            console.error('Error in update:', err);
        }
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
        return this.formattingSettings.enumerateObjectInstances(options);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        // 在获取格式化模型时也确保更新样式
        requestAnimationFrame(() => {
            this.updateStyles();
        });
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private updateInternal(dataView: DataView) {
        try {
            // 解析数据  
            if (dataView.table) {  
                const columns = dataView.table.columns;  
                const rows = dataView.table.rows;  
                
                this.currentData = rows.map(row => {  
                    const obj = {};  
                    columns.forEach((col, index) => {  
                        obj[col.displayName] = row[index];  
                    });  
                    return obj;  
                });  
            }

            // 确保在数据更新后应用样式
            requestAnimationFrame(() => {
                this.updateStyles();
            });
        } catch (error) {
            console.error('Error in updateInternal:', error);
            this.showError(error as Error);
        }
    }
}