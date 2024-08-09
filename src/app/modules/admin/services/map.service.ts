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
  // Observable to manage the state of the map
  private mapStateSubject: BehaviorSubject<Map | null> = new BehaviorSubject<Map | null>(null);
  public mapState$: Observable<Map | null> = this.mapStateSubject.asObservable();
  private map!: Map;

  constructor() {}

  /**
   * Initializes the OpenLayers map and sets it to the provided target.
   * @param target - The target element ID where the map will be rendered.
   * @returns The initialized map instance.
   */
  initializeMap(target: string): Map {
    const initialCenter = [1138871.0121687565, 4415980.133146803]; // Initial center coordinates
    const initialZoom = 15; // Initial zoom level

    this.map = new Map({
      target: target,
      interactions: defaultInteractions().extend([new DblClickDragZoom()]), // Adding custom interaction
      layers: [
        new TileLayer({
          source: new OSM({
            attributions: [] // Disabling default attributions
          }),
          properties: { background: true } // Setting the layer as background
        })
      ],
      view: new View({
        center: initialCenter,
        zoom: initialZoom,
        rotation: 0
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
          label: '⟲' // Custom label for the rotate control
        })
      ])
    });

    // Update the map state observable
    this.mapStateSubject.next(this.map);
    return this.map;
  }

  /**
   * Retrieves the current map instance.
   * @returns The current map instance or null if not initialized.
   */
  getMap(): Map | null {
    return this.mapStateSubject.getValue();
  }

  /**
   * Updates the current map instance and notifies subscribers.
   * @param map - The new map instance.
   */
  updateMap(map: Map): void {
    this.map = map;
    this.mapStateSubject.next(this.map);
  }

  /**
   * Handles the background layer change by removing existing background layers
   * and adding a new one based on the selected value.
   * @param selectedValue - The value representing the desired background layer.
   */
  onBackgroundChange(selectedValue: string): void {
    // Remove all current background TileLayers
    this.map.getLayers().forEach(layer => {
      if (layer instanceof TileLayer && layer.get('background')) {
        this.map.removeLayer(layer);
      }
    });

    // Create the new background layer based on the selected value
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
        return; // Exit if no valid selection
    }

    // Set the Z index to ensure the layer is at the correct display level
    backgroundLayer.setZIndex(-1);
    this.map.addLayer(backgroundLayer);
  }
}
