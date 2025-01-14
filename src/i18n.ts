export interface ILanguageResources {
    [key: string]: {
        apiSettings: {
            title: string;
            provider: string;
            apiKey: string;
            apiBase: string;
            model: string;
            promptTemplate: string;
        };
        styleSettings: {
            title: string;
            fontFamily: string;
            fontSize: string;
            textColor: string;
            backgroundColor: string;
            backgroundOpacity: string;
        };
        ui: {
            analyzeButton: string;
            waitingMessage: string;
            errorTitle: string;
            dataLimitError: string;
            apiError: string;
            copyButton: string;
            copySuccess: string;
            copyError: string;
        };
    };
}

export const languageResources: ILanguageResources = {
    "zh-CN": {
        apiSettings: {
            title: "API设置",
            provider: "API提供商",
            apiKey: "API密钥",
            apiBase: "API地址",
            model: "模型名称",
            promptTemplate: "分析提示模板"
        },
        styleSettings: {
            title: "样式设置",
            fontFamily: "字体",
            fontSize: "字号",
            textColor: "文字颜色",
            backgroundColor: "背景颜色",
            backgroundOpacity: "背景透明度"
        },
        ui: {
            analyzeButton: "开始分析",
            waitingMessage: "等待分析...",
            errorTitle: "错误",
            dataLimitError: "数据量超过1000行限制",
            apiError: "API调用失败，请检查设置",
            copyButton: "复制内容",
            copySuccess: "复制成功！",
            copyError: "复制失败，请重试"
        }
    },
    "en-US": {
        apiSettings: {
            title: "API Settings",
            provider: "API Provider",
            apiKey: "API Key",
            apiBase: "API Base URL",
            model: "Model Name",
            promptTemplate: "Analysis Prompt Template"
        },
        styleSettings: {
            title: "Style Settings",
            fontFamily: "Font Family",
            fontSize: "Font Size",
            textColor: "Text Color",
            backgroundColor: "Background Color",
            backgroundOpacity: "Background Opacity"
        },
        ui: {
            analyzeButton: "Start Analysis", 
            waitingMessage: "Waiting for analysis...",
            errorTitle: "Error",
            dataLimitError: "Data exceeds 1000 rows limit",
            copyButton: "Copy Content",
            copySuccess: "Copy successful!",
            copyError: "Copy failed, please try again",
            apiError: "API call failed, please check settings"
        }
    }
};

export function getLanguageResources(locale: string = "en-US") {
    return languageResources[locale] || languageResources["en-US"];
} 