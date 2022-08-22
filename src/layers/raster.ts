import powerbiVisualsApi from "powerbi-visuals-api";
import { decorateLayer  } from "../mapboxUtils"
import { Layer } from "./layer"
import { Sources } from "../datasources/sources"
import { MapboxMap } from "../visual"
import { MapboxSettings } from "../settings";
import { RoleMap } from "../roleMap";

export class Raster extends Layer {
    private static readonly ID = 'raster';
    private static readonly LayerOrder = [Raster.ID];

    constructor(map: MapboxMap) {
        super(map, Raster.ID)
        this.source = Sources.Raster
    }

    getLayerIDs() {
        return [Raster.ID];
    }

    addLayer(settings, beforeLayerId) {
        const map = this.parent.getMap();
        const layers = {};
        layers[Raster.ID] = decorateLayer({
            id: Raster.ID,
            source: 'raster',
            type: 'raster',
            paint: {
                'raster-opacity': 1
            }
        });
        Raster.LayerOrder.forEach((layerId) => map.addLayer(layers[layerId], beforeLayerId));
    }

    removeLayer() {
        const map = this.parent.getMap();
        map.removeLayer('raster');
        this.source.removeFromMap(map, 'raster');
    }

    applySettings(settings: MapboxSettings, roleMap: RoleMap, prevId: string): string {
        const lastId = super.applySettings(settings, roleMap, prevId);
        const map = this.parent.getMap();
        if (settings.raster.show) {
            map.setPaintProperty(Raster.ID, 'raster-opacity', settings.raster.opacity / 100);
            map.setLayerZoomRange(Raster.ID, settings.raster.minZoom, settings.raster.maxZoom);
        }

        return lastId
    }

}
