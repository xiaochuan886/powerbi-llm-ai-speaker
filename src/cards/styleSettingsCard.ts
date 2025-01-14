import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

const DefaultSettings = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    fontSize: 14,
    textColor: { value: "#24292e" },
    backgroundColor: { value: "#ffffff" }
};

export class styleSettingsCard extends formattingSettings.Model {
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "字体",
        description: "设置内容字体",
        value: DefaultSettings.fontFamily
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "字号",
        description: "设置内容字号大小",
        value: DefaultSettings.fontSize,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 8
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 32
            }
        }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "文字颜色",
        description: "设置内容文字颜色",
        value: DefaultSettings.textColor
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "背景颜色",
        description: "设置整体背景颜色",
        value: DefaultSettings.backgroundColor
    });

    name: string = "styleSettings";
    displayName: string = "样式设置";
    description: string = "自定义显示样式";
    slices = [
        this.fontFamily,
        this.fontSize,
        this.textColor,
        this.backgroundColor
    ];

    public getFormattingCard(): powerbi.visuals.FormattingCard {
        return {
            uid: "styleSettingsCard",
            displayName: this.displayName,
            description: this.description,
            groups: [{
                uid: "styleSettingsGroup",
                displayName: undefined,
                slices: this.slices.map(slice => slice.getFormattingSlice(this.name))
            }]
        };
    }

    public getObjectInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstance[] {
        if (options.objectName !== this.name) {
            return [];
        }

        let instances: powerbi.VisualObjectInstance[] = [{
            objectName: this.name,
            displayName: this.displayName,
            selector: null,
            properties: {
                fontFamily: this.fontFamily.value,
                fontSize: this.fontSize.value,
                textColor: this.textColor.value,
                backgroundColor: this.backgroundColor.value
            },
            validValues: {
                fontSize: {
                    numberRange: {
                        min: 8,
                        max: 32
                    }
                }
            }
        }];
        return instances;
    }
} 