import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { defaults as defaultControls, FullScreen, Rotate } from 'ol/control';
import { defaults as defaultInteractions, DblClickDragZoom } from 'ol/interaction';
import { XYZ } from 'ol/source';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map!: Map;
  private mapStateSubject: BehaviorSubject<Map | null> = new BehaviorSubject<Map | null>(null);
  public mapState$: Observable<Map | null> = this.mapStateSubject.asObservable();

  constructor() { }

  initializeMap(target: string): Map {
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
            attributions: []
          }),
          properties: { background: true }
        })
      ],
      view: new View({
        center: initialCenter,
        zoom: initialZoom,
        rotation: 0,
      }),
      controls: defaultControls({
        zoom: true,
        attribution: false,
        rotate: true
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

    this.mapStateSubject.next(this.map);

    return this.map;
  }

  getMap(): Map | null {
    return this.mapStateSubject.getValue();
  }

  updateMap(map: Map): void {
    this.map = map;
    this.mapStateSubject.next(this.map);
  }

  onBackgroundChange(selectedValue: string): void {
    // Remove all current TileLayers (background layers)
    this.map.getLayers().forEach(layer => {
      if (layer instanceof TileLayer && layer.get('background')) {
        this.map.removeLayer(layer);
      }
    });
  
    // Create and add new background layer
    let backgroundLayer: TileLayer<OSM | XYZ>;
    switch (selectedValue) {
      case 'OSM':
        backgroundLayer = new TileLayer({ 
          source: new OSM(),
          properties: { background: true }
        });
        break;
      case 'Satellite':
        backgroundLayer = new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          }),
          properties: { background: true }
        });
        break;
      case 'Topographic':
        backgroundLayer = new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
          }),
          properties: { background: true }
        });
        break;
      default:
        console.warn('No matching background layer found');
        return;
    }
  
    backgroundLayer.setZIndex(-1);
    this.map.addLayer(backgroundLayer);
  }  

}