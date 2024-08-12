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
    ViewChild,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    HostListener,
    NgZone
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
import { Subject, Subscription, fromEvent } from 'rxjs';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { ColorPieChartComponentComponent } from '../color-pie-chart-component/color-pie-chart-component.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomLayer } from './quick-chat.types';
import { FilterLayersPipe } from 'app/modules/admin/filter-layers-pipe/filter-layers.pipe';
import { ImportService } from '../import/import.service';
import { StyleService } from 'app/modules/admin/services/style.service';
import { MapService } from 'app/modules/admin/services/map.service';
import { Circle, Fill, Icon, Stroke, Style } from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import { GeometryCollection, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import { Feature } from 'ol';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import Map from 'ol/Map';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import VectorSource from 'ol/source/Vector';
import { Extent } from 'ol/extent';
import { MiniMapComponent } from 'app/modules/admin/dashboards/mini-map/mini-map.component';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'quick-chat',
    templateUrl: './quick-chat.component.html',
    styleUrls: ['./quick-chat.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
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
        MatExpansionModule,
        MatSelectModule,
        CommonModule,
        MiniMapComponent ,
        RouterModule
    ],
})
export class QuickChatComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('mapContainer', { static: false }) mapContainer: ElementRef;
    // @ViewChild('expansionPanel', { static: false }) expansionPanel: MatExpansionPanel;
    // @ViewChild('scrollContainer', { static: false }) scrollContainer: ElementRef;

    isMapSticky: boolean = true;
    private mapOffset: number;
    private layersSubscription: Subscription;
    layers: CustomLayer[] = [];
    selectedLayer: CustomLayer | null = null;
    MMapselectedLayer: CustomLayer | null = null;

    miniMap: Map | null = null;


   
    opened: boolean = false;
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
        // { value: 'triangle', label: 'Triangle', icon: 'change_history' },
    ];

    selectedSymbol: string = 'circle';
    symbolSize: number = 24;
    symbolColor: string = '#000000';
    symbolOpacity: number = 1;
    private _mutationObserver: MutationObserver;
    private _scrollStrategy: ScrollStrategy;
    private _overlay: HTMLElement;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
     @HostListener('document:keydown', ['$event'])
    @HostListener('document:keyup', ['$event'])
    handleKeyEvent(event: KeyboardEvent) {
        if (event.key === 'Shift') {
            this.isShiftPressed = event.type === 'keydown';
            console.log('Shift key ' + (this.isShiftPressed ? 'pressed' : 'released'));
            this._changeDetectorRef.detectChanges();
        }
    }

    isShiftPressed: boolean = false;

    constructor(
        private _elementRef: ElementRef,
        private _renderer2: Renderer2,
        private _scrollStrategyOptions: ScrollStrategyOptions,
        private _layersService: LayersService,
        private _importService: ImportService,
        private _styleService: StyleService,
        private _mapService: MapService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _ngZone: NgZone,
        private _router: Router

    ) {
        this._scrollStrategy = this._scrollStrategyOptions.block();
        console.log('QuickChatComponent constructor called');

    }

    @HostBinding('class') get classList(): any {
        return {
            'quick-chat-opened': this.opened,
        };
    }

    ngOnInit(): void {
        console.log('ngOnInit called');
        this.layersSubscription = this._layersService.layers$.subscribe(layers => {
            console.log('Layers received:', layers);
            this.layers = layers;
            if (layers.length > 0 && !this.selectedLayer) {
                this.selectedLayer = layers[0];
                this._changeDetectorRef.detectChanges();
            }
        });
    }

    ngAfterViewInit() {
        console.log('ngAfterViewInit called');
        setTimeout(() => {
            console.log('mapContainer:', this.mapContainer);
            
        });
    }

    ngOnDestroy(): void {
        console.log('ngOnDestroy called');
        if (this.layersSubscription) {
            this.layersSubscription.unsubscribe();
        }
        if (this.miniMap) {
            this.miniMap.setTarget(undefined);
        }
    }

    
    handleLayerClick(layer: CustomLayer, event: MouseEvent) {
        if (this.opened && !this.isShiftPressed) {
            this.selectLayer(layer);
        } else {
            this.onLayerVisibilityChange(layer.id);
        }
    }
   // private calculateMapOffset() {
    //     if (this.mapContainer && this.mapContainer.nativeElement) {
    //         this.mapOffset = this.mapContainer.nativeElement.offsetTop;
    //         console.log('Map offset calculated:', this.mapOffset);
    //     } else {
    //         console.log('Map container not found');
    //     }
    // }

    // handleScroll() {
    //     console.log('handleScroll called');
    //     if (!this.expansionPanel || !this.scrollContainer) {
    //         console.log('expansionPanel or scrollContainer not available');
    //         return;
    //     }

    //     const scrollTop = this.scrollContainer.nativeElement.scrollTop;
    //     console.log('Scroll top:', scrollTop, 'Map offset:', this.mapOffset);
    //     if (this.expansionPanel.expanded) {
    //         this.isMapSticky = scrollTop > this.mapOffset;
    //         console.log('Is map sticky:', this.isMapSticky);
    //     } else {
    //         this.isMapSticky = false;
    //     }
    //     this._changeDetectorRef.detectChanges();
    // }

    // panelOpened() {
    //     console.log('Panel opened');
    //     setTimeout(() => {
    //         this.calculateMapOffset();
    //         this.handleScroll();
    //     }, 0);
    // }

    // panelClosed() {
    //     console.log('Panel closed');
    //     this.isMapSticky = false;
    //     this._changeDetectorRef.detectChanges();
    // }

    // @HostListener('window:scroll', ['$event'])
    // @HostListener('window:resize', ['$event'])
    // onWindowScroll() {
    //     this.handleScroll();
    // }

    // private calculateMapOffset() {
    //     if (this.mapContainer && this.mapContainer.nativeElement) {
    //         this.mapOffset = this.mapContainer.nativeElement.offsetTop;
    //     }
    // }

    // private handleScroll = (): void => {
    //     if (!this.expansionPanel || !this.scrollContainer) return;

    //     const scrollTop = this.scrollContainer.nativeElement.scrollTop;
    //     if (this.expansionPanel.expanded) {
    //         this.isMapSticky = scrollTop > this.mapOffset;
    //     } else {
    //         this.isMapSticky = false;
    //     }
    //     this._ngZone.run(() => this._changeDetectorRef.detectChanges());
    // }

    // panelOpened() {
    //     setTimeout(() => {
    //         this.calculateMapOffset();
    //         this.handleScroll();
    //     }, 0);
    // }

    // panelClosed() {
    //     this.isMapSticky = false;
    //     this._changeDetectorRef.detectChanges();
    // }

    // private initMap() {
    //     if (this.selectedLayer) {
    //         setTimeout(() => {
    //             const map = this._mapService.initializeMap('mini-map');
    //             if (map && this.selectedLayer.layer) {
    //                 map.addLayer(this.selectedLayer.layer);
    //                 const source = this.selectedLayer.layer.getSource();
    //                 if (source instanceof VectorSource) {
    //                     const extent = source.getExtent();
    //                     if (extent && !extent.every(v => v === Infinity || v === -Infinity)) {
    //                         map.getView().fit(extent, { padding: [20, 20, 20, 20] });
    //                     } else {
    //                         map.getView().setZoom(2);
    //                         map.getView().setCenter([0, 0]);
    //                     }
    //                 } else {
    //                     // For non-vector sources, set a default view
    //                     map.getView().setZoom(2);
    //                     map.getView().setCenter([0, 0]);
    //                 }
    //             }
    //         }, 0);
    //     }
    // }


//verify the loading of layers
    


arLayersLoaded(): boolean {
        return this.layers && this.layers.length > 0;
    }


  // Add this method to handle principal map layer selection
//   selectPrincipalMapLayer(layer: CustomLayer): void {
//     console.log('Selecting layer for principal map:', layer);
//     this.selectedLayer = layer;
//     this._layersService.onLayerVisibilityChange(layer.id);
//     this._changeDetectorRef.detectChanges();
//   }
  toggleLayerVisibility(layer: CustomLayer): void {
    console.log('Toggling layer visibility:', layer);
    this.onLayerVisibilityChange(layer.id);
  }
selectLayer(layer: CustomLayer): void {
    console.log('Selecting layer:', layer.name);
    this.MMapselectedLayer = layer;
    this.selectedLayer = layer; // Ensure both are updated
    this._changeDetectorRef.detectChanges();
}

onLayerVisibilityChange(layerId: string): void {
    console.log('Toggling layer visibility:', layerId);
    this._layersService.onLayerVisibilityChange(layerId);
}
// handleLayerClick(layer: CustomLayer, event: MouseEvent) {
//     console.log('Layer clicked:', layer.name, 'Opened:', this.opened, 'Shift pressed:', this.isShiftPressed);
    
//     if (!this.opened || (this.opened && this.isShiftPressed)) {
//         // Toggle layer visibility only when panel is closed or Shift is pressed while panel is open
//         this.onLayerVisibilityChange(layer.id);
//     } else if (this.opened) {
//         // Select layer for mini-map when panel is open and Shift is not pressed
//         this.selectLayer(layer);
//     }
    
//     this._changeDetectorRef.detectChanges();
// }

//DRAG AND DROP METHODS
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
// this._mapService.getMap().subscribe(map => map.removeLayer(layerToDelete.layer));
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



//STYLE MANAGEMENT METHODS
    //COLOR METHODS
    getLayerColor(): string {
        if (!this.MMapselectedLayer || !(this.MMapselectedLayer.style instanceof Style)) {
            return '#000000';
        }

        const geometryType = this.getGeometryType(this.MMapselectedLayer);
        const style = this.MMapselectedLayer.style;

        switch (geometryType) {
            case 'Point':
                const image = style.getImage();
                if (image instanceof Circle && image.getFill()) {
                    return image.getFill().getColor() as string || '#000000';
                }
                break;
            case 'LineString':
            case 'MultiLineString':
                const stroke = style.getStroke();
                return stroke ? (stroke.getColor() as string || '#000000') : '#000000';
            default:
                const fill = style.getFill();
                return fill ? (fill.getColor() as string || '#000000') : '#000000';
        }

        return '#000000';
    }
      //the initial value from geoserver
    getSelectedLayerColor(): string {
        if (this.MMapselectedLayer && this.MMapselectedLayer.inStyle) {
            const fill = this.MMapselectedLayer.inStyle.getFill();
            if (fill) {
                const color = fill.getColor();
                if (typeof color === 'string') {
                    return color;
                } else if (Array.isArray(color)) {
                    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
                }
            }
            const stroke = this.MMapselectedLayer.inStyle.getStroke();
            if (stroke) {
                const color = stroke.getColor();
                if (typeof color === 'string') {
                    return color;
                } else if (Array.isArray(color)) {
                    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
                }
            }
        }
        return '#000000';
    }
      //button reset to initial color
    resetToInitialColor(): void {
        if (this.MMapselectedLayer) {
            const initialColor = this.getSelectedLayerColor();
            this.updateLayerColor(initialColor);
        }
    }
      //Saving color
    // updateLayerColor(color: string): void {
    //     if (!this.MMapselectedLayer || !(this.MMapselectedLayer.style instanceof Style)) {
    //         console.error('Invalid layer or style');
    //         return;
    //     }

    //     const currentStyle = this.MMapselectedLayer.style;
    //     const geometryType = this.getGeometryType(this.MMapselectedLayer);
    //     let newStyle: Style;

    //     switch (geometryType) {
    //         case 'Point':
    //             const currentImage = currentStyle.getImage();
    //             if (currentImage instanceof Circle) {
    //                 newStyle = new Style({
    //                     image: new Circle({
    //                         radius: currentImage.getRadius(),
    //                         fill: new Fill({ color }),
    //                         stroke: currentImage.getStroke()
    //                     })
    //                 });
    //             } else {
    //                 newStyle = currentStyle;
    //             }
    //             break;
    //         case 'LineString':
    //         case 'MultiLineString':
    //             newStyle = new Style({
    //                 stroke: new Stroke({ color, width: currentStyle.getStroke()?.getWidth() || 1 })
    //             });
    //             break;
    //         default:
    //             newStyle = new Style({
    //                 fill: new Fill({ color }),
    //                 stroke: currentStyle.getStroke()
    //             });
    //     }

    //     this.applyNewStyle(newStyle);
    // }

     
    //OPACITY METHODS
    updateLayerOpacity(opacity: number): void {
        if (this.MMapselectedLayer && this.MMapselectedLayer.layer) {
            this.MMapselectedLayer.layer.setOpacity(opacity);
            this.MMapselectedLayer.layer.changed();
            this._mapService.getMap().render();
        }
    }

    //STROKE METHODS
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

    // updateLayerStrokeWidth(width: number): void {
    //     if (!this.selectedLayer || !(this.selectedLayer.style instanceof Style)) {
    //         console.error('Invalid layer or style');
    //         return;
    //     }

    //     const currentStyle = this.selectedLayer.style;
    //     const geometryType = this.getGeometryType(this.selectedLayer);
    //     let newStyle: Style;

    //     if (geometryType === 'Point') {
    //         const currentImage = currentStyle.getImage();
    //         if (currentImage instanceof Circle) {
    //             newStyle = new Style({
    //                 image: new Circle({
    //                     radius: currentImage.getRadius(),
    //                     fill: currentImage.getFill(),
    //                     stroke: new Stroke({
    //                         color: currentImage.getStroke() ? currentImage.getStroke().getColor() : 'black',
    //                         width: width
    //                     })
    //                 })
    //             });
    //         } else {
    //             newStyle = currentStyle;
    //         }
    //     } else {
    //         newStyle = new Style({
    //             fill: currentStyle.getFill(),
    //             stroke: new Stroke({
    //                 color: currentStyle.getStroke() ? currentStyle.getStroke().getColor() : 'black',
    //                 width: width
    //             })
    //         });
    //     }

    //     this.applyNewStyle(newStyle);
    // }
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

    // updateLayerStrokeColor(color: string): void {
    //     if (!this.selectedLayer || !(this.selectedLayer.style instanceof Style)) {
    //         console.error('Invalid layer or style');
    //         return;
    //     }

    //     const currentStyle = this.selectedLayer.style;
    //     const geometryType = this.getGeometryType(this.selectedLayer);
    //     let newStyle: Style;

    //     if (geometryType === 'Point') {
    //         const currentImage = currentStyle.getImage();
    //         if (currentImage instanceof Circle) {
    //             newStyle = new Style({
    //                 image: new Circle({
    //                     radius: currentImage.getRadius(),
    //                     fill: currentImage.getFill(),
    //                     stroke: new Stroke({ color, width: this.getLayerStrokeWidth() })
    //                 })
    //             });
    //         } else {
    //             newStyle = currentStyle;
    //         }
    //     } else {
    //         newStyle = new Style({
    //             fill: currentStyle.getFill(),
    //             stroke: new Stroke({ color, width: this.getLayerStrokeWidth() })
    //         });
    //     }

    //     this.applyNewStyle(newStyle);
    // }
    
    //SYMBOLOGY METHODS
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
        if (!this.MMapselectedLayer) {
            console.error('[updateLayerSymbol] No layer selected');
            return;
        }
    
        if (this.MMapselectedLayer.layer instanceof VectorLayer) {
            const newStyle = this.createPointSymbolStyle();
            this.applyNewStyle(newStyle);
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
    // private applyNewStyle(newStyle: Style): void {
    //     if (this.MMapselectedLayer && this.MMapselectedLayer.layer instanceof VectorLayer) {
    //         this.MMapselectedLayer.style = newStyle;
    //         this.MMapselectedLayer.layer.setStyle(() => newStyle);
    //         this.MMapselectedLayer.layer.changed();
    //         this._mapService.getMap().render();
    //     }
    //     // Optionally, save the style to local storage or your backend
    //     // this._styleService.saveStyle(this.MMapselectedLayer.name, newStyle);
    // }
    //display geometry with lisible format
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

    formatLayerName(name: string): string {
        const parts = name.split('_');
        if (parts.length > 1) {
            return this.capitalize(parts[parts.length - 1]);
        } else {
            return this.capitalize(name);
        }
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    openFileInput(): void {
        this._importService.openFileInput();
    }

    open(): void {
        if (!this.opened) {
            this._toggleOpened(true);
        }
    }

    close(): void {
        if (this.opened) {
            this._toggleOpened(false);
        }
    }

    toggle(): void {
        this._toggleOpened(!this.opened);
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    private _showOverlay(): void {
        this._hideOverlay();
        this._overlay = this._renderer2.createElement('div');
        if (this._overlay) {
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
    }

    private _hideOverlay(): void {
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

    //try
    updateLayerColor(color: string): void {
        if (!this.MMapselectedLayer || !(this.MMapselectedLayer.style instanceof Style)) {
            console.error('Invalid layer or style');
            return;
        }
    
        const currentStyle = this.MMapselectedLayer.style;
        const geometryType = this.getGeometryType(this.MMapselectedLayer);
        let newStyle: Style;
    
        switch (geometryType) {
            case 'Point':
            case 'MultiPoint':
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
    
    private applyNewStyle(newStyle: Style): void {
        if (this.MMapselectedLayer && this.MMapselectedLayer.layer instanceof VectorLayer) {
            this.MMapselectedLayer.style = newStyle;
            this.MMapselectedLayer.layer.setStyle(() => newStyle);
            this.MMapselectedLayer.layer.changed();
        }
    
        // Apply the same style to the selectedLayer (principal map)
        if (this.selectedLayer && this.selectedLayer.layer instanceof VectorLayer) {
            this.selectedLayer.style = newStyle;
            this.selectedLayer.layer.setStyle(() => newStyle);
            this.selectedLayer.layer.changed();
        }
    
        // Render both maps
        this._mapService.getMap().render();
        if (this.miniMap) {
            this.miniMap.render();
        }
    
        // Optionally, save the style to local storage or your backend
        // this._styleService.saveStyle(this.MMapselectedLayer.name, newStyle);
    }
    
    updateLayerStrokeColor(color: string): void {
        if (!this.MMapselectedLayer || !(this.MMapselectedLayer.style instanceof Style)) {
            console.error('Invalid layer or style');
            return;
        }
    
        const currentStyle = this.MMapselectedLayer.style;
        const geometryType = this.getGeometryType(this.MMapselectedLayer);
        let newStyle: Style;
    
        if (geometryType === 'Point' || geometryType === 'MultiPoint') {
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
    
    updateLayerStrokeWidth(width: number): void {
        if (!this.MMapselectedLayer || !(this.MMapselectedLayer.style instanceof Style)) {
            console.error('Invalid layer or style');
            return;
        }
    
        const currentStyle = this.MMapselectedLayer.style;
        const geometryType = this.getGeometryType(this.MMapselectedLayer);
        let newStyle: Style;
    
        if (geometryType === 'Point' || geometryType === 'MultiPoint') {
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
}