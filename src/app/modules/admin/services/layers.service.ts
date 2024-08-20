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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GeometryCollection, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import CircleStyle from 'ol/style/Circle';

@Injectable({
  providedIn: 'root',
})
export class LayersService {
  private geoServerUrl = 'http://localhost:8080/geoserver';
  
  // Using BehaviorSubject to manage layers state
  private layersSubject = new BehaviorSubject<CustomLayer[]>([]);
  layers$ = this.layersSubject.asObservable();
  
  
  private zIndexCounter = 0;

  constructor(private styleService: StyleService, private _mapService: MapService ,   private sanitizer: DomSanitizer
  ) {}

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
  toggleLayerVisibility(layerId: string): void {
    const updatedLayers = this.layersSubject.value.map(layer => {
      if (layer.id === layerId) {
        const newVisibility = !layer.layer.getVisible();
        layer.layer.setVisible(newVisibility);
        return { ...layer, visible: newVisibility };
      }
      return layer;
    });
    this.layersSubject.next(updatedLayers);

    // Update the main map
    const map = this._mapService.getMap();
    if (map) {
      const layerToToggle = map.getLayers().getArray().find(l => l.get('id') === layerId);
      if (layerToToggle) {
        layerToToggle.setVisible(!layerToToggle.getVisible());
      }
    }
  }
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
          console.log('fetchedstyleLocStor', vectorStyle);
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
          style: vectorStyle ,
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
      } 
      else if (layerDetails.type === 'RASTER') {
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

  // Add and update a new layer to the state
  addLayer(customLayer: CustomLayer): void {
    const currentLayers = this.layersSubject.value;
    this.layersSubject.next([...currentLayers, customLayer]);
  }

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
  //legende
  getOpenLayersLegend(layer: CustomLayer): SafeHtml {
            
    if (layer.source === 'WFS') {
      const geometryType = this.getGeometryType(layer);
      console.log('Geometry type:', geometryType);

      let fillColor = 'rgba(0,0,0,0)';
      let strokeColor = '#000000';
      let strokeWidth = 1;

      if (layer.style instanceof Style) {
        const fill = layer.style.getFill();
        const stroke = layer.style.getStroke();
        const image = layer.style.getImage();

        console.log('Style components:', { fill, stroke, image });

        if (fill) {
          fillColor = fill.getColor() as string;
          console.log('Fill color:', fillColor);
        }
        if (stroke) {
          strokeColor = stroke.getColor() as string;
          strokeWidth = stroke.getWidth() || 1;
          console.log('Stroke color:', strokeColor, 'width:', strokeWidth);
        }
        if (image instanceof CircleStyle) {
          const imageFill = image.getFill();
          const imageStroke = image.getStroke();
          if (imageFill) {
            fillColor = imageFill.getColor() as string;
          }
          if (imageStroke) {
            strokeColor = imageStroke.getColor() as string;
            strokeWidth = imageStroke.getWidth() || 1;
          }
          console.log('Circle style:', { fillColor, strokeColor, strokeWidth });
        }
      }

      // Générer un SVG simple pour la légende
      const svgLegend = this.generateSvgLegend(geometryType, fillColor, strokeColor, strokeWidth);
      console.log('Generated SVG legend:', svgLegend);

      return this.sanitizer.bypassSecurityTrustHtml(svgLegend);
    } else {
      console.log('Layer is not WFS');
    }

    console.log('Returning default icon for layer');
    return this.sanitizer.bypassSecurityTrustHtml(`<mat-icon [fontIcon]="getGeometryIcon(getGeometryType(layer))"></mat-icon>`);
  }

  generateSvgLegend(geometryType: string, fillColor: string, strokeColor: string, strokeWidth: number): string {
    const size = 20;
    let svg = '';

    switch (geometryType) {
      case 'Point':
        svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                 <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
               </svg>`;
        break;
      case 'LineString':
      case 'MultiLineString':
        svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                 <line x1="0" y1="${size/2}" x2="${size}" y2="${size/2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
               </svg>`;
        break;
      case 'Polygon':
      case 'MultiPolygon':
        svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                 <rect x="2" y="2" width="${size-4}" height="${size-4}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
               </svg>`;
        break;
      default:
        svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                 <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14">${geometryType[0]}</text>
               </svg>`;
    }

    return svg;
  }
  getGeometryType(layer: CustomLayer): string {
    if (layer && layer.layer instanceof VectorLayer) {
        const source = layer.layer.getSource();
        const features = source.getFeatures();

        if (features.length > 0) {
            const geometry = features[0].getGeometry();
            if (geometry instanceof Point) return 'Point';
            if (geometry instanceof MultiPoint) return 'MultiPoint';
            if (geometry instanceof LineString) return 'LineString';
            if (geometry instanceof MultiLineString) return 'MultiLineString';
            if (geometry instanceof Polygon) return 'Polygon';
            if (geometry instanceof MultiPolygon) return 'MultiPolygon';
            if (geometry instanceof GeometryCollection) return 'GeometryCollection';

            return geometry ? geometry.getType() : 'Unknown';
        } else {
            const style = layer.layer.getStyle();
            if (typeof style === 'function') {
                const dummyFeature = new Feature();
                const appliedStyle = style(dummyFeature, 1);
                if (appliedStyle instanceof Style) {
                    if (appliedStyle.getImage()) return 'Point';
                    if (appliedStyle.getStroke() && !appliedStyle.getFill()) return 'LineString';
                    if (appliedStyle.getFill()) return 'Polygon';
                }
            }
        }
    }
    return 'Unknown';
}
}
