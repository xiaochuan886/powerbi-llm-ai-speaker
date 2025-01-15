"use strict";  

import powerbi from "powerbi-visuals-api";  
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";  
import { VisualFormattingSettingsModel } from "./settings";  
import './../style/visual.less';

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;  
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;  
import IVisual = powerbi.extensibility.visual.IVisual;  
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;

const DefaultSettings = {
    provider: 'moonshot',
    apiKey: '',
    apiBase: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    promptTemplate: '请分析以下数据并给出见解：\n\n{data}\n\n请用中文回答，并使用 Markdown 格式。',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    fontSize: 14,
    textColor: '#000000',
    backgroundColor: '#ffffff',
    buttonBackgroundColor: '#0078d4',
    buttonTextColor: '#ffffff',
    buttonBorderRadius: 4,
    initialText: '等待分析...'
};

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
    private loadingElement: HTMLElement;

    constructor(options: VisualConstructorOptions) {  
        console.log('Visual constructor called');
        try {
            this.target = options.element;  
            this.host = options.host;
            this.formattingSettingsService = new FormattingSettingsService();
            this.formattingSettings = new VisualFormattingSettingsModel();  
            
            // 创建 loading 元素（移到最前面）
            this.loadingElement = document.createElement('div');
            this.loadingElement.className = 'loading-spinner';
            
            // 初始化界面
            this.initializeUI();
            
            // 将 loading 元素添加到 mainContainer 而不是 target
            this.mainContainer.appendChild(this.loadingElement);
            
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
        
        // 创建主容器
        this.mainContainer = document.createElement('div');
        this.mainContainer.className = 'container';
        
        // 创建内容区域
        const content = document.createElement('div');
        content.className = 'content';
        
        // 创建结果区域
        this.resultDiv = document.createElement('div');
        this.resultDiv.className = 'markdown-body';
        
        // 获取初始文字设置
        const initialText = this.formattingSettings?.styleSettings?.initialText?.value || DefaultSettings.initialText;
        this.resultDiv.innerHTML = `<div style="color: #666; text-align: center; padding: 20px;">${initialText}</div>`;
        
        // 正确的嵌套顺序
        content.appendChild(this.resultDiv);
        this.mainContainer.appendChild(content);
        this.target.appendChild(this.mainContainer);
        
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
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            .markdown-body:hover {
                background-color: rgba(0, 0, 0, 0.02);
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
            .copy-toast {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .copy-toast.show {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
        
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
        
        // 确保初始样式设置生效
        requestAnimationFrame(() => {
            this.updateStyles();
        });

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
        
        // 初始化时添加一条调试信息
        this.logDebug('初始化', '界面已加载完成');

        // 为 markdown-body 添加点击事件
        this.resultDiv.addEventListener('click', async (e) => {
            try {
                const text = this.resultDiv.innerText;
                const success = await this.copyToClipboard(text);
                
                // 创建或获取 toast 元素
                let toast = document.querySelector('.copy-toast') as HTMLDivElement;
                if (!toast) {
                    toast = document.createElement('div');
                    toast.className = 'copy-toast';
                    document.body.appendChild(toast);
                }
                
                if (success) {
                    // 显示成功提示
                    toast.textContent = '复制成功！';
                    this.logDebug('复制', '内容已复制到剪贴板');
                } else {
                    // 显示失败提示
                    toast.textContent = '复制失败，请重试';
                    this.logDebug('复制错误', '复制命令执行失败');
                }
                
                toast.classList.add('show');
                
                // 3秒后隐藏
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
            } catch (error) {
                this.logDebug('复制错误', String(error));
                
                // 显示错误提示
                let toast = document.querySelector('.copy-toast') as HTMLDivElement;
                if (!toast) {
                    toast = document.createElement('div');
                    toast.className = 'copy-toast';
                    document.body.appendChild(toast);
                }
                
                toast.textContent = '复制失败，请重试';
                toast.classList.add('show');
                
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
            }
        });
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
            this.logDebug('Updating Styles', 'Start');
            // 获取当前的样式设置
            const styleSettings = this.formattingSettings.styleSettings;
            this.logDebug('Style Settings', JSON.stringify({
                initialText: styleSettings?.initialText?.value
            }));
            
            // 移除旧的样式表
            const oldStyle = document.getElementById('visual-style');
            if (oldStyle) {
                oldStyle.remove();
            }

            // 创建新的样式表
            const style = document.createElement('style');
            style.id = 'visual-style';
            
            // 获取颜色值
            const textColor = this.getColorValue(styleSettings.textColor);
            const backgroundColor = this.getColorValue(styleSettings.backgroundColor);
            const buttonBackgroundColor = this.getColorValue(styleSettings.buttonBackgroundColor);
            const buttonTextColor = this.getColorValue(styleSettings.buttonTextColor);
            
            // 获取字体和字号
            const fontFamily = styleSettings.fontFamily?.value || "'Arial Unicode MS'";
            const fontSize = Number(styleSettings.fontSize?.value) || 14;
            const buttonBorderRadius = Number(styleSettings.buttonBorderRadius?.value) || 4;
            
            // 记录处理后的值
            this.logDebug('处理后的样式值', JSON.stringify({
                textColor,
                backgroundColor,
                fontFamily,
                fontSize,
                buttonBackgroundColor,
                buttonTextColor,
                buttonBorderRadius
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

                #${this.target.id} .analyze-btn {
                    padding: 8px 24px !important;
                    border: none !important;
                    border-radius: ${buttonBorderRadius}px !important;
                    cursor: pointer !important;
                    font-weight: 500 !important;
                    transition: all 0.2s ease-in-out !important;
                    min-width: 120px !important;
                    background-color: ${buttonBackgroundColor} !important;
                    color: ${buttonTextColor} !important;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
                }

                #${this.target.id} .analyze-btn:hover {
                    background-color: ${this.adjustColor(buttonBackgroundColor, -20)} !important;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
                    transform: translateY(-1px) !important;
                }

                #${this.target.id} .analyze-btn:active {
                    background-color: ${this.adjustColor(buttonBackgroundColor, -40)} !important;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
                    transform: translateY(1px) !important;
                }

                #${this.target.id} .analyze-btn:disabled {
                    background-color: #ccc !important;
                    color: #666 !important;
                    cursor: not-allowed !important;
                    box-shadow: none !important;
                    transform: none !important;
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
            this.logDebug('Style Update Error', String(err));
        }
    }

    // 辅助方法：调整颜色亮度
    private adjustColor(color: string, amount: number): string {
        try {
            // 移除可能的空格和#号
            color = color.replace(/\s/g, '').replace('#', '');
            
            // 如果是3位颜色值，转换为6位
            if (color.length === 3) {
                color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
            }
            
            // 解析RGB值
            const r = parseInt(color.substr(0, 2), 16);
            const g = parseInt(color.substr(2, 2), 16);
            const b = parseInt(color.substr(4, 2), 16);
            
            // 调整亮度
            const adjustValue = (value: number) => {
                value = Math.max(0, Math.min(255, value + amount));
                const hex = value.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            
            // 返回新的颜色值
            return '#' + adjustValue(r) + adjustValue(g) + adjustValue(b);
        } catch (error) {
            console.error('Error adjusting color:', error);
            return color; // 如果出错，返回原始颜色
        }
    }

    private async analyze() {
        this.logDebug('开始分析', '进入 analyze 方法');
        const button = this.mainContainer.querySelector('#analyze-btn') as HTMLButtonElement;
        
        try {
            // 添加数据检查的调试信息
            this.logDebug('Current Data', JSON.stringify({
                hasData: Boolean(this.currentData && this.currentData.length > 0),
                dataLength: this.currentData?.length || 0,
                firstItem: this.currentData && this.currentData.length > 0 ? JSON.stringify(this.currentData[0]) : 'none'
            }));

            // 显示加载动画
            this.showLoading(true);
            
            button.disabled = true;
            button.textContent = '分析中...';
            
            // 清空结果区域
            this.resultDiv.innerHTML = '';

            // 获取 API 设置
            const apiSettings = this.formattingSettings.apiSettings;
            
            // 记录 API 设置
            this.logDebug('API Settings Check', JSON.stringify({
                hasProvider: Boolean(apiSettings?.provider?.value),
                hasApiKey: Boolean(apiSettings?.apiKey?.value),
                hasApiBase: Boolean(apiSettings?.apiBase?.value),
                hasModel: Boolean(apiSettings?.model?.value),
                hasTemplate: Boolean(apiSettings?.promptTemplate?.value)
            }));

            // 更新本地设置
            this.settings = {
                provider: apiSettings?.provider?.value || DefaultSettings.provider,
                apiKey: apiSettings?.apiKey?.value || '',
                apiBase: apiSettings?.apiBase?.value || DefaultSettings.apiBase,
                model: apiSettings?.model?.value || DefaultSettings.model,
                promptTemplate: apiSettings?.promptTemplate?.value || DefaultSettings.promptTemplate
            };

            // 检查数据
            if (!this.currentData || !Array.isArray(this.currentData) || this.currentData.length === 0) {
                throw new Error('暂无数据可供分析，请确保已添加数据字段');
            }

            // 检查必要的 API 设置
            if (!this.settings.apiKey) {
                throw new Error('请在设置面板中配置 API 密钥');
            }

            // 确保 Showdown 已加载
            if (!this.converter) {
                await this.loadShowdown();
            }

            const dataStr = '```json\n' + JSON.stringify(this.currentData, null, 2) + '\n```';
            const content = this.settings.promptTemplate.replace('{data}', dataStr);

            this.logDebug('API Request Content', content.substring(0, 100) + '...');

            const baseUrl = this.settings.apiBase.endsWith('/') ? 
                this.settings.apiBase.slice(0, -1) : this.settings.apiBase;
            const endpoint = '/chat/completions';
            const url = baseUrl + endpoint;

            this.logDebug('API Request', JSON.stringify({
                url,
                model: this.settings.model
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

                this.logDebug('分析完成', '结果已显示');
            } else {
                throw new Error(messageContent ? 'Markdown 转换器未准备就绪' : '响应格式不正确');
            }
        } catch (err) {
            this.showError(err);
        } finally {
            // 隐藏加载动画
            this.showLoading(false);
            button.disabled = false;
            button.textContent = '获取AI见解';
        }
    }

    private logDebug(label: string, content: string) {
        // 在控制台输出
        console.log(`[${label}]`, content);
        
        // 获取或创建调试区域
        let debugDiv = document.getElementById('debug');
        if (!debugDiv) {
            debugDiv = document.createElement('div');
            debugDiv.id = 'debug';
            debugDiv.className = 'debug-panel';
            document.body.appendChild(debugDiv);
            
            // 添加调试面板的样式
            const style = document.createElement('style');
            style.textContent = `
                .debug-panel {
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    width: 400px;
                    max-height: 300px;
                    background: rgba(0, 0, 0, 0.8);
                    color: #fff;
                    font-family: monospace;
                    font-size: 12px;
                    padding: 10px;
                    border-radius: 5px;
                    overflow-y: auto;
                    z-index: 10000;
                    display: none;
                }
                .debug-panel.show {
                    display: block;
                }
                .debug-entry {
                    margin-bottom: 5px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 5px;
                }
                .debug-time {
                    color: #888;
                    font-size: 10px;
                }
                .debug-label {
                    color: #4CAF50;
                    margin-right: 5px;
                }
            `;
            document.head.appendChild(style);
            
            // 添加切换按钮
            const toggleButton = document.createElement('button');
            toggleButton.textContent = '显示调试';
            toggleButton.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 420px;
                padding: 5px 10px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                z-index: 10000;
            `;
            toggleButton.onclick = () => {
                debugDiv.classList.toggle('show');
                toggleButton.textContent = debugDiv.classList.contains('show') ? '隐藏调试' : '显示调试';
            };
            document.body.appendChild(toggleButton);
        }

        // 创建新的调试条目
        const entry = document.createElement('div');
        entry.className = 'debug-entry';
        
        const time = document.createElement('div');
        time.className = 'debug-time';
        time.textContent = new Date().toLocaleTimeString();
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'debug-label';
        labelSpan.textContent = `[${label}]`;
        
        const contentSpan = document.createElement('span');
        contentSpan.textContent = content;
        
        entry.appendChild(time);
        entry.appendChild(labelSpan);
        entry.appendChild(contentSpan);
        
        // 添加到调试区域的顶部
        debugDiv.insertBefore(entry, debugDiv.firstChild);
        
        // 限制调试条目数量
        while (debugDiv.children.length > 50) {
            debugDiv.removeChild(debugDiv.lastChild);
        }
    }

    public update(options: VisualUpdateOptions) {
        try {
            const oldInitialText = this.formattingSettings?.styleSettings?.initialText?.value;
            
            // 更新格式设置
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);
            
            const newInitialText = this.formattingSettings?.styleSettings?.initialText?.value;
            
            // 记录更新类型和格式设置
            this.logDebug('Update Type', `${options.type}`);
            this.logDebug('Format Settings', JSON.stringify({
                oldInitialText,
                newInitialText,
                defaultText: DefaultSettings.initialText,
                hasData: this.currentData && this.currentData.length > 0
            }));

            // 检查初始文字是否发生变化
            const initialTextChanged = oldInitialText !== newInitialText;
            this.logDebug('Initial Text Changed', `${initialTextChanged} (${oldInitialText} -> ${newInitialText})`);

            // 如果初始文字发生变化，检查是否需要更新显示
            if (initialTextChanged && this.resultDiv) {
                const currentContent = this.resultDiv.innerText.trim();
                const isShowingInitialText = !currentContent || 
                    currentContent === DefaultSettings.initialText || 
                    currentContent === oldInitialText || 
                    currentContent.includes('等待分析') || 
                    currentContent.includes('请点击') || 
                    currentContent.includes('分析');

                this.logDebug('Content Check', JSON.stringify({
                    currentContent,
                    isShowingInitialText,
                    initialTextChanged
                }));

                if (isShowingInitialText) {
                    this.logDebug('Updating Display', `Setting to: ${newInitialText}`);
                    this.resultDiv.innerHTML = `<div style="color: #666; text-align: center; padding: 20px;">${newInitialText || DefaultSettings.initialText}</div>`;
                }
            }

            // 更新数据
            if (options.dataViews && options.dataViews[0] && options.dataViews[0].table) {
                const dataView = options.dataViews[0];
                const columns = dataView.table.columns;
                const rows = dataView.table.rows;

                // 检查是否有实际的数据
                if (rows && rows.length > 0 && columns && columns.length > 0) {
                    this.currentData = rows.map(row => {
                        const obj = {};
                        columns.forEach((col, index) => {
                            obj[col.displayName] = row[index];
                        });
                        return obj;
                    });

                    this.logDebug('Data Updated', JSON.stringify({
                        rowCount: rows.length,
                        columnCount: columns.length,
                        sampleData: this.currentData.length > 0 ? JSON.stringify(this.currentData[0]) : 'none'
                    }));
                } else {
                    this.currentData = [];
                    this.logDebug('No Data', 'Table exists but no rows or columns');
                }
            } else {
                this.currentData = [];
                this.logDebug('No Data', 'DataViews is empty or invalid');
            }

            // 更新样式设置
            this.updateStyles();

        } catch (err) {
            console.error('Error in update:', err);
            this.logDebug('Update Error', String(err));
        }
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
        return this.formattingSettings.enumerateObjectInstances(options);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        this.logDebug('Getting Formatting Model', 'Start');
        const model = this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
        this.logDebug('Formatting Model', JSON.stringify({
            initialText: this.formattingSettings?.styleSettings?.initialText?.value
        }));
        
        // 在获取格式化模型时也确保更新样式
        requestAnimationFrame(() => {
            this.updateStyles();
        });
        
        return model;
    }

    private showLoading(visible: boolean): void {
        if (this.loadingElement) {
            // 确保 z-index 正确
            this.loadingElement.style.zIndex = '9999';
            
            // 添加加载文字
            if (!this.loadingElement.querySelector('.loading-text')) {
                const loadingText = document.createElement('div');
                loadingText.className = 'loading-text';
                loadingText.textContent = '分析中...';
                this.loadingElement.appendChild(loadingText);
            }

            // 使用 CSS 类来控制显示/隐藏，以获得平滑的过渡效果
            if (visible) {
                this.loadingElement.style.display = 'flex';
                // 使用 requestAnimationFrame 确保过渡效果生效
                requestAnimationFrame(() => {
                    this.loadingElement.classList.add('visible');
                });
            } else {
                this.loadingElement.classList.remove('visible');
                // 等待过渡效果完成后再隐藏元素
                setTimeout(() => {
                    this.loadingElement.style.display = 'none';
                }, 300); // 与 CSS 过渡时间相匹配
            }
            
            // 当显示加载动画时，保存当前内容
            if (visible && this.resultDiv) {
                const currentContent = this.resultDiv.innerHTML;
                const initialText = this.formattingSettings?.styleSettings?.initialText?.value || DefaultSettings.initialText;
                const initialHtml = `<div style="color: #666; text-align: center; padding: 20px;">${initialText}</div>`;
                // 只有当当前内容不是初始文字时才保存
                if (currentContent !== initialHtml) {
                    this.resultDiv.dataset.savedContent = currentContent;
                }
                this.resultDiv.innerHTML = '';
            } else if (!visible && this.resultDiv) {
                // 恢复保存的内容
                const savedContent = this.resultDiv.dataset.savedContent;
                if (savedContent) {
                    this.resultDiv.innerHTML = savedContent;
                    delete this.resultDiv.dataset.savedContent;
                }
            }
        }
    }

    private copyToClipboard(text: string): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                // 创建临时文本区域
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                document.body.appendChild(textArea);

                // 选择并复制文本
                textArea.select();
                const success = document.execCommand('copy');
                
                // 清理
                document.body.removeChild(textArea);
                
                resolve(success);
            } catch (err) {
                resolve(false);
            }
        });
    }
}