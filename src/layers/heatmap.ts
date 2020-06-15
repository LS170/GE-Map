import powerbiVisualsApi from "powerbi-visuals-api";
import { decorateLayer } from "../mapboxUtils"
import { RoleMap } from "../roleMap"
import { Layer } from "./layer"
import { MapboxSettings  } from "../settings"
import { Sources } from "../datasources/sources"
import { MapboxMap } from "../MapboxMap"

export class Heatmap extends Layer {
    private static readonly ID = 'heatmap';
    private static readonly LayerOrder = [Heatmap.ID];

    constructor(map: MapboxMap) {
        super(map, Heatmap.ID)
        this.source = Sources.Point
    }

    getLayerIDs() {
        return [ Heatmap.ID ];
    }

    layerIndex() { return 1 }

    addLayer(settings, beforeLayerId, roleMap): string {
        const map = this.parent.getMap();
        const layers = {};
        layers[Heatmap.ID] = decorateLayer({
            id: Heatmap.ID,
            source: 'data',
            type: 'heatmap',
        });
        return Heatmap.LayerOrder.reduce((prevId, layerId) => {
            map.addLayer(layers[layerId], prevId)
            return layerId
        }, beforeLayerId);
    }

    removeLayer() {
        const map = this.parent.getMap();
        Heatmap.LayerOrder.forEach((layerId) => map.removeLayer(layerId));
        this.source.removeFromMap(map, Heatmap.ID);
    }

    moveLayer(beforeLayerId: string): string {
        const map = this.parent.getMap();
        return Heatmap.LayerOrder.reduce((prevId, layerId) => {
            map.moveLayer(layerId, prevId)
            return layerId
        }, beforeLayerId);
    }

    applySettings(settings: MapboxSettings, roleMap: RoleMap, prevId: string): string {
        const lastId = super.applySettings(settings, roleMap, prevId);
        const map = this.parent.getMap();
        if (settings.heatmap.show) {
            map.setLayerZoomRange(Heatmap.ID, settings.heatmap.minZoom, settings.heatmap.maxZoom);
            map.setPaintProperty(Heatmap.ID, 'heatmap-radius', [ "interpolate", ["exponential", 1.2], ["zoom"],
                0, settings.heatmap.radius, 14, settings.heatmap.radius * 25
                ]);
            map.setPaintProperty(Heatmap.ID, 'heatmap-intensity', settings.heatmap.intensity);
            map.setPaintProperty(Heatmap.ID, 'heatmap-opacity', settings.heatmap.opacity / 100);
            map.setPaintProperty(Heatmap.ID, 'heatmap-color', [ "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(0, 0, 255, 0)",
                0.1, settings.heatmap.minColor,
                0.5, settings.heatmap.midColor,
                1, settings.heatmap.maxColor]);
        }

        return lastId
    }

    showLegend(settings: MapboxSettings, roleMap: RoleMap) {
        return false && super.showLegend(settings, roleMap)
    }
}
