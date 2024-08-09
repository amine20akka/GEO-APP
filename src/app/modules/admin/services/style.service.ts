import { Injectable } from '@angular/core';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';
import VectorLayer from 'ol/layer/Vector';
import { Style, Fill, Stroke } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import ImageStyle from 'ol/style/Image';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StyleService {

  private stylesSubject = new BehaviorSubject<{ [layerName: string]: Style }>({});
  styles$ = this.stylesSubject.asObservable();

  constructor() { 
    this.loadStylesFromLocalStorage();
  }

  /**
   * Returns a legend style for display in the UI.
   * @param style The OpenLayers style object.
   * @returns An object containing CSS properties for the legend.
   */
  getLegendStyle(style: any): any {
    if (style instanceof Style) {
      const fill = style.getFill();
      const image = style.getImage();

      if (fill) {
        return { 'background-color': fill.getColor() };
      } else if (image && image instanceof CircleStyle) {
        const circleFill = image.getFill();
        return {
          'background-color': circleFill.getColor(),
          'border-radius': '50%'
        };
      }
    }
    return {};
  }

  /**
   * Loads styles from local storage with a specific prefix and updates the observable.
   */
  loadStylesFromLocalStorage(): void {
    const styles: { [layerName: string]: Style } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('style_')) {
        const styleJson = localStorage.getItem(key);
        if (styleJson) {
          const layerName = key.replace('style_', '');
          styles[layerName] = this.jsonToStyle(JSON.parse(styleJson));
        }
      }
    }
    this.stylesSubject.next(styles);
  }

  /**
   * Saves a style to local storage with a specific prefix and updates the observable.
   * @param layerName The name of the layer.
   * @param style The OpenLayers style object.
   */
  saveStyle(layerName: string, style: Style): void {
    this.saveStyleToLocalStorage(layerName, style);

    const currentStyles = this.stylesSubject.getValue();
    currentStyles[layerName] = style;

    this.stylesSubject.next(currentStyles);
  }

  /**
   * Removes a style from local storage and updates the observable.
   * @param layerName The name of the layer.
   */
  removeStyle(layerName: string): void {
    localStorage.removeItem(`style_${layerName}`);

    const currentStyles = this.stylesSubject.getValue();
    delete currentStyles[layerName];

    this.stylesSubject.next(currentStyles);
  }

  /**
   * Extracts a style from an SLD XML string.
   * @param sldXml The SLD XML string.
   * @returns The OpenLayers style object.
   */
  extractStyleFromSLD(sldXml: string): Style {
    const parser = new DOMParser();
    const sldDoc = parser.parseFromString(sldXml, 'text/xml');
    const namedLayers = sldDoc.querySelectorAll('NamedLayer');
    let targetNamedLayer: Element | null = null;

    namedLayers.forEach(namedLayer => {
      const nameElement = namedLayer.querySelector('Name');
      if (nameElement) {
        targetNamedLayer = namedLayer;
      }
    });

    const rules = targetNamedLayer?.querySelectorAll('Rule');
    const style = new Style();

    rules?.forEach(rule => {
      const symbolizer = rule.querySelector('PolygonSymbolizer, LineSymbolizer, PointSymbolizer');
      if (symbolizer) {
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
      }
    });

    return style;
  }

  /**
   * Converts a hexadecimal color to RGB format.
   * @param hex The hexadecimal color string.
   * @returns The RGB color string.
   */
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
      `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` :
      '0,0,0';
  }

  /**
   * Fetches an SLD from GeoServer and returns it as an XML string.
   * @param layerDetails The details of the layer to fetch the SLD for.
   * @returns The SLD XML string.
   */
  async fetchSLDFromGeoServer(layerDetails: any): Promise<string> {
    const styleUrl = layerDetails.defaultStyle.href.replace('.json', '.sld');
    const credentials = btoa(`admin:geoserver`);

    try {
      const response = await fetch(styleUrl, {
        headers: { 'Authorization': `Basic ${credentials}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error fetching SLD:', error);
      throw error;
    }
  }

  /**
   * Gets a style for a given layer by fetching the SLD from GeoServer and extracting the style.
   * @param layerDetails The details of the layer.
   * @returns The OpenLayers style object.
   */
  async getStyleForLayer(layerDetails: any): Promise<Style> {
    try {
      const sldXml = await this.fetchSLDFromGeoServer(layerDetails);
      return this.extractStyleFromSLD(sldXml);
    } catch (error) {
      console.error('Error getting style for layer:', error);
      return null;
    }
  }

  /**
   * Creates a new vector layer style with a unique color based on the layer name.
   * @param layerDetails The details of the layer.
   * @returns The OpenLayers style object.
   */
  createVectorLayerStyle(layerDetails: any): Style {
    const color = this.stringToColor(layerDetails.name);
    return new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#fff', width: 1 }),
      }),
      stroke: new Stroke({ color, width: 2 }),
      fill: new Fill({ color: color + '33' }) // Add some transparency
    });
  }

  /**
   * Converts a string to a unique color.
   * @param str The input string.
   * @returns The corresponding color string.
   */
  stringToColor(str: string): string {
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

  /**
   * Saves a style to local storage.
   * @param layerName The name of the layer.
   * @param style The OpenLayers style object.
   */
  saveStyleToLocalStorage(layerName: string, style: Style): void {
    const styleJson = this.styleToJson(style);
    localStorage.setItem(`style_${layerName}`, JSON.stringify(styleJson));
  }

  /**
   * Loads a style from local storage.
   * @param layerName The name of the layer.
   * @returns The OpenLayers style object or null if not found.
   */
  loadStyleFromLocalStorage(layerName: string): Style | null {
    const styleJson = localStorage.getItem(`style_${layerName}`);
    return styleJson ? this.jsonToStyle(JSON.parse(styleJson)) : null;
  }

  /**
   * Converts an OpenLayers style object to a JSON representation.
   * @param style The OpenLayers style object.
   * @returns The JSON representation of the style.
   */
  styleToJson(style: Style): any {
    const fill = style.getFill();
    const stroke = style.getStroke();
    const image = style.getImage();

    return {
      fill: fill ? fill.getColor() : null,
      stroke: stroke ? {
        color: stroke.getColor(),
        width: stroke.getWidth()
      } : null,
      image: image instanceof CircleStyle ? {
        radius: image.getRadius(),
        fill: image.getFill() ? image.getFill().getColor() : null,
        stroke: image.getStroke() ? {
          color: image.getStroke().getColor(),
          width: image.getStroke().getWidth()
        } : null
      } : null
    };
  }

  /**
   * Converts a JSON representation of a style back to an OpenLayers style object.
   * @param json The JSON representation of the style.
   * @returns The OpenLayers style object.
   */
  jsonToStyle(json: any): Style {
    return new Style({
      fill: json.fill ? new Fill({ color: json.fill }) : undefined,
      stroke: json.stroke ? new Stroke({ color: json.stroke.color, width: json.stroke.width }) : undefined,
      image: json.image ? new CircleStyle({
        radius: json.image.radius,
        fill: json.image.fill ? new Fill({ color: json.image.fill }) : undefined,
        stroke: json.image.stroke ? new Stroke({ color: json.image.stroke.color, width: json.image.stroke.width }) : undefined,
      }) : undefined
    });
  }
}
