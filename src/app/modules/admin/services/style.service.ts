import { Injectable } from '@angular/core';
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

  addStyle(layerName: string, style: Style): void {
    const currentStyles = this.stylesSubject.value;
    this.stylesSubject.next({
      ...currentStyles,
      [layerName]: style
    });
  }

  // Charger les styles du local storage avec un préfixe spécifique
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

  // Enregistrer un style dans le local storage avec un préfixe spécifique
  saveStyle(layerName: string, style: Style): void {
    this.saveStyleToLocalStorage(layerName, style);
    this.addStyle(layerName,style);
  }

  // Supprimer un style du local storage et mettre à jour l'observable
  removeStyle(layerName: string): void {
    localStorage.removeItem(`style_${layerName}`);

    const currentStyles = this.stylesSubject.getValue();
    delete currentStyles[layerName];

    this.stylesSubject.next(currentStyles);
  }

  extractStyleFromSLD(sldXml: string): Style {
    const parser = new DOMParser();
    const sldDoc = parser.parseFromString(sldXml, 'text/xml');

    // Find the NamedLayer element corresponding to the layer name
    const namedLayers = sldDoc.querySelectorAll('NamedLayer');
    let targetNamedLayer: Element | null = null;

    namedLayers.forEach(namedLayer => {
      const nameElement = namedLayer.querySelector('Name');
      if (nameElement) {
        targetNamedLayer = namedLayer;
      }
    });

    // Find the style rules within the NamedLayer
    const rules = targetNamedLayer.querySelectorAll('Rule');
    const style = new Style();

    rules.forEach(rule => {
      const symbolizer = rule.querySelector('PolygonSymbolizer, LineSymbolizer, PointSymbolizer');
      if (symbolizer) {
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
      }
    });
    return style;
  }

  // Fonction utilitaire pour convertir une couleur hexadécimale en RGB
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
      `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` :
      '0,0,0';
  }

  async fetchSLDFromGeoServer(layerDetails: any): Promise<string> {
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

  async getStyleForLayer(layerDetails: any): Promise<Style> {
    try {
      const sldXml = await this.fetchSLDFromGeoServer(layerDetails);
      return this.extractStyleFromSLD(sldXml);
    } catch (error) {
      console.error('Error getting style for layer:', error);
      return null;
    }
  }

  createVectorLayerStyle(layerDetails: any): Style {
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

  // Save style to local storage
  saveStyleToLocalStorage(layerName: string, style: Style): void {
    const styleJson = this.styleToJson(style); // Convert style to a serializable format
    localStorage.setItem(`style_${layerName}`, JSON.stringify(styleJson));
  }

  // Load style from local storage
  loadStyleFromLocalStorage(layerName: string): Style | null {
    const styleJson = localStorage.getItem(`style_${layerName}`);
    return styleJson ? this.jsonToStyle(JSON.parse(styleJson)) : null; // Convert back to style from JSON
  }

  // Convert OpenLayers Style to JSON
  private styleToJson(style: Style): any {
    const fill = style.getFill();
    const stroke = style.getStroke();
    const image = style.getImage();

    let imageJson = null;
    if (image instanceof CircleStyle) {
      imageJson = {
        radius: image.getRadius(),
        fill: image.getFill() ? image.getFill().getColor() : null,
      };
    }

    return {
      fill: fill ? { color: fill.getColor() } : null,
      stroke: stroke ? { color: stroke.getColor(), width: stroke.getWidth() } : null,
      image: imageJson,
      zIndex: style.getZIndex() !== undefined && style.getZIndex() !== null ? style.getZIndex() : 0
    };
  }

  // Convert JSON to OpenLayers Style
  private jsonToStyle(json: any): Style {
    const fill = json.fill ? new Fill({ color: json.fill.color }) : null;
    const stroke = json.stroke ? new Stroke({ color: json.stroke.color, width: json.stroke.width }) : null;

    let image: ImageStyle | null = null;
    if (json.image) {
      if (json.image.radius !== undefined) {
        image = new CircleStyle({
          radius: json.image.radius,
          fill: new Fill({ color: json.image.fill || null }),
        });
      }

      return new Style({
        fill,
        stroke,
        image,
        zIndex: json.zIndex !== undefined && json.zIndex !== null ? json.zIndex : 0
      });
    }
  }
}