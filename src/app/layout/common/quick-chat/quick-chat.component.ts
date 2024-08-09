import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DatePipe, NgClass, NgTemplateOutlet, PercentPipe } from '@angular/common';
import {
    Component,
    ElementRef,
    HostBinding,
    OnDestroy,
    OnInit,
    Input,
    Renderer2,
    ViewEncapsulation,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FuseScrollbarDirective } from '@fuse/directives/scrollbar';
import { LayersService } from 'app/modules/admin/services/layers.service';
import { Subject, Subscription } from 'rxjs';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion'; // Ensure this import is present

import { ColorPieChartComponentComponent } from '../color-pie-chart-component/color-pie-chart-component.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomLayer } from './quick-chat.types';
import { FilterLayersPipe } from 'app/modules/admin/filter-layers-pipe/filter-layers.pipe';
import { ImportService } from '../import/import.service';
import { StyleService } from 'app/modules/admin/services/style.service';
import { MapService } from 'app/modules/admin/services/map.service';
import { Circle, Fill, Icon, RegularShape, Stroke, Style } from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import { GeometryCollection, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import { StyleFunction, StyleLike } from 'ol/style/Style';
import { Feature } from 'ol';
import ImageStyle from 'ol/style/Image';

import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';

@Component({
    selector: 'quick-chat',
    templateUrl: './quick-chat.component.html',
    styleUrls: ['./quick-chat.component.scss'],
    encapsulation: ViewEncapsulation.None,
    exportAs: 'quickChat',
    standalone: true,
    imports: [
        NgClass,
        MatIconModule,
        MatButtonModule,
        FuseScrollbarDirective,
        NgTemplateOutlet,
        MatFormFieldModule,
        MatInputModule,
        TextFieldModule,
        DatePipe,
        ColorPieChartComponentComponent,
        FormsModule,
        PercentPipe,
        MatCardModule,
        MatListModule,
        MatTabsModule,
        MatSliderModule,
        MatTooltipModule,
        FilterLayersPipe,
        MatCardModule,
    MatExpansionModule,
    MatSelectModule,
    CommonModule
    
    
    
    
    ],
})
export class QuickChatComponent implements OnInit, OnDestroy {
    @Input() tooltip: string;
    opened: boolean = false;
    private layersSubscription: Subscription;
    layers: CustomLayer[];
    selectedLayer: CustomLayer;
    clicked: boolean = false;
    draggedOverIndex: number | null = null;
    activeTab: 'color' | 'opacity' = 'color';
    isDragging: boolean = false;
    isOverDelete: boolean = false;
    panelOpen = false;
    availableSymbols = [
        { value: 'circle', label: 'Circle', icon: 'circle' },
        { value: 'square', label: 'Square', icon: 'square' },
        { value: 'pin', label: 'Pin', icon: 'place' },
        { value: 'triangle', label: 'Triangle', icon: 'change_history' },
        // { value: 'star', label: 'Star', icon: 'star' },
        // { value: 'home', label: 'Home', icon: 'home' },
        // { value: 'tree', label: 'Tree', icon: 'park' },
        // { value: 'car', label: 'Car', icon: 'directions_car' },
    ];
    private miniMap: Map | null = null;

    selectedSymbol: string = 'circle';
    symbolSize: number = 24;
    symbolColor: string = '#000000';
    symbolOpacity: number = 1;
    private _mutationObserver: MutationObserver;
    private _scrollStrategy: ScrollStrategy = this._scrollStrategyOptions.block();
    private _overlay: HTMLElement;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _elementRef: ElementRef,
        private _renderer2: Renderer2,
        private _scrollStrategyOptions: ScrollStrategyOptions,
        private _layersService: LayersService,
        private _importService: ImportService,
        private _styleService: StyleService,
        private _mapService : MapService
    ) { }

    @HostBinding('class') get classList(): any {
        return {
            'quick-chat-opened': this.opened,
        };
    }

   
    ngOnInit(): void {
        this.initMiniMap();

        
        this.layersSubscription = this._layersService.layers$.subscribe(layers => {
            this.layers = layers;
        });

        
       
    }
    ngAfterViewInit() {
        console.log('ngAfterViewInit called');
    // Delay the initialization to ensure the view is rendered
    setTimeout(() => {
      this.initMiniMap();
    }, 1000); // Wait for 1 second
      }
    ngOnDestroy(): void {
        this.layersSubscription.unsubscribe();
        this._mutationObserver.disconnect();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        if (this.miniMap) {
            this.miniMap.setTarget(undefined);
          }
    }
    
    onLayerVisibilityChange(layerId: string): void {
        this._layersService.onLayerVisibilityChange(layerId);
    }

   
    openFileInput() : void {
        this._importService.openFileInput();
    }
    
    open(): void {
        if (this.opened) {
            return;
        }
        this._toggleOpened(true);
    }

    close(): void {
        if (!this.opened) {
            return;
        }
        this._toggleOpened(false);
    }

    toggle(): void {
        if (this.opened) {
            this.close();
        } else {
            this.open();
        }
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    private _showOverlay(): void {
        this._hideOverlay();
        this._overlay = this._renderer2.createElement('div');
        if (!this._overlay) {
            return;
        }
        this._overlay.classList.add('quick-chat-overlay');
        this._renderer2.appendChild(
            this._elementRef.nativeElement.parentElement,
            this._overlay
        );
        this._scrollStrategy.enable();
        this._overlay.addEventListener('click', () => {
            this.close();
        });
    }

    private _hideOverlay(): void {
        if (!this._overlay) {
            return;
        }
        if (this._overlay) {
            this._overlay.parentNode.removeChild(this._overlay);
            this._overlay = null;
        }
        this._scrollStrategy.disable();
    }

    private _toggleOpened(open: boolean): void {
        this.opened = open;
        if (open) {
            this._showOverlay();
        } else {
            this._hideOverlay();
        }
    }


    //mini map
    private initMiniMap() {
        console.log('Initializing mini map');
        const mapElement = document.getElementById('mini-map');
        if (!mapElement) {
          console.error('Could not find mini-map element');
          return;
        }
    
        console.log('Map element found:', mapElement);
        console.log('Map element dimensions:', mapElement.clientWidth, mapElement.clientHeight);
    
        this.miniMap = this._mapService.initializeMap('mini-map');
    
        // Set the background to Topographic
        this._mapService.onBackgroundChange('Topographic');
    
        // Remove controls for a cleaner look
        this.miniMap.getControls().clear();
    
        console.log('Mini map created:', this.miniMap);
    
        // Force a map render
        setTimeout(() => {
          if (this.miniMap) {
            this.miniMap.updateSize();
            console.log('Map size updated');
          }
        }, 100);
      }
    
     // Method to format the layer name
  formatLayerName(name: string): string {
    const parts = name.split('_');
    if (parts.length > 1) {
      // If the name has multiple parts, return the last part capitalized
      return this.capitalize(parts[parts.length - 1]);
    } else {
      // If it's a single word, just capitalize it
      return this.capitalize(name);
    }
  }

  // Helper method to capitalize a string
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }


    //draggabke list
    onDragStart(event: DragEvent, index: number) {
        event.dataTransfer.setData('text/plain', index.toString());
        this.draggedOverIndex = null;
        this.isDragging = true;
      }
    
    onDragEnd(event: DragEvent) {
        event.preventDefault();
        this.isDragging = false;
        this.draggedOverIndex = null;
      }
    
      onDragOver(event: DragEvent, index: number) {
        event.preventDefault();
        event.stopPropagation();
        this.draggedOverIndex = index;
      }
    
      onDragLeave() {
        this.draggedOverIndex = null;
      }
    
     
    
      deleteLayer(index: number) {
        const layerToDelete = this.layers[index];
        this._mapService.getMap().removeLayer(layerToDelete.layer);
        
        this.layers = [...this.layers.slice(0, index), ...this.layers.slice(index + 1)];
        
        const newOrder = this.layers.map((layer, index) => ({
          name: layer.name,
          zIndex: this.layers.length - index - 1
        }));
        this._layersService.updateLayerOrder(newOrder);
      }
      
      onDrop(event: DragEvent, dropIndex: number) {
        event.preventDefault();
        
        const dragIndex = parseInt(event.dataTransfer.getData('text/plain'), 10);
        if (dragIndex !== dropIndex) {
          const [removedItem] = this.layers.splice(dragIndex, 1);
          this.layers.splice(dropIndex, 0, removedItem);
        
          const newOrder = this.layers.map(layer => ({
            name: layer.name
          }));
        
          this._layersService.updateLayerOrder(newOrder);
        }
        
        this.draggedOverIndex = null;
        this.isDragging = false;
      }
      onDropDelete(event: DragEvent) {
        event.preventDefault();
        const dragIndex = parseInt(event.dataTransfer.getData('text/plain'), 10);
        const layerToDelete = this.layers[dragIndex];
      
        const isConfirmed = confirm(`Are you sure you want to delete the layer "${layerToDelete.name}"?`);
      
        if (isConfirmed) {
          this.deleteLayer(dragIndex);
        }
      
        this.isDragging = false;
        this.isOverDelete = false;
      }
    
    
        onDragOverDelete(event: DragEvent) {
            event.preventDefault();
            this.isOverDelete = true;
        }
    
        onDragLeaveDelete(event: DragEvent) {
            this.isOverDelete = false;
        }
        getLayerColor(): string {
            if (!this.selectedLayer || !(this.selectedLayer.style instanceof Style)) {
                return 'None';
            }
        
            const geometryType = this.getGeometryType(this.selectedLayer);
            const style = this.selectedLayer.style;
        
            switch (geometryType) {
                case 'Point':
                    const image = style.getImage();
                    if (image instanceof Circle && image.getFill()) {
                        return image.getFill().getColor() as string || 'None';
                    }
                    break;
                case 'LineString':
                case 'MultiLineString':
                    const stroke = style.getStroke();
                    return stroke ? (stroke.getColor() as string || 'None') : 'None';
                default:
                    const fill = style.getFill();
                    return fill ? (fill.getColor() as string || 'None') : 'None';
            }
        
            return 'None';
        }
        
        updateLayerColor(color: string): void {
            if (!this.selectedLayer || !(this.selectedLayer.style instanceof Style)) {
                console.error('Invalid layer or style');
                return;
            }
        
            const currentStyle = this.selectedLayer.style;
            const geometryType = this.getGeometryType(this.selectedLayer);
            let newStyle: Style;
        
            switch (geometryType) {
                case 'Point':
                    const currentImage = currentStyle.getImage();
                    if (currentImage instanceof Circle) {
                        newStyle = new Style({
                            image: new Circle({
                                radius: currentImage.getRadius(),
                                fill: new Fill({ color }),
                                stroke: currentImage.getStroke()
                            })
                        });
                    } else {
                        newStyle = currentStyle;
                    }
                    break;
                case 'LineString':
                case 'MultiLineString':
                    newStyle = new Style({
                        stroke: new Stroke({ color, width: currentStyle.getStroke()?.getWidth() || 1 })
                    });
                    break;
                default:
                    newStyle = new Style({
                        fill: new Fill({ color }),
                        stroke: currentStyle.getStroke()
                    });
            }
        
            this.applyNewStyle(newStyle);
        }
        
        getLayerStrokeColor(): string {
            if (!this.selectedLayer || !(this.selectedLayer.style instanceof Style)) {
                return 'None';
            }
        
            const geometryType = this.getGeometryType(this.selectedLayer);
            const style = this.selectedLayer.style;
        
            if (geometryType === 'Point') {
                const image = style.getImage();
                if (image instanceof Circle && image.getStroke()) {
                    return image.getStroke().getColor() as string || 'None';
                }
            } else {
                const stroke = style.getStroke();
                return stroke ? (stroke.getColor() as string || 'None') : 'None';
            }
        
            return 'None';
        }
        
        updateLayerStrokeColor(color: string): void {
            if (!this.selectedLayer || !(this.selectedLayer.style instanceof Style)) {
                console.error('Invalid layer or style');
                return;
            }
        
            const currentStyle = this.selectedLayer.style;
            const geometryType = this.getGeometryType(this.selectedLayer);
            let newStyle: Style;
        
            if (geometryType === 'Point') {
                const currentImage = currentStyle.getImage();
                if (currentImage instanceof Circle) {
                    newStyle = new Style({
                        image: new Circle({
                            radius: currentImage.getRadius(),
                            fill: currentImage.getFill(),
                            stroke: new Stroke({ color, width: this.getLayerStrokeWidth() })
                        })
                    });
                } else {
                    newStyle = currentStyle;
                }
            } else {
                newStyle = new Style({
                    fill: currentStyle.getFill(),
                    stroke: new Stroke({ color, width: this.getLayerStrokeWidth() })
                });
            }
        
            this.applyNewStyle(newStyle);
        }
        
        private applyNewStyle(newStyle: Style): void {
            this.selectedLayer.style = newStyle;
            
            if (this.selectedLayer.layer instanceof VectorLayer) {
                this.selectedLayer.layer.setStyle(() => newStyle);
            }
            
            this._styleService.saveStyle(this.selectedLayer.name, newStyle);
        }
        
        private getLayerStrokeWidth(): number {
            if (this.selectedLayer && this.selectedLayer.style instanceof Style) {
                const geometryType = this.getGeometryType(this.selectedLayer);
                if (geometryType === 'Point') {
                    const image = this.selectedLayer.style.getImage();
                    if (image instanceof Circle) {
                        return image.getStroke() ? image.getStroke().getWidth() || 1 : 1;
                    }
                } else {
                    const stroke = this.selectedLayer.style.getStroke();
                    return stroke ? stroke.getWidth() || 1 : 1;
                }
            }
            return 1;
        }
        
      
        updateLayerOpacity(event: Event | number): void {
            if (this.selectedLayer && this.selectedLayer.layer) {
                let opacity: number;
        
                if (typeof event === 'number') {
                    opacity = event;
                } else {
                    opacity = (event.target as HTMLInputElement).value as unknown as number;
                }
        
                // Ensure opacity is a number and within 0-1 range
                const numericOpacity = Number(opacity);
                if (!isNaN(numericOpacity)) {
                    const clampedOpacity = Math.min(Math.max(numericOpacity, 0), 1);
                    this.selectedLayer.layer.setOpacity(clampedOpacity);
                }
            }
        }
    
        //matpanel layer displaier
        onPanelOpened(panel: MatExpansionPanel) {
            this.panelOpen = true;
          }
        
          onPanelClosed(panel: MatExpansionPanel) {
            this.panelOpen = false;
          }


getLayerStrokeInColor(): string {
    if (this.selectedLayer && this.selectedLayer.inStyle) {
        const style = this.selectedLayer.inStyle;
        if (style instanceof Style) {
            const stroke = style.getStroke();
            if (stroke) {
                const color = stroke.getColor();
                if (typeof color === 'string') {
                    return color;
                } else if (Array.isArray(color)) {
                    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
                }
            }
        }
    }
    return 'None';
}

resetToInitialStrokeColor(): void {
    if (this.selectedLayer) {
        const initialStrokeColor = this.getLayerStrokeInColor();
        this.updateLayerStrokeColor(initialStrokeColor);
    }
}

updateLayerStrokeWidth(width: number): void {
    if (!this.selectedLayer || !(this.selectedLayer.style instanceof Style)) {
        console.error('Invalid layer or style');
        return;
    }

    const currentStyle = this.selectedLayer.style;
    const geometryType = this.getGeometryType(this.selectedLayer);
    let newStyle: Style;

    if (geometryType === 'Point') {
        const currentImage = currentStyle.getImage();
        if (currentImage instanceof Circle) {
            newStyle = new Style({
                image: new Circle({
                    radius: currentImage.getRadius(),
                    fill: currentImage.getFill(),
                    stroke: new Stroke({ 
                        color: currentImage.getStroke() ? currentImage.getStroke().getColor() : 'black',
                        width: width
                    })
                })
            });
        } else {
            newStyle = currentStyle;
        }
    } else {
        newStyle = new Style({
            fill: currentStyle.getFill(),
            stroke: new Stroke({ 
                color: currentStyle.getStroke() ? currentStyle.getStroke().getColor() : 'black',
                width: width
            })
        });
    }

    this.applyNewStyle(newStyle);
}

getSelectedSymbolIcon(): string {
    const symbol = this.availableSymbols.find(s => s.value === this.selectedSymbol);
    console.log('Selected Symbol Icon:', symbol?.icon);
    return symbol ? symbol.icon : '';
}

getSelectedSymbolLabel(): string {
    const symbol = this.availableSymbols.find(s => s.value === this.selectedSymbol);
    console.log('Selected Symbol Label:', symbol?.label);
    return symbol ? symbol.label : '';
}


createPointSymbolStyle(): Style {
    console.log('[createPointSymbolStyle] Generating symbol style...');

    const selectedSymbolInfo = this.availableSymbols.find(s => s.value === this.selectedSymbol);

    if (!selectedSymbolInfo) {
        console.error('[createPointSymbolStyle] Symbol not found');
        return new Style();
    }

    const svgPath = this.getSymbolPath(selectedSymbolInfo.value);
    
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${this.symbolSize}" height="${this.symbolSize}">
            <path fill="${this.symbolColor}" fill-opacity="${this.symbolOpacity}" d="${svgPath}" />
        </svg>
    `;

    console.log('[createPointSymbolStyle] Generated SVG:', svg);

    const image = new Icon({
        src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
        scale: 1, // We're setting the size in the SVG itself
        anchor: [0.5, 0.5], // Center the icon
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
    });

    console.log('[createPointSymbolStyle] Created Icon style:', image);

    return new Style({ image: image });
}

updateLayerSymbol(): void {
    console.log('[updateLayerSymbol] Updating layer symbol...');

    if (!this.selectedLayer) {
        console.error('[updateLayerSymbol] No layer selected');
        return;
    }

    if (this.selectedLayer.layer instanceof VectorLayer) {
        const newStyle = this.createPointSymbolStyle();
        console.log('[updateLayerSymbol] Created new style:', newStyle);

        this.selectedLayer.layer.setStyle((feature: Feature): Style => {
            if (feature.getGeometry() instanceof Point) {
                // Create a new Style instance by copying properties
                return new Style({
                    image: newStyle.getImage(),
                    text: newStyle.getText(),
                    fill: newStyle.getFill(),
                    stroke: newStyle.getStroke(),
                    // Add other properties as needed
                });
            }
            // Return a new Style for non-point geometries
            return new Style();
        });

        this._styleService.saveStyle(this.selectedLayer.name, newStyle);
        console.log('[updateLayerSymbol] Style saved');

        // Ensure the layer is visible
        this.selectedLayer.layer.setVisible(true);

        // Force redraw of the layer
        this.selectedLayer.layer.changed();

        // Trigger a map refresh
        this._mapService.getMap().render();
    } else {
        console.error('[updateLayerSymbol] Selected layer is not a VectorLayer');
    }
}
getSymbolPath(symbol: string): string {
    switch (symbol) {
        case 'circle':
            return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z';
        case 'square':
            return 'M3 3h18v18H3z';
        case 'pin':
            return 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';
        // Add other symbol cases as needed
        default:
            return '';
    }
}

  //storage

//    loadStyleFromLocalStorage(LayerName :string) : Color | ColorLike | PatternDescriptor | null {
//     if(LayerName){
//         console.log(LayerName , ' : ', this._styleService.loadStyleFromLocalStorage(LayerName));
//         return  this._styleService.loadStyleFromLocalStorage(LayerName).getFill().getColor();
//     }
//     return null;
//   }

//   getSelectedLayerInColor(): string {
//     if (this.selectedLayer && this.selectedLayer.inStyle) {
//       const fill = this.selectedLayer.inStyle.getFill();
//       if (fill) {
//         const color = fill.getColor();
//         if (typeof color === 'string') {
//           return color;
//         } else if (Array.isArray(color)) {
//           return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
//         }
//       }
//       const stroke = this.selectedLayer.inStyle.getStroke();
//       if (stroke) {
//         const color = stroke.getColor();
//         if (typeof color === 'string') {
//           return color;
//         } else if (Array.isArray(color)) {
//           return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
//         }
//       }
//     }
//     return 'None';
//   }

  getSelectedLayerColor(): string {
    if (this.selectedLayer && this.selectedLayer.inStyle) {
      const fill = this.selectedLayer.inStyle.getFill();
      if (fill) {
        const color = fill.getColor();
        if (typeof color === 'string') {
          return color;
        } else if (Array.isArray(color)) {
          return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
        }
      }
      const stroke = this.selectedLayer.inStyle.getStroke();
      if (stroke) {
        const color = stroke.getColor();
        if (typeof color === 'string') {
          return color;
        } else if (Array.isArray(color)) {
          return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
        }
      }
    }
    return 'None';
  }
  //display with the name the geo
  getGeometryType(layer: CustomLayer): string {
    if (layer && layer.layer instanceof VectorLayer) {
        const source = layer.layer.getSource();
        const features = source.getFeatures();
        
        if (features.length > 0) {
            // Check the first feature
            const geometry = features[0].getGeometry();
            if (geometry instanceof Point) return 'Point';
            if (geometry instanceof MultiPoint) return 'MultiPoint';
            if (geometry instanceof LineString) return 'LineString';
            if (geometry instanceof MultiLineString) return 'MultiLineString';
            if (geometry instanceof Polygon) return 'Polygon';
            if (geometry instanceof MultiPolygon) return 'MultiPolygon';
            if (geometry instanceof GeometryCollection) return 'GeometryCollection';
            
            console.log('Unknown geometry type:', geometry);
            return geometry ? geometry.getType() : 'Unknown';
        } else {
            // If no features, try to infer from the layer's style
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
    console.log('Could not determine geometry type for layer:', layer);
    return 'Unknown';
}
resetToInitialColor(): void {
    if (this.selectedLayer) {
        const initialColor = this.getSelectedLayerColor();
        this.updateLayerColor(initialColor);
    }
}

//error display

        
}
