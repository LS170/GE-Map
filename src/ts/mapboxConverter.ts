module powerbi.extensibility.visual {
    export module mapboxConverter {

        const positionInArray = (array, element) => { 
            return array.findIndex( value => {
                return value === element
            })
        } 

        const pushIfNotExist = (array, element) => {
            if (positionInArray(array, element) === -1) {
                array.push(element)
            }
        }

        const createLegendItem = (color, label, index) => {
            let key = document.createElement('span');
            key.className = 'legend-key';
            key.id = 'legend-points-id-' + index;
            key.style.backgroundColor = color;

            let value = document.createElement('span');
            value.id = 'legend-points-value-' + index;
            value.textContent = label;
            
            let item = document.createElement('div');
            item.appendChild(key);
            item.appendChild(value);

            return item;
        }

        //Create the legend element on a Mapbox GL Style Spec property function stops array
        const createLegend = (colorStops, valueStops, title) => {
            var legend = document.getElementById('legend');
            legend.innerHTML = ''

            var mytitle = document.createElement('div');
            mytitle.textContent = title;
            mytitle.id = 'legend-title';
            mytitle.className = 'legend-title';
            legend.appendChild(mytitle);

            colorStops.map( (color, index) => {
                const item = createLegendItem(color, valueStops[index], index);

                legend.appendChild(item);
            })

        }

        const transformToObjectArray = (rows, columns, legend_field) => {
            let domain : any = [];

            const datas = rows.map( row => {
                return row.reduce( (obj, value, index) => {
                    const column = columns[index]
                    const role = Object.keys(column.roles)[0]
                    obj[role] = value;
                    if (column == legend_field) {
                        const t = column.type.primitiveType;
                        pushIfNotExist(domain, value);
                        if (typeof value != 'number') {
                            const colorIndex = positionInArray(domain, value);
                            obj.color = colorIndex < 8 ? colorIndex + 1 : 9;
                        } else {
                            obj.color = value;
                        }
                    }
                    return obj;
                }, {});
            });
            return {
                datas,
                domain,
            }
        }

        const getScale = (domain) => {
            if (!domain || !(domain.length > 0)) {
                return null;
            }
            let length = domain.length
            let legend_length = length < 8 ? length : 8
            if (typeof domain[0] === 'number') {
                var limits = chroma.limits(domain, 'q', legend_length);
                return chroma.scale('YlGnBu').domain(limits)
            } else {
                return chroma.scale('Set2').domain([1, legend_length + 1])
            }
        }

        const getFeatures = (datas, domain) => {
            let features = []
            const scale = getScale(domain);
            if (scale) {
            	features = datas.map(function (d) {
                    let tooltip = d.category || d.size;
                    let properties = {
                        "colorValue": d.color,
                        "color": (d.color) ? scale(d.color).toString() : null,
                        "tooltip": (tooltip) ? `Value: ${(tooltip).toString()}` : "",
                        "size": d.size,
                        "location": d.location
                    }

            		if ( (d.latitude >= -90) && (d.latitude <= 90) && (d.longitude >= -180) && (d.longitude <= 180) ) {
		                let feat: GeoJSON.Feature<any> = {
		                    "type": "Feature",
		                    "geometry": {
		                        "type": "Point",
		                        "coordinates": [d.longitude, d.latitude]
		                    },
                            properties
		                }
                        return feat;
                    } else if (d.location) {
                        let feat = { properties }
                        return feat;
                    }
            	});

	        }

            return features;
        }

        export function convert(dataView: DataView, host: IVisualHost) {

            const {columns, rows} = dataView.table;

            const legend_field = mapboxUtils.getLegendColumn(columns);

            // Convert each row from value array to a JS object like { latitude: "", longitude: "" ... }
            const { datas, domain }  = transformToObjectArray(rows, columns, legend_field);

            return getFeatures(datas, domain);
        }
    }
}
