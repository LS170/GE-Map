import powerbiVisualsApi from "powerbi-visuals-api";
import DataView = powerbiVisualsApi.DataView;
import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost;
import { dataViewObject, dataViewObjects } from "powerbi-visuals-utils-dataviewutils"

import { mapboxUtils } from "./mapboxUtils"

export class Palette {
    private mapVisual: any; // TODO
    private dataColorGroupNames: string[];
    private colorMap: { [group: string]: string };
    private colorPalette: powerbiVisualsApi.extensibility.IColorPalette;

    constructor(mapVisual: any, host: IVisualHost) { // TODO
        this.mapVisual = mapVisual
        this.colorPalette = host.colorPalette
        this.dataColorGroupNames = []
        this.colorMap = {
        }
    }

    public getColor(id: string | number): string {
        const idStr = id.toString()
        if (!this.colorMap[idStr]) {
            this.colorMap[idStr] = this.colorPalette.getColor(idStr).value
        }

        return this.colorMap[idStr];
    }

    public enumerateObjectInstances(options: powerbiVisualsApi.EnumerateVisualObjectInstancesOptions) {
        const objectEnumeration: powerbiVisualsApi.VisualObjectInstance[] = this.dataColorGroupNames.map(name => {
            return {
                objectName: options.objectName,
                displayName: name,
                properties: {
                    fill: {
                        solid: {
                            color: this.getColor(name)
                        }
                    }
                },
                // Creates options under metadata.objects.dataColorsPalette.$instances
                selector: {
                    id: name,
                },
            };
        });
        return objectEnumeration;
    }

    public update(dataView: DataView, features: any) {
        try {
            this.dataColorGroupNames = [];
            const roleMap = this.mapVisual.getRoleMap()

            if (!roleMap.color) {
                return;
            }

            if (mapboxUtils.shouldUseGradient(roleMap.color)) {
                return;
            }

            const colorPropertyName = roleMap.color.displayName;

            this.updateDataColorGroupNames(features, colorPropertyName);
            this.updateColorMap(dataView);
        }
        catch (err) {
            console.log("Exception occured during group color creation: ", err);
        }
    }

    private updateDataColorGroupNames(features: any, colorPropertyName: string) {
        const uniqueGroupNames: { [name: string]: boolean; } = {};
        features.forEach(feature => {
            const groupName = feature.properties[colorPropertyName];
            uniqueGroupNames[groupName] = true;
        });
        this.dataColorGroupNames = Object.keys(uniqueGroupNames);
    }

    updateColorMap(dataView: DataView) {
        const dataColorsPalette = dataView && dataView.metadata && dataView.metadata.objects ?
            dataViewObjects.getObject(dataView.metadata.objects, "dataColorsPalette")
            :
            null;

        this.dataColorGroupNames.forEach(name => {
            let colorValue = this.getColor(name)
            if (dataColorsPalette && dataColorsPalette.$instances) {
                colorValue = dataViewObject.getFillColorByPropertyName(dataColorsPalette.$instances[name], "fill", colorValue);
            }

            this.colorMap[name] = colorValue
        })
    }
}
