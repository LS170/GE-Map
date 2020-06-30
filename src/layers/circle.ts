import powerbiVisualsApi from "powerbi-visuals-api";
import { ClassificationMethod, Limits, decorateLayer, shouldUseGradient, getClassCount, getBreaks, getSizes, getColorStyle } from "../mapboxUtils"
import { Palette } from "../palette"
import { Filter } from "../filter"
import { RoleMap } from "../roleMap"
import { Layer } from "./layer"
import { MapboxSettings, CircleSettings } from "../settings"
import { ColorStops } from "../legendControl"
import { Sources } from "../datasources/sources"
import { constants } from "../constants"
import { MapboxMap } from "../MapboxMap"

export class Circle extends Layer {
    private filter: Filter;
    private palette: Palette;
    private settings: CircleSettings;

    public static readonly ID = 'circle';
    private static readonly HighlightID = 'circle-highlight';

    private static readonly LayerOrder = [Circle.HighlightID, Circle.ID];

    constructor(map: MapboxMap, filter: Filter, palette: Palette) {
        super(map, Circle.ID)
        this.filter = filter
        this.palette = palette
        this.source = Sources.Point
    }

    getLayerIDs() {
        return [ Circle.ID ];
    }

    getSource(settings) {
        this.settings = settings.circle;
        return super.getSource(settings);
    }

    layerIndex() { return 3 }

    addLayer(settings, beforeLayerId, roleMap) {
        const map = this.parent.getMap();
        const latitude = roleMap.latitude()
        const layers = {};

        layers[Circle.ID] = decorateLayer({
            id: Circle.ID,
            source: 'data',
            type: 'circle'
        });

        const zeroFilter = ["==", latitude, ""]
        layers[Circle.HighlightID] = decorateLayer({
            id: Circle.HighlightID,
            type: 'circle',
            source: 'data',
            filter: zeroFilter
        });

        const lastLayerId = Circle.LayerOrder.reduce((previousLayerId, layerId) => {
            map.addLayer(layers[layerId], previousLayerId);
            return layerId
        }, beforeLayerId);

        map.setPaintProperty(Circle.HighlightID, 'circle-color', settings.circle.highlightColor);
        map.setPaintProperty(Circle.HighlightID, 'circle-opacity', 1);
        map.setPaintProperty(Circle.HighlightID, 'circle-stroke-width', 1);
        map.setPaintProperty(Circle.HighlightID, 'circle-stroke-color', 'black');

        return lastLayerId
    }

    moveLayer(beforeLayerId: string) {
        const map = this.parent.getMap();
        return Circle.LayerOrder.reduce( (previousLayerId, layerId) => {
            map.moveLayer(layerId, previousLayerId)
            return layerId
        }, beforeLayerId);
    }

    hoverHighLight(e) {
        if (!this.layerExists()) {
            return;
        }

        const roleMap = this.parent.getRoleMap();
        const latitude = roleMap.latitude()
        const longitude = roleMap.longitude()
        const eventProps = e.features[0].properties;
        if (eventProps[latitude] && eventProps[longitude]) {
            const lngLatFilter = ["all",
                ["==", latitude, eventProps[latitude]],
                ["==", longitude, eventProps[longitude]],
            ]
            this.parent.getMap().setFilter(Circle.HighlightID, lngLatFilter);
        }
    }

    removeHighlight(roleMap) {
        if (!this.layerExists()) {
            return;
        }
        const latitude = roleMap.latitude()
        const map = this.parent.getMap();
        const zeroFilter = ["==", latitude, ""];
        map.setFilter(Circle.HighlightID, zeroFilter);
        if (this.settings.opacity) {
            map.setPaintProperty(Circle.ID, 'circle-opacity', this.settings.opacity / 100);
        }
    }

