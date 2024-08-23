import { Injectable } from '@angular/core';
import axios from 'axios';
import { Layer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import GeoJSON from 'ol/format/GeoJSON';
import { from, Observable, BehaviorSubject } from 'rxjs';
import { map, mergeMap, toArray } from 'rxjs/operators';
import Style from 'ol/style/Style';
import { Vector as VectorSource, TileWMS, Source } from 'ol/source';
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
  private originalFeaturesSubject = new BehaviorSubject<Map<string, Feature[]>>(new Map());
  layers$ = this.layersSubject.asObservable();
  originalFeaturesMap$ = this.originalFeaturesSubject.asObservable();
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
    return this.layersSubject.value.some(layer => layer.name === customLayerName);
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
      if (key === '_layerName_$' || key === '_type_$') {
        return true;
      }
      return props1[key] === props2[key];
    });
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
  fetchLayersFromWorkspace(workspace: string): Observable<CustomLayer[]> {
    const url = `${this.geoServerUrl}/rest/workspaces/${workspace}/layers`;

    return from(
      axios.get(url, {
        auth: { username: 'admin', password: 'geoserver' },
      })
    ).pipe(
      map(response => {
        if (response.status !== 200) {
          throw new Error('Failed to fetch layers');
        }
        const layers = response.data.layers.layer;
        if (layers) {
          return layers;
        }
      }),
      mergeMap(layers => from(layers || [])), // Provide a fallback empty array
      mergeMap((layer: any) =>
        from(this.fetchLayerDetails(workspace, layer.href)).pipe(
          map(createdLayer => {
            if (!createdLayer) {
              throw new Error(`Failed to fetch details for layer: ${layer.name}`);
            }
            return createdLayer;
          })
        )
      ),
      toArray()
    );
  }

  // Get the next Z-Index value
  private getNextZIndex(): number {
    return 1000 - this.zIndexCounter++;
  }

  private async fetchLayerDetails(workspace: string, layerUrl: string): Promise<CustomLayer | null> {
    try {
      const response = await axios.get(layerUrl, {
        auth: { username: 'admin', password: 'geoserver' },
      });
      const layerDetails = response.data.layer;
      let layer: Layer | null = null;
      let source: 'WFS' | 'WMS';
      let features: Feature[] = [];

      let style: Style | undefined;
      let inStyle: Style;

      if (layerDetails.type === 'VECTOR') {
        let vectorStyle = this.styleService.loadStyleFromLocalStorage(layerDetails.name);
        if (!vectorStyle) {
          vectorStyle = await this.styleService.getStyleForLayer(layerDetails);
          console.log('fetchedstyleLocStor', vectorStyle);
          this.styleService.saveStyle(layerDetails.name, vectorStyle);
        }
        if (!vectorStyle) {
          vectorStyle = this.styleService.createVectorLayerStyle(layerDetails);
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
          `${this.geoServerUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:${layerDetails.name}&outputFormat=application/json&srsname=EPSG:3857`,
          { auth: { username: 'admin', password: 'geoserver' } }
        );
        features = new GeoJSON().readFeatures(featureResponse.data);
        features.forEach(feature => {
          feature.set('_layerName_$', layerDetails.name);
          feature.set('_type_$', 'Feature')
        });

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
        layer.setZIndex(this.getNextZIndex());
      }
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

  addFeatures(customLayer: CustomLayer): void {
    const currentMap = this.originalFeaturesSubject.getValue();
    if (!currentMap.has(customLayer.id)) {
      currentMap.set(customLayer.id, [...customLayer.features]);
      this.originalFeaturesSubject.next(currentMap); // Emit the new state
    }
  }

  getFeaturesById(layerId: string): Feature[] {
    const currentMap = this.originalFeaturesSubject.getValue();
    return currentMap.get(layerId) || []; // Return the features or an empty array if not found
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
