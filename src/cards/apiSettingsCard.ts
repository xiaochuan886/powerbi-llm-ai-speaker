import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

const DefaultSettings = {
    provider: "moonshot",
    apiKey: "",
    apiBase: "",
    model: "",
    promptTemplate: ""
};

export class apiSettingsCard extends formattingSettings.Model {
    provider = new formattingSettings.TextInput({
        name: "provider",
        displayName: "API提供商",
        description: "选择API提供商",
        value: DefaultSettings.provider,
        placeholder: "请输入API提供商"
    });

    apiKey = new formattingSettings.TextInput({
        name: "apiKey",
        displayName: "API密钥",
        description: "输入API密钥",
        value: DefaultSettings.apiKey,
        placeholder: "请输入API密钥"
    });

    apiBase = new formattingSettings.TextInput({
        name: "apiBase",
        displayName: "API地址",
        description: "输入API地址",
        value: DefaultSettings.apiBase,
        placeholder: "请输入API地址"
    });

    model = new formattingSettings.TextInput({
        name: "model",
        displayName: "模型名称",
        description: "输入模型名称",
        value: DefaultSettings.model,
        placeholder: "请输入模型名称"
    });

    promptTemplate = new formattingSettings.TextInput({
        name: "promptTemplate",
        displayName: "分析提示模板",
        description: "输入分析提示模板",
        value: DefaultSettings.promptTemplate,
        placeholder: "请输入分析提示模板"
    });

    name: string = "apiSettings";
    displayName: string = "API设置";
    description: string = "配置API连接参数";
    slices = [this.provider, this.apiKey, this.apiBase, this.model, this.promptTemplate];

    public getFormattingCard(): powerbi.visuals.FormattingCard {
        return {
            uid: "apiSettingsCard",
            displayName: this.displayName,
            description: this.description,
            groups: [{
                uid: "apiSettingsGroup",
                displayName: undefined,
                slices: this.slices.map(slice => slice.getFormattingSlice(this.name))
            }]
        };
    }

    public getObjectInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstance[] {
        let instances: powerbi.VisualObjectInstance[] = [{
            objectName: this.name,
            displayName: this.displayName,
            selector: null,
            properties: {
                provider: this.provider.value,
                apiKey: this.apiKey.value,
                apiBase: this.apiBase.value,
                model: this.model.value,
                promptTemplate: this.promptTemplate.value
            }
        }];
        return instances;
    }
} 