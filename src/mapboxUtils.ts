import powerbiVisualsApi from "powerbi-visuals-api";
import * as chroma from "chroma-js"
import { featureCollection } from "@turf/helpers"
import { propEach } from "@turf/meta"
import { CircleSettings, SymbolSettings } from "./settings"
import { ColorStops } from "./legendControl"

export enum ClassificationMethod {
    Quantile,
    Equidistant,
    Logarithmic,
    NaturalBreaks,
}

export interface Limits {
    min: number;
    max: number;
    values: number[];
}

export function zoomToData(map, bounds) {
    if (bounds) {
        map.fitBounds(bounds, {
            padding: 20,
            maxZoom: 15,
        });
    }
}

export function shouldUseGradient(colorColumn) {
    return colorColumn && colorColumn.aggregates != null;
}

export function debounce(func, wait, immediate) {
    let timeout;
    return function () {
        let context = this, args = arguments;
        let later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        let callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};


export function getClassCount(values: number[]) {
    const MAX_BOUND_COUNT = 6;
    // For example if you want 5 classes, you have to enter 6 bounds
    // (1 bound is the minimum value, 1 bound is the maximum value,
    // the rest are class separators)
    const classCount = Math.min(values.length, MAX_BOUND_COUNT) - 1;
    return classCount;
}

export function getBreaks(values: number[], method: ClassificationMethod, classCount: number): number[] {
    let chromaMode: 'e' | 'q' | 'l' | 'k';

    switch (method) {
        case ClassificationMethod.Equidistant:
            chromaMode = 'e'
            break;
        case ClassificationMethod.Logarithmic:
            chromaMode = 'l'
            break;
        case ClassificationMethod.NaturalBreaks:
            chromaMode = 'k'
            break;
        case ClassificationMethod.Quantile:
            chromaMode = 'q'
            break;
        default:
            break;
    }

    return chroma.limits(values, chromaMode, classCount);
}

 export function positionInArray(array: any[], element: any) {
    let found = false
    for (let i = 0; i <= array.length; i++) {
        if (array[i] == element) {
            found = true
            break
        }
    }
    if (!found) {
        return -1
    }
 }

export function pushIfNotExist(array: any[], element: any) {
    if (positionInArray(array, element) === -1) {
        array.push(element)
    }
}

export function decorateLayer(layer) {
    switch (layer.type) {
        case 'circle': {
            layer.paint = {};
            break;
        }
        case 'cluster': {
            layer.type = 'circle';
            break;
        }
        case 'heatmap': {
            layer.paint = {};
            break;
        }
    }
    return layer;
}

export function filterValues(values: number[], minValue: number, maxValue: number) {
    let filterFn;

    if (minValue != null && maxValue != null) {
        filterFn = (val) => (val >= minValue) && (val <= maxValue);
    }
    else if (maxValue != null) {
        filterFn = (val) => val <= maxValue;
    }
    else if (minValue != null) {
        filterFn = (val) => val >= minValue;
    }
    else {
        return values
    }

    return values.filter(filterFn);
}

export function getLimits(data, myproperty): Limits {

    let min = null;
    let max = null;
    let values = [];

    if (data && data.length > 0 && myproperty != '') {
        if (data[0]['type']) {
            // data are geojson
            propEach(featureCollection(data), function (currentProperties, featureIndex) {
                if (currentProperties[myproperty] || currentProperties[myproperty] === 0) {
                    const value = currentProperties[myproperty];
                    if (!min || value < min) { min = value }
                    if (!max || value > max) { max = value }
                    pushIfNotExist(values, value)
                }
            })
        }
        else {
            // data are non-geojson objects for a choropleth
            data.forEach(f => {
                if (f[myproperty] !== undefined && f[myproperty] !== null) {
                    const value = f[myproperty];
                    if (!min || value < min) { min = value }
                    if (!max || value > max) { max = value }
                    pushIfNotExist(values, value)
                }
            })
        }
    }

    // Min and max must not be equal because of the interpolation.
    // let's make sure with the substraction if it is a number
    if (min && min.toString() !== min && min == max) {
        min = min - 1
    }

    return {
        min,
        max,
        values
    }
}

export function getCategoricalObjectValue<T>(category: powerbiVisualsApi.DataViewCategoryColumn, index: number, objectName: string, propertyName: string, defaultValue: T): T {
    let categoryObjects = category.objects;

    if (categoryObjects) {
        let categoryObject: powerbiVisualsApi.DataViewObject = categoryObjects[index];
        if (categoryObject) {
            let object = categoryObject[objectName];
            if (object) {
                let property: T = object[propertyName];
                if (property !== undefined) {
                    return property;
                }
            }
        }
    }
    return defaultValue;
}


export function getSizes(sizeLimits: Limits, map: any, sizeFactor: number, scaleFactor: number, sizeField: string) {
    if (sizeField !== '' && sizeLimits && sizeLimits.min != null && sizeLimits.max != null && sizeLimits.min != sizeLimits.max) {
        const style: any[] = [
            "interpolate", ["linear"],
            ["to-number", ['get', sizeField]]
        ]

        const classCount = getClassCount(sizeLimits.values);
        const sizeStops: any[] = getBreaks(sizeLimits.values, ClassificationMethod.Quantile, classCount);
        const sizeDelta = (sizeFactor * scaleFactor - sizeFactor) / classCount

        sizeStops.map((sizeStop, index) => {
            const size = sizeFactor + index * sizeDelta
            style.push(sizeStop);
            style.push(size);
        });
        return style;
    }
    else {
        return [
            'interpolate', ['linear'], ['zoom'],
            0, sizeFactor,
            18, sizeFactor * scaleFactor
        ];
    }
}

export function getColorStyle(isGradient: boolean, settings: CircleSettings | SymbolSettings, colorField: string, colorStops: ColorStops) {
    if (colorField === '') {
        return settings.minColor;
    }

    if (isGradient) {
        // Set colors for continuous value
        const continuousStyle: any = ["interpolate", ["linear"], ["to-number", ['get', colorField]]]
        colorStops.forEach(({colorStop, color}) => {
            continuousStyle.push(colorStop);
            continuousStyle.push(color);
        });

        return continuousStyle;
    }

    // Set colors for categorical value
    let categoricalStyle: any = ['match', ['to-string', ['get', colorField]]];
    colorStops.forEach(({colorStop, color}) => {
        categoricalStyle.push(colorStop);
        categoricalStyle.push(color);
    });

    // Add transparent as default so that we only see regions
    // for which we have data values
    categoricalStyle.push('rgba(255,0,0,255)');

    return categoricalStyle;
}