    updateSelection(features, roleMap) {
        const map = this.parent.getMap();
        const latitude = roleMap.latitude()
        const longitude = roleMap.longitude()

        let lngLatFilter = [];
        lngLatFilter.push("any");
        let selectionIds = features
            .slice(0, constants.MAX_SELECTION_COUNT)
            .map( (feature, index) => {
                lngLatFilter.push(["all",
                    ["==", latitude, feature.properties[latitude]],
                    ["==", longitude, feature.properties[longitude]]]);
                return feature.id;
        });
        this.filter.addSelection(selectionIds)

        map.setFilter(Circle.HighlightID, lngLatFilter);

        const opacity = this.filter.getSelectionOpacity(this.settings.opacity)
        map.setPaintProperty(Circle.ID, 'circle-opacity', opacity);
        return selectionIds
    }

    removeLayer() {
        const map = this.parent.getMap();
        Circle.LayerOrder.forEach(layerId => map.removeLayer(layerId));
        this.source.removeFromMap(map, Circle.ID);
    }

    applySettings(settings: MapboxSettings, roleMap: RoleMap, prevId: string): string {
        const lastId = super.applySettings(settings, roleMap, prevId);
        const map = this.parent.getMap();
        if (settings.circle.show) {
            const colorField = roleMap.get('color', settings.circle.colorField)
            const isGradient = shouldUseGradient(colorField);
            const colorLimits = this.source.getColorLimits(settings.circle.colorField)
            this.colorStops = this.generateColorStops(settings.circle, isGradient, colorLimits, this.palette)
            const colorFieldName = colorField ? colorField.displayName : ""
            let colorStyle = getColorStyle(isGradient, settings.circle, colorFieldName, this.colorStops);

            const sizeField = roleMap.get('size', settings.circle.sizeField)
            const sizeLimits = this.source.getSizeLimits(settings.circle.sizeField)
            const sizeFieldName = sizeField ? sizeField.displayName : ""
            const sizes = getSizes(sizeLimits, map, settings.circle.radius, settings.circle.scaleFactor, roleMap.size());

            map.setPaintProperty(Circle.ID, 'circle-radius', sizes);
            map.setPaintProperty(Circle.HighlightID, 'circle-radius', sizes);
            map.setPaintProperty(Circle.HighlightID, 'circle-color', settings.circle.highlightColor);
            map.setPaintProperty(Circle.ID, 'circle-color', colorStyle);
            map.setLayerZoomRange(Circle.ID, settings.circle.minZoom, settings.circle.maxZoom);
            map.setPaintProperty(Circle.ID, 'circle-blur', settings.circle.blur / 100);
            map.setPaintProperty(Circle.ID, 'circle-opacity', settings.circle.opacity / 100);
            map.setPaintProperty(Circle.ID, 'circle-stroke-width', settings.circle.strokeWidth);
            map.setPaintProperty(Circle.ID, 'circle-stroke-opacity', settings.circle.strokeOpacity / 100);
            map.setPaintProperty(Circle.ID, 'circle-stroke-color', settings.circle.strokeColor);
        }

        return lastId
    }

    handleTooltip(tooltipEvent, roleMap, settings: MapboxSettings) {
        const tooltipData = Layer.getTooltipData(tooltipEvent.data, tooltipEvent.ids)
            .filter((elem) => roleMap.tooltips().some( t => t.displayName === elem.displayName)); // Only show the fields that are added to the tooltips
        return tooltipData.sort( (a, b) => {
            const aIndex = roleMap.tooltips().findIndex( t => t.displayName === a.displayName)
            const bIndex = roleMap.tooltips().findIndex( t => t.displayName === b.displayName)
            return aIndex - bIndex;
        }).map(data => {
            data.value = this.getFormattedTooltipValue(roleMap, data)
            return data;
        })
    }

    showLegend(settings: MapboxSettings, roleMap: RoleMap) {
        return settings.circle.legend && roleMap.color(this) && super.showLegend(settings, roleMap)
    }


}