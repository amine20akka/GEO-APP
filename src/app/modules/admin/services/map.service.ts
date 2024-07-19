import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { defaults as defaultControls, FullScreen, MousePosition, Rotate, ScaleLine, ZoomSlider, ZoomToExtent } from 'ol/control';
import { defaults as defaultInteractions, DblClickDragZoom } from 'ol/interaction';
import TileWMS from 'ol/source/TileWMS';
import { XYZ } from 'ol/source';
import { LayersService } from './layers.service';
import { createStringXY } from 'ol/coordinate';
import { Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map!: Map;
  private layers: { [layerName: string]: TileLayer<TileWMS> } = {};
  private layerOrder: string[] = [];
  private visibleLayers: Set<string> = new Set();

  constructor(private layerService: LayersService) { }

  initializeMap(target: string): void {
    const initialCenter = [1138871.0121687565, 4415980.133146803];
    const initialZoom = 15;
  
    this.map = new Map({
      target: target,
      interactions: defaultInteractions().extend([
        new DblClickDragZoom(),
      ]),
      layers: [
        new TileLayer({
          source: new OSM({
            attributions: [] // This hides the map name/attribution
          })
        })
      ],
      view: new View({
        center: initialCenter,
        zoom: initialZoom,
        rotation: 0, // Add this line to enable rotation
      }),
      controls: defaultControls({
        zoom: true,
        attribution: false,
        rotate: true // Change this to true
      }).extend([
        new FullScreen({
          className: 'ol-full-screen'
        }),
        new Rotate({
          className: 'ol-rotate',
          label: '⟲'
        })
      ])
    });
  }

//first step
  getMap(): Map | undefined {
    return this.map;
  }
   getFeatureAttributes(layerName) {
    const url = `http://localhost:8080/geoserver/test_data/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json`;
  
    fetch(url)
      .then(response => response.json())
      .then(data => {
        // Assuming data is GeoJSON format, you can access attributes
        if (data && data.features && data.features.length > 0) {
          const attributes = data.features[0].properties;
          console.log('Feature Attributes:', attributes);
        }
      })
      .catch(error => {
        console.error('Error fetching feature attributes:', error);
      });
  }
  
  addWMSLayer(layerName: string): void {
    if (!this.layers[layerName]) {
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
        }),
        
      },
      );
      console.log('layer props' , this.getFeatureAttributes(layerName));

      this.layers[layerName] = wmsLayer;
      if (!this.layerOrder.includes(layerName)) {
        this.layerOrder.push(layerName);
      }
      this.visibleLayers.add(layerName);
      this.map.addLayer(wmsLayer);
      this.updateLayerZIndex();
      console.log( 'this new layer to add' ,wmsLayer);
    } else {
      this.visibleLayers.add(layerName);
      this.layers[layerName].setVisible(true);
    }
    console.log('layer props' , this.getFeatureAttributes(layerName));

  }

  removeWMSLayer(layerName: string): void {
    if (this.layers[layerName]) {
      this.visibleLayers.delete(layerName);
      this.layers[layerName].setVisible(false);
      this.updateLayerZIndex();
    }
  }

  private updateLayerZIndex(): void {
    this.layerOrder.forEach((layerName, index) => {
      const layer = this.layers[layerName];
      if (layer) {
        const zIndex = this.layerOrder.length - index;
        layer.setZIndex(zIndex);
        layer.setVisible(this.visibleLayers.has(layerName));
      }
    });
  }

  reorderLayers(newOrder: {name: string, zIndex: number}[]): void {
    this.layerOrder = newOrder.map(layer => layer.name);
    this.updateLayerZIndex();
  }

  getLayerOrder(): string[] {
    return [...this.layerOrder];
  }

  isLayerVisible(layerName: string): boolean {
    return this.visibleLayers.has(layerName);
  }

  onBackgroundChange(selectedValue: string): void {
    // Clear current layers except WMS layers
    this.map.getLayers().forEach(layer => {
      if (!(layer instanceof TileLayer && layer.getSource() instanceof TileWMS)) {
        this.map.removeLayer(layer);
      }
    });
  
    // Add background layer based on selected value
    let backgroundLayer: TileLayer<OSM | XYZ>;
    switch (selectedValue) {
      case 'osm':
        backgroundLayer = new TileLayer({ source: new OSM() });
        break;
      case 'satellite':
        backgroundLayer = new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          })
        });
        break;
      case 'topographic':
        backgroundLayer = new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
          })
        });
        break;
      default:
        return;
    }
    
    backgroundLayer.setZIndex(0);
    this.map.addLayer(backgroundLayer);
  }
}