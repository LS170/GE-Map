import { MapboxSettings } from "./settings"
import * as mapboxGl from "mapbox-gl"
import { Marker, Map, IControl } from "mapbox-gl"
import MapboxGeocoder from "mapbox-gl-geocoder"

export class MapboxGeocoderControl implements IControl {
    private geocoder: any
    private eventHandlers: { [eventName: string]: Function }
    private pin: Marker
    private dropPin: boolean
    private accessToken: string
    private zoom: number
    private mapboxgl: any

    constructor(settings: MapboxSettings) {
        this.accessToken = settings.api.accessToken
        this.mapboxgl = mapboxGl
        this.zoom = settings.geocoder.zoom
        this.dropPin = settings.geocoder.dropPin
        this.pin = new Marker()
    }

    public update(map: Map, settings: MapboxSettings) {

        if (!settings.geocoder.dropPin) {
            this.removePin()
        }

        const reinitNeeded = false
            || this.accessToken != settings.api.accessToken
            || this.zoom != settings.geocoder.zoom

        this.accessToken = settings.api.accessToken
        this.zoom = settings.geocoder.zoom
        this.dropPin = settings.geocoder.dropPin

        if (reinitNeeded && this.geocoder) {
            map.removeControl(this)
            map.addControl(this)
        }
    }

    public onAdd(map: Map): HTMLElement {
        this.geocoder = new MapboxGeocoder({
            accessToken: this.accessToken,
            zoom: this.zoom,
            mapboxgl: this.mapboxgl
        })

        this.quirkPosition(map)
        if (map.loaded()) {
            this.subscribe(map)
        }
        else {
            const self = this
            map.on('load', function () {
                map.off('load', this) // `this` is the function not the control
                self.subscribe(map)
            })
        }
        return this.geocoder.onAdd(map)
    }

    public onRemove(map: Map) {
        if (this.geocoder) {
            this.unsubscribe()
            this.removePin()
            this.geocoder.onRemove(map)
            this.geocoder = null
        }
    }

    public getDefaultPosition(): string {
        return "top-center"
    }

    private subscribe(map: Map) {
        if (this.eventHandlers) {
            console.warn('MapboxGeocoderControl: forced unsubscribe before resubscribe')
            this.unsubscribe()
        }

        this.eventHandlers = {
            // Listen for the `result` event from the MapboxGeocoder that is triggered when a user
            // makes a selection and add a symbol that matches the result.
            result: (ev) => {
                this.addPin(map, ev.result.center)
            },
            clear: () => {
                this.removePin()
            },
        }

        Object.keys(this.eventHandlers).forEach(eventName => {
            if (this.eventHandlers[eventName]) {
                this.geocoder.on(eventName, this.eventHandlers[eventName])
            }
        })
    }

    private unsubscribe() {
        if (!this.eventHandlers) {
            return
        }

        Object.keys(this.eventHandlers).forEach(eventName => {
            if (this.eventHandlers[eventName]) {
                this.geocoder.off(eventName, this.eventHandlers[eventName])
                this.eventHandlers[eventName] = null
            }
        })

        this.eventHandlers = null
    }

    private removePin() {
        this.pin.remove()
    }

    private addPin(map: Map, position: [number, number]) {
        if (this.dropPin) {
            this.pin.setLngLat(position).addTo(map)
        }
    }

    // This a workaround for the Map to support the top-center position string
    private quirkPosition(map: any) {
        const positionName = this.getDefaultPosition()

        if (Object.keys(map._controlPositions).indexOf(positionName) > -1) {
            return
        }

        const controlContainer = map._controlContainer
        const tagName = "div"
        const className = "mapboxgl-ctrl-" + positionName

        const el = document.createElement(tagName)
        el.className = className
        controlContainer.appendChild(el)
        map._controlPositions[positionName] = el
    }
}
