"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import {
    apiSettingsCard,
    styleSettingsCard
} from "./cards";

export class VisualFormattingSettingsModel {
    apiSettings = new apiSettingsCard();
    styleSettings = new styleSettingsCard();

    cards = [
        this.apiSettings,
        this.styleSettings
    ];

    public enumerateObjectInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstance[] {
        let instances: powerbi.VisualObjectInstance[] = [];
        this.cards.forEach(card => {
            instances.push(...card.getObjectInstances(options));
        });
        return instances;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return {
            cards: this.cards.map(card => card.getFormattingCard())
        };
    }
}