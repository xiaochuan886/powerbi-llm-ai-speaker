import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

const DefaultSettings = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    fontSize: 14,
    textColor: { value: "#24292e" },
    backgroundColor: { value: "#ffffff" },
    buttonFontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    buttonFontSize: 14,
    buttonTextColor: { value: "#ffffff" },
    buttonBackgroundColor: { value: "#0078d4" }
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

    buttonFontFamily = new formattingSettings.FontPicker({
        name: "buttonFontFamily",
        displayName: "按钮字体",
        description: "设置按钮字体",
        value: DefaultSettings.buttonFontFamily
    });

    buttonFontSize = new formattingSettings.NumUpDown({
        name: "buttonFontSize",
        displayName: "按钮字号",
        description: "设置按钮字号大小",
        value: DefaultSettings.buttonFontSize,
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

    buttonTextColor = new formattingSettings.ColorPicker({
        name: "buttonTextColor",
        displayName: "按钮文字颜色",
        description: "设置按钮文字颜色",
        value: DefaultSettings.buttonTextColor
    });

    buttonBackgroundColor = new formattingSettings.ColorPicker({
        name: "buttonBackgroundColor",
        displayName: "按钮背景颜色",
        description: "设置按钮背景颜色",
        value: DefaultSettings.buttonBackgroundColor
    });

    name: string = "styleSettings";
    displayName: string = "样式设置";
    description: string = "自定义显示样式";
    slices = [
        this.fontFamily,
        this.fontSize,
        this.textColor,
        this.backgroundColor,
        this.buttonFontFamily,
        this.buttonFontSize,
        this.buttonTextColor,
        this.buttonBackgroundColor
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
                backgroundColor: this.backgroundColor.value,
                buttonFontFamily: this.buttonFontFamily.value,
                buttonFontSize: this.buttonFontSize.value,
                buttonTextColor: this.buttonTextColor.value,
                buttonBackgroundColor: this.buttonBackgroundColor.value
            },
            validValues: {
                fontSize: {
                    numberRange: {
                        min: 8,
                        max: 32
                    }
                },
                buttonFontSize: {
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