import { Injectable } from '@angular/core';
import axios from 'axios';
import { Layer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorSource, TileWMS } from 'ol/source';
import { BehaviorSubject } from 'rxjs';
import Style from 'ol/style/Style';
import { StyleService } from './style.service';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';
import { v4 as uuidv4 } from 'uuid';
import { Feature } from 'ol';

@Injectable({
  providedIn: 'root',
})
export class LayersService {
  private geoServerUrl = 'http://localhost:8080/geoserver';
  private layersSubject = new BehaviorSubject<CustomLayer[]>([]);
  layers$ = this.layersSubject.asObservable();

  constructor(private styleService: StyleService) {}

  getLayers(): CustomLayer[] {
    return this.layersSubject.value;
  }

  getLayerById(id: string): CustomLayer | undefined {
    return this.layersSubject.value.find(layer => layer.id === id);
  }
  
  getLayerByName(name: string): CustomLayer | undefined {
    return this.layersSubject.value.find(layer => layer.name === name);
  }

  getLayerByType(type: string): CustomLayer | undefined {
    return this.layersSubject.value.find(layer => layer.type === type);
  }

  getLayerBySource(source: string): CustomLayer | undefined {
    return this.layersSubject.value.find(layer => layer.source === source);
  }

  getLayersByTypeFromList(layers: CustomLayer[], type: string): CustomLayer | undefined {
    return layers.find(layer => layer.type === type);
  }

  getLayersBySourceFromList(layers: CustomLayer[], source: string): CustomLayer | undefined {
    return layers.find(layer => layer.source === source);
  }

  exists(customLayerFeatures: Feature[]): boolean {
    return this.layersSubject.value.some(layer => 
      this.areFeatureArraysEquivalent(layer.features, customLayerFeatures)
    );
  }

  nameExists(customLayerName: string): boolean {
    return this.layersSubject.value.some(layer => layer.name === customLayerName );
  }

  private areFeatureArraysEquivalent(features1: Feature[], features2: Feature[]): boolean {
    if (features1.length !== features2.length) {
      return false;
    }
  
    return features1.every((feature1, index) => {
      const feature2 = features2[index];
      return this.areFeaturesSimilar(feature1, feature2);
    });
  }
  
  private areFeaturesSimilar(feature1: Feature, feature2: Feature): boolean {
    return (
      this.areGeometriesSimilar(feature1.getGeometry(), feature2.getGeometry()) &&
      this.arePropertiesSimilar(feature1.getProperties(), feature2.getProperties())
    );
  }
  
  private areGeometriesSimilar(geom1: any, geom2: any): boolean {
    if (!geom1 || !geom2) {
      return geom1 === geom2;
    }
    // Assuming MultiLineString from your example
    return geom1.type === geom2.type && 
           JSON.stringify(geom1.coordinates) === JSON.stringify(geom2.coordinates);
  }
  
  private arePropertiesSimilar(props1: Object, props2: Object): boolean {
    const keys1 = Object.keys(props1);

    return keys1.every(key => {
      if (key === 'geometry') {
        return this.areGeometriesSimilar(props1[key], props2[key]);
      }
      return props1[key] === props2[key];
    });
  }

  onLayerVisibilityChange(layerId: string): void {
    let customLayer = this.getLayerById(layerId);
    if (customLayer) {
      customLayer.layer.setVisible(!customLayer.layer.getVisible());
    }
  }

  async fetchLayersFromWorkspace(workspace: string): Promise<void> {
    const url = `${this.geoServerUrl}/rest/workspaces/${workspace}/layers`;
    try {
      const response = await axios.get(url, {
        auth: { username: 'admin', password: 'geoserver' }
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch layers');
      }

      const layers = response.data.layers.layer;

      for (const layer of layers) {
        const createdLayer = await this.fetchLayerDetails(layer.href);
        if (createdLayer) {
          this.addLayer(createdLayer);
        }
      }
      this.layers$.subscribe(layers => console.log(layers));
    } catch (error) {
      console.error('Error fetching layers:', error);
      throw error;
    }
  }

  private async fetchLayerDetails(layerUrl: string): Promise<CustomLayer | null> {
    try {
      const response = await axios.get(layerUrl, {
        auth: { username: 'admin', password: 'geoserver' }
      });
      const layerDetails = response.data.layer;
      let layer: Layer | null = null;
      let source: 'WFS' | 'WMS';
      let features: Feature[] = [];
      let style: Style | undefined;
  
      if (layerDetails.type === 'VECTOR') {
        let vectorStyle = this.styleService.loadStyleFromLocalStorage(layerDetails.name);
        if (!vectorStyle) {
          vectorStyle = await this.styleService.getStyleForLayer(layerDetails);
          this.styleService.saveStyle(layerDetails.name, vectorStyle);
        }
        if (!vectorStyle) {
          vectorStyle = this.styleService.createVectorLayerStyle(layerDetails);
        }
  
        const vectorSource = new VectorSource({
          format: new GeoJSON()
        });
  
        layer = new VectorLayer({
          source: vectorSource,
          zIndex: 1,
          style: vectorStyle,
        });
  
        style = vectorStyle; // Store the style
  
        source = 'WFS';
  
        const featureResponse = await axios.get(
          `${this.geoServerUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerDetails.name}&outputFormat=application/json&srsname=EPSG:3857`,
          { auth: { username: 'admin', password: 'geoserver' } }
        );
        features = new GeoJSON().readFeatures(featureResponse.data);
        features.forEach(feature => {
          feature.set('_layerName_$', layerDetails.name);
          feature.set('_type_$', 'Feature')
        });

        vectorSource.addFeatures(features);
      } else if (layerDetails.type === 'RASTER') {
        layer = new TileLayer({
          source: new TileWMS({
            url: `${this.geoServerUrl}/wms`,
            params: { 'LAYERS': layerDetails.name, 'TILED': true },
            serverType: 'geoserver'
          }),
        });
        source = 'WMS';
      }
  
      return { id: uuidv4(), name: layerDetails.name, type: layerDetails.type, layer, source, features, style };
    } catch (error) {
      console.error('Error fetching layer details:', error);
      return null;
    }
  }  

  addLayer(customLayer: CustomLayer): void {
    const currentLayers = this.layersSubject.value;
    this.layersSubject.next([...currentLayers, customLayer]);
  }

  updateLayers(layers: CustomLayer[]): void {
    this.layersSubject.next(layers);
  }

  isLayerLine(features: Feature[]): boolean {
    return features.every(feature => {
      const geometry = feature.getGeometry();
      if (geometry) {
        const geometryType = geometry.getType();
        return geometryType === 'LineString' || geometryType === 'MultiLineString';
      }
      return false;
    });
  }
}
