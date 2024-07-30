import { Injectable } from '@angular/core';
import axios from 'axios';
import { Layer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorSource, TileWMS } from 'ol/source';
import { BehaviorSubject } from 'rxjs';
import { FlatStyleLike } from 'ol/style/flat';
import { StyleLike } from 'ol/style/Style';

@Injectable({
  providedIn: 'root',
})
export class LayersService {
  private geoServerUrl = 'http://localhost:8080/geoserver';
  private layersSubject = new BehaviorSubject<Layer[]>([]);
  layers$ = this.layersSubject.asObservable();

  constructor() {}

  async fetchLayersFromWorkspace(workspace: string): Promise<Layer[]> {
    const url = `${this.geoServerUrl}/rest/workspaces/${workspace}/layers`;
    return axios.get(url, {
      auth: {
        username: 'admin',
        password: 'geoserver'
      }
    })
    .then(async response => {
      if (response.status !== 200) {
        throw new Error('Failed to fetch layers');
      }
      const layers = response.data.layers.layer;
      const fetchedLayers: Layer[] = [];
      for (const layer of layers) {
        const createdLayer = await this.fetchLayerDetails(layer.href);
        // console.log(createdLayer);
        if (createdLayer) {
          fetchedLayers.push(createdLayer);
        }
      }
      this.layersSubject.next(fetchedLayers);
      console.log(fetchedLayers);
      return fetchedLayers;
    })
    .catch(error => {
      console.error('Error fetching layers:', error);
      throw error;
    });
  }

  private async fetchLayerDetails(layerUrl: string): Promise<Layer | null> {
    try {
      const response = await axios.get(layerUrl, {
        auth: {
          username: 'admin',
          password: 'geoserver'
        }
      });
      const layerDetails = response.data.layer;
      let layer: Layer | null = null;
      
      if (layerDetails.type === 'VECTOR') {
        // Fetch the style for the layer
        let vectorStyle = await this.getStyleForLayer(layerDetails);
        // If no style found for the layer , apply a random one
        if (!vectorStyle) {
          vectorStyle = this.createVectorLayerStyle(layerDetails);
        }

        layer = new VectorLayer({
          source: new VectorSource({
            url: `${this.geoServerUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerDetails.name}&outputFormat=application/json`,
            format: new GeoJSON(),
            loader: async (extent, resolution, projection) => {
              const response = await axios.get(
                `${this.geoServerUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerDetails.name}&outputFormat=application/json&srsname=EPSG:3857`,
                {
                  auth: {
                    username: 'admin',
                    password: 'geoserver'
                  }
                }
              );
              const features = new GeoJSON().readFeatures(response.data);
              (layer as VectorLayer<any>).getSource().addFeatures(features);
            }
          }),
          zIndex: 1,
          style: vectorStyle as StyleLike | FlatStyleLike,
        });
      } else if (layerDetails.type === 'RASTER') {
        layer = new TileLayer({
          source: new TileWMS({
            url: `${this.geoServerUrl}/wms`,
            params: {
              'LAYERS': layerDetails.name,
              'TILED': true
            },
            serverType: 'geoserver'
          })
        });
      }
  
      if (layer) {
        layer.set('name', layerDetails.name);
        layer.setVisible(false); // Default to visible
      }
  
      return layer;
    } catch (error) {
      console.error('Error fetching layer details:', error);
      return null;
    }
  }  

  updateLayers(layers: Layer[]): void {
    this.layersSubject.next(layers);
  }

  private extractStyleFromSLD(sldXml: string, layerName: string): Style | Style[] {
    const parser = new DOMParser();
    const sldDoc = parser.parseFromString(sldXml, 'text/xml');
  
    // Find the NamedLayer element corresponding to the layer name
    const namedLayers = sldDoc.querySelectorAll('NamedLayer');
    let targetNamedLayer: Element | null = null;
  
    namedLayers.forEach(namedLayer => {
      const nameElement = namedLayer.querySelector('Name');
      if (nameElement && nameElement.textContent === layerName) {
        targetNamedLayer = namedLayer;
      }
    });
  
    if (!targetNamedLayer) {
      // console.error(`Layer "${layerName}" not found in SLD`);
      return null;
    }
  
    // Find the style rules within the NamedLayer
    const rules = targetNamedLayer.querySelectorAll('Rule');
    const styles: Style[] = [];
  
    rules.forEach(rule => {
      const symbolizer = rule.querySelector('PolygonSymbolizer, LineSymbolizer, PointSymbolizer');
      if (symbolizer) {
        const style = new Style();
  
        // Extract the fill (Fill)
        const fillElement = symbolizer.querySelector('Fill');
        if (fillElement) {
          const fillColor = fillElement.querySelector('CssParameter[name="fill"]')?.textContent;
          const fillOpacity = fillElement.querySelector('CssParameter[name="fill-opacity"]')?.textContent;
          if (fillColor) {
            style.setFill(new Fill({
              color: fillOpacity ? `rgba(${this.hexToRgb(fillColor)},${fillOpacity})` : fillColor
            }));
          }
        }
  
        // Extract the stroke (Stroke)
        const strokeElement = symbolizer.querySelector('Stroke');
        if (strokeElement) {
          const strokeColor = strokeElement.querySelector('CssParameter[name="stroke"]')?.textContent;
          const strokeWidth = strokeElement.querySelector('CssParameter[name="stroke-width"]')?.textContent;
          if (strokeColor) {
            style.setStroke(new Stroke({
              color: strokeColor,
              width: strokeWidth ? parseFloat(strokeWidth) : undefined
            }));
          }
        }
  
        // Extract the symbol for points
        if (symbolizer.tagName === 'PointSymbolizer') {
          const graphicElement = symbolizer.querySelector('Graphic');
          if (graphicElement) {
            const size = graphicElement.querySelector('Size')?.textContent;
            style.setImage(new CircleStyle({
              radius: size ? parseFloat(size) / 2 : 5,
              fill: style.getFill(),
              stroke: style.getStroke()
            }));
          }
        }
  
        styles.push(style);
      }
    });
  
    return styles.length === 1 ? styles[0] : styles;
  }
  
  // Fonction utilitaire pour convertir une couleur hexadécimale en RGB
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : 
      '0,0,0';
  }

  private async fetchSLDFromGeoServer(layerDetails: any): Promise<string> {
    const styleUrl = layerDetails.defaultStyle.href.replace('.json', '.sld');
    const url = styleUrl;
  
    // Create base64 encoded credentials
    const credentials = btoa(`admin:geoserver`);
  
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const sldXml = await response.text();
      return sldXml;
    } catch (error) {
      console.error('Error fetching SLD:', error);
      throw error;
    }
  }  

  private async getStyleForLayer(layerDetails: any): Promise<Style | Style[]> {
    try {
      const sldXml = await this.fetchSLDFromGeoServer(layerDetails);
      return this.extractStyleFromSLD(sldXml, layerDetails.name);
    } catch (error) {
      console.error('Error getting style for layer:', error);
      return null;
    }
  }

  private createVectorLayerStyle(layerDetails: any): Style {
    // Example: Generate a unique color based on the layer name
    const color = this.stringToColor(layerDetails.name);
  
    return new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({
          color: color,
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 1,
        }),
      }),
      stroke: new Stroke({
        color: color,
        width: 2
      }),
      fill: new Fill({
        color: color + '33' // Add some transparency
      })
    });
  }
  
  private stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  }
  
}
