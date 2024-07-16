import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { defaults as defaultControls, ZoomSlider, ZoomToExtent } from 'ol/control';
import { defaults as defaultInteractions, DblClickDragZoom } from 'ol/interaction';
import TileWMS from 'ol/source/TileWMS';
import { XYZ } from 'ol/source';
import { LayersService } from './layers.service';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map!: Map;
  private layers: { [layerName: string]: TileLayer<TileWMS> } = {};

  constructor(private layerService: LayersService) { }

  initializeMap(target: string): void {
    this.map = new Map({
      target: target,
      interactions: defaultInteractions().extend([
        new DblClickDragZoom(),
      ]),
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: [1138871.0121687565, 4415980.133146803],
        zoom: 15,
      }),
      controls: defaultControls().extend([
        new ZoomSlider(),
        new ZoomToExtent({
          extent: [-180, -90, 180, 90],
        }),
      ])
    });
  }

  getMap(): Map | undefined {
    return this.map;
  }

  addLayer(layer: TileLayer<TileWMS>): void {
    if (this.map) {
      this.map.addLayer(layer);
    }
  }

  addWMSLayer(layerName: string): void {
    const wmsLayer = new TileLayer({
      source: new TileWMS({
        url: 'http://localhost:8080/geoserver/test_data/wms',
        params: {
          'SERVICE': 'WMS',
          'VERSION': '1.1.0',
          'REQUEST': 'GetMap',
          'LAYERS': layerName,
          'STYLES': '',
          'SRS': 'EPSG:4326',
          'FORMAT': 'image/png'
        },
        serverType: 'geoserver'
      })
    });

    this.addLayer(wmsLayer);
    this.layers[layerName] = wmsLayer; // Store the layer
  }

  removeWMSLayer(layerName: string): void {
    if (this.layers[layerName]) {
      this.map.removeLayer(this.layers[layerName]);
      delete this.layers[layerName];
      console.log(`Removed layer: ${layerName}`);
    } else {
      console.warn(`Layer '${layerName}' not found or already removed.`);
    }
  }

  onBackgroundChange(selectedValue: string): void {
    // Clear current layers except WMS layers
    this.map.getLayers().forEach(layer => {
      if (!(layer instanceof TileLayer && layer.getSource() instanceof TileWMS)) {
        this.map.removeLayer(layer);
      }
    });
  
    // Add background layer based on selected value
    switch (selectedValue) {
      case 'osm':
        this.map.addLayer(new TileLayer({
          source: new OSM()
        }));
        break;
      case 'satellite':
        this.map.addLayer(new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          })
        }));
        break;
      case 'topographic':
        this.map.addLayer(new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
          })
        }));
        break;
      default:
        break;
    }
  
    // Fetch and add WMS layers from GeoServer
    // this.layerService.fetchLayersFromWorkspace('test_data').then(data => {
    //   this.layerService.processWorkspaceLayersData(data, this.addWMSLayer.bind(this));
    // });
  }
  
}
