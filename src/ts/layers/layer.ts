module powerbi.extensibility.visual {
    export abstract class Layer {
        protected parent: MapboxMap;
        protected source: data.Datasource;
        protected id: string;

        constructor(map: MapboxMap) {
            this.parent = map;
        }

        updateSource(features, roleMap, settings) {
            if (settings[this.id].show) {
                this.source.update(this.parent.getMap(), features, roleMap, settings);
            }
        }

        getBounds(settings) : any[] {
            if (settings[this.id].show) {
                return this.source.getBounds();
            }
            return null;
        }

        getId() {
            return this.id
        }

        abstract getLayerIDs()

        updateSelection(features, roleMap) {
        }

        hoverHighLight(e) {
        }

        removeHighlight(roleMap) {
        }

        applySettings(settings, roleMap) {
            const map = this.parent.getMap();
            if (settings[this.id].show) {
                if (!this.layerExists()) {
                    // If there is no firstSymbolId specified, it adds the data as the last element.
                    let firstSymbolId = null;
                    if (settings.api.labelPosition === 'above') {
                        // For default styles place data under waterway-label layer
                        firstSymbolId = 'waterway-label';
                        if (settings.api.style == 'mapbox://styles/mapbox/satellite-v9?optimize=true' ||
                        settings.api.style == 'custom') {
                            // For custom style find the lowest symbol layer to place data underneath
                            firstSymbolId = ''
                            let layers = map.getStyle().layers;
                            for (let i = 0; i < layers.length; i++) {
                                if (layers[i].type === 'symbol') {
                                    firstSymbolId = layers[i].id;
                                    break;
                                }
                            }
                        }
                    }
                    this.addLayer(settings, firstSymbolId, roleMap);
                }
            } else {
                if (this.layerExists()) {
                    this.removeLayer();
                }
            }
        }

        addLayer(settings, beforeLayerId: string, roleMap) {
        }
        abstract removeLayer()

        layerExists() {
            const map = this.parent.getMap();
            const layer = map.getLayer(this.id);
            return layer != null;
        }

        getSource(settings) {
            if (settings[this.id].show) {
                this.source.ensure(this.parent.getMap(), this.id, settings);
                return this.source;
            }
            return null;
        }

        handleZoom(settings) : boolean {
            if (settings[this.id].show) {
                return this.source.handleZoom(this.parent.getMap(), settings);
            }
            return false;
        }

        hasTooltip(tooltips) {
            if (!tooltips) {
                // Do not show tooltip if no property is pulled into 'tooltips' data role
                return false;
            }
            return true;
        }

        getToolTipFormat(roleMap, prop): string {
            let format = undefined;
            Object.keys(roleMap).map(role => {
                if (roleMap[role].displayName === prop) {
                    format = roleMap[role].format
                    return
                }
            })
            return format
        }

        handleTooltip(tooltipEvent: TooltipEventArgs<number>, roleMap, settings) {
            const tooltipData = Layer.getTooltipData(tooltipEvent.data);
            return tooltipData.map(data => {
                const prop = data.displayName
                let format = this.getToolTipFormat(roleMap, prop)
                if (format != undefined) {
                    data.value = numeral(data.value).format(format);
                }
                return data;
            })
        }

        static getTooltipData(value: any): VisualTooltipDataItem[] {
            if (!value) {
                return [];
            }
            // Flatten the multiple properties or multiple datapoints
            return [].concat.apply([], value.map(properties => {
                // This mapping is needed to copy the value with the toString
                // call as otherwise some caching logic causes to be the same
                // tooltip displayed for all datapoints.
                return properties.map(prop => {
                    return {
                        displayName: prop.key,
                        value: prop.value.toString(),
                    };
                });
            }));
        }
    }
}
