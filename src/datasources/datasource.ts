import { Limits } from "../mapboxUtils"

export abstract class Datasource {
    protected bounds: any[];
    private references: Object;
    public ID: string;

    constructor(id) {
        this.references = {}
        this.ID = id
    }

    abstract addSources(map, settings);
    abstract removeSources(map);

    abstract getColorLimits(index: number) : Limits
    abstract getSizeLimits(index: number) : Limits

    addToMap(map, settings) {
        this.addSources(map, settings)
    }

    removeFromMap(map, layerId) {
        delete this.references[layerId]
        if (Object.keys(this.references).length == 0) {
            this.removeSources(map)
        }
    }

    ensure(map, layerId, settings): void {
        this.references[layerId] = true;
    }

    update(map, features, roleMap, settings) {}
    getBounds() : any[] { return this.bounds }
    handleZoom(map, settings) : boolean {
        return false;
    }
    getData(map, settings) : any[] { return null }
}
