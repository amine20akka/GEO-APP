import { Injectable } from '@angular/core';
import axios from 'axios';
import { Layer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorSource, TileWMS, Source } from 'ol/source';
import { BehaviorSubject } from 'rxjs';
import { FlatStyleLike } from 'ol/style/flat';
import Style, { StyleLike } from 'ol/style/Style';
import { StyleService } from './style.service';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';
import { v4 as uuidv4 } from 'uuid';
import { Feature } from 'ol';
import { MapService } from './map.service';

@Injectable({
  providedIn: 'root',
})
export class LayersService {
  private geoServerUrl = 'http://localhost:8080/geoserver';
  
  // Using BehaviorSubject to manage layers state
  private layersSubject = new BehaviorSubject<CustomLayer[]>([]);
  
  // Exposing an observable to allow components to subscribe to layer changes
  layers$ = this.layersSubject.asObservable();
  
  private zIndexCounter = 0;

  constructor(private styleService: StyleService, private _mapService: MapService) {}

  // Get all layers
  getLayers(): CustomLayer[] {
    return this.layersSubject.value;
  }

  // Get a layer by its ID
  getLayerById(id: string): CustomLayer | undefined {
    return this.layersSubject.value.find(layer => layer.id === id);
  }

  // Get a layer by its name
  getLayerByName(name: string): CustomLayer | undefined {
    return this.layersSubject.value.find(layer => layer.name === name);
  }

  // Check if a layer already exists in the state
  exists(customLayer: CustomLayer): boolean {
    return this.layersSubject.value.some(layer => layer.name === customLayer.name && layer.source === customLayer.source);
  }

  // Toggle the visibility of a layer by its ID
  onLayerVisibilityChange(layerId: string): void {
    const customLayer = this.getLayerById(layerId);
    if (customLayer) {
      customLayer.layer.setVisible(!customLayer.layer.getVisible());
    }
  }

  // Fetch layers from GeoServer workspace and add them to the state
   async fetchLayersFromWorkspace(workspace: string): Promise<void> {
    const url = `${this.geoServerUrl}/rest/workspaces/${workspace}/layers`;
    try {
      const response = await axios.get(url, {
        auth: { username: 'admin', password: 'geoserver' },
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch layers');
      }

      const layers = response.data.layers.layer;

      for (const layer of layers) {
        const createdLayer = await this.fetchLayerDetails(layer.href);
        if (createdLayer) {
          this.addLayer(createdLayer); // Add each layer to the state
        }
      }

      // Log the current state of layers
      this.layers$.subscribe(layers => console.log(layers));
    } catch (error) {
      console.error('Error fetching layers:', error);
      throw error;
    }
  }

  // Get the next Z-Index value
  private getNextZIndex(): number {
    return 1000 - this.zIndexCounter++;
  }

  // Fetch layer details and create a CustomLayer object
  private async fetchLayerDetails(layerUrl: string): Promise<CustomLayer | null> {
    try {
      const response = await axios.get(layerUrl, {
        auth: { username: 'admin', password: 'geoserver' },
      });
      const layerDetails = response.data.layer;
      let layer: Layer | null = null;
      let source: 'WFS' | 'WMS';
      let features: Feature[] = [];
      let style: StyleLike | undefined;
      let inStyle: Style;

      if (layerDetails.type === 'VECTOR') {
        let vectorStyle = this.styleService.loadStyleFromLocalStorage(layerDetails.name);
        if (!vectorStyle) {
          vectorStyle = await this.styleService.getStyleForLayer(layerDetails);
          console.log('fetchedstyle', vectorStyle);
          this.styleService.saveStyle(layerDetails.name, vectorStyle);
          if (!vectorStyle) {
            vectorStyle = this.styleService.createVectorLayerStyle(layerDetails);
          }
        }

        const vectorSource = new VectorSource({
          format: new GeoJSON(),
        });

        layer = new VectorLayer({
          source: vectorSource,
          zIndex: 1,
          style: vectorStyle as Style | StyleLike | FlatStyleLike,
        });

        style = vectorStyle; // Store the style
        inStyle = vectorStyle;
        source = 'WFS';

        const featureResponse = await axios.get(
          `${this.geoServerUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerDetails.name}&outputFormat=application/json&srsname=EPSG:3857`,
          { auth: { username: 'admin', password: 'geoserver' } }
        );
        features = new GeoJSON().readFeatures(featureResponse.data);
        vectorSource.addFeatures(features);
      } else if (layerDetails.type === 'RASTER') {
        layer = new TileLayer({
          source: new TileWMS({
            url: `${this.geoServerUrl}/wms`,
            params: { 'LAYERS': layerDetails.name, 'TILED': true },
            serverType: 'geoserver',
          }),
        });
        source = 'WMS';
      }
      if (layer) {
        layer.set('name', layerDetails.name);
        layer.setVisible(false);
        layer.setZIndex(this.getNextZIndex());
        console.log(`Set Z-Index to ${layer.getZIndex()} for layer ${layer.get('name')}`);
      }
      console.log('instyle', inStyle);
      return { id: uuidv4(), name: layerDetails.name, type: layerDetails.type, layer, source, features, style, inStyle };
    } catch (error) {
      console.error('Error fetching layer details:', error);
      return null;
    }
  }

  // Add a new layer to the state
  addLayer(customLayer: CustomLayer): void {
    const currentLayers = this.layersSubject.value;
    this.layersSubject.next([...currentLayers, customLayer]);
  }

  // Update the layers in the state
  updateLayers(layers: CustomLayer[]): void {
    this.layersSubject.next(layers);
  }

  // Update the order of layers and adjust their Z-Index
  updateLayerOrder(newOrder: { name: string }[]): void {
    const map = this._mapService.getMap();
    if (!map) return;

    const layerGroup = map.getLayers();
    const layers = layerGroup.getArray();

    // Update zIndex for each layer based on its new position
    newOrder.forEach((item, index) => {
      const layer = layers.find(l => l.get('name') === item.name) as Layer<Source>;
      if (layer) {
        const newZIndex = 1000 - index;
        layer.setZIndex(newZIndex);
        console.log(`Updated Z-Index to ${newZIndex} for layer ${item.name}`);
      }
    });

    // Sort the layer group based on the new zIndex values
    layerGroup.getArray().sort((a, b) => (b.getZIndex() || 0) - (a.getZIndex() || 0));

    map.render();

    // Update the BehaviorSubject with the new layer order
    const updatedLayers: CustomLayer[] = newOrder.map(item => {
      const layer = this.getLayerByName(item.name);
      if (layer) {
        return {
          ...layer,
          layer: layer.layer as Layer<Source>,
        };
      }
      return null;
    }).filter((layer): layer is CustomLayer => layer !== null);

    this.layersSubject.next(updatedLayers);

    console.log('Updated layer order:', updatedLayers.map(layer => ({
      name: layer.name,
      zIndex: layer.layer.getZIndex(),
    })));
  }
}
