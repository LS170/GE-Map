import { Datasource } from "./datasource"
import { Limits, getLimits } from "../mapboxUtils"
import { featureCollection } from "@turf/helpers"
import bbox from "@turf/bbox"

export class Point extends Datasource {
    protected colorLimits: Limits[];
    protected sizeLimits: Limits[];

    constructor() {
        super('point')

        this.colorLimits = []
        this.sizeLimits = []
    }

    addSources(map, settings) {
        map.addSource('data', {
            type: 'geojson',
            data: featureCollection([]),
            buffer: 10
        });
        return map.getSource('data');
    }

    removeSources(map) {
        map.removeSource('data');
    }

    private getLimitsAtIndex(limits: Limits[], index: number) : Limits {
        if (index >= 0 && index < limits.length) {
            return limits[index]
        }

        return { min: null, max: null, values: [] }
    }

    getColorLimits(index: number) : Limits {
        return this.getLimitsAtIndex(this.colorLimits, index)
    }

    getSizeLimits(index: number) : Limits {
        return this.getLimitsAtIndex(this.sizeLimits, index)
    }

    getLimits() {
        return {
            color: this.getLimitsAtIndex(this.colorLimits, 0),
            size: this.getLimitsAtIndex(this.sizeLimits, 0),
        };
    }

    ensure(map, layerId, settings): void {
        super.ensure(map, layerId, settings)
        const source: any = map.getSource('data');
        if (!source) {
            this.addToMap(map, settings);
        }
    }

    update(map, features, roleMap, settings) {
        super.update(map, features, roleMap, settings)
        const fCollection = featureCollection(features);
        const source: any = map.getSource('data');
        source.setData(fCollection);
        let colors = roleMap.getAll('color');
        this.colorLimits = colors.map( color => {
            return getLimits(features, color.displayName)
        })
        let sizes = roleMap.getAll('size');
        this.sizeLimits =sizes.map( size => {
            return getLimits(features, size.displayName);
        })
        this.bounds = bbox(fCollection);
    }
}
