import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DatePipe, NgClass, NgTemplateOutlet, PercentPipe, CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
    Component,
    ElementRef,
    HostBinding,
    OnDestroy,
    OnInit,
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
import { Subject, Subscription } from 'rxjs';
import { MatExpansionModule } from '@angular/material/expansion';
import { ColorPieChartComponentComponent } from '../color-pie-chart-component/color-pie-chart-component.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomLayer } from './quick-chat.types';
import { FilterLayersPipe } from 'app/modules/admin/filter-layers-pipe/filter-layers.pipe';
import { AttributeTableService } from './attribute-table/attribute-table.service';
import { MatDialogModule } from '@angular/material/dialog';
import { ServerImportComponent } from '../server-import/server-import.component';
import { QuickChatService } from './quick-chat.service';
import { StyleService } from 'app/modules/admin/services/style.service';
import { MapService } from 'app/modules/admin/services/map.service';
import { Circle, Fill, Icon, Stroke, Style } from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import { MatSelectModule } from '@angular/material/select';
import Map from 'ol/Map';
import { MiniMapComponent } from 'app/modules/admin/dashboards/mini-map/mini-map.component';
import { Router, RouterModule } from '@angular/router';
import { ImportService } from '../local-import/import.service';
import VectorSource from 'ol/source/Vector';

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
        MatDialogModule,
        FilterLayersPipe,
        ServerImportComponent,
        MatExpansionModule,
        MatSelectModule,
        CommonModule,
        MiniMapComponent,
        RouterModule,
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

    availableSymbols = [
        { value: 'circle', label: 'Circle', icon: 'circle' },
        { value: 'square', label: 'Square', icon: 'square' },
        { value: 'pin', label: 'Pin', icon: 'place' },
        // { value: 'triangle', label: 'Triangle', icon: 'change_history' },
    ];
    HavailableSymbols = [
        { value: 'circle', label: 'Point', icon: 'radio_button_unchecked' },
        { value: 'multipoint', label: 'MultiPoint', icon: 'group_work' },
        { value: 'linestring', label: 'LineString', icon: 'show_chart' },
        { value: 'multilinestring', label: 'MultiLineString', icon: 'timeline' },
        { value: 'polygon', label: 'Polygon', icon: 'change_history' },
        { value: 'multipolygon', label: 'MultiPolygon', icon: 'dashboard' },
        { value: 'collection', label: 'GeometryCollection', icon: 'layers' },
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
        private _attributeTableService: AttributeTableService,
        private _quickChatService: QuickChatService,
        private _styleService: StyleService,
        private _mapService: MapService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _ngZone: NgZone,
        private _router: Router,
        private sanitizer: DomSanitizer,
    ) {
        this._scrollStrategy = this._scrollStrategyOptions.block();
    }

    @HostBinding('class') get classList(): any {
        return {
            'quick-chat-opened': this.opened,
        };
    }

    ngOnInit(): void {
        this.layersSubscription = this._layersService.layers$.subscribe(layers => {
            this.layers = layers;
            console.log(layers);
            this._changeDetectorRef.detectChanges();
        });
    }

    ngAfterViewInit() { }

    ngOnDestroy(): void {
        if (this.layersSubscription) {
            this.layersSubscription.unsubscribe();
        }
        if (this.miniMap) {
            this.miniMap.setTarget(undefined);
        }
    }
    // Nouvelle méthode pour obtenir la légende OpenLayers
    getOpenLayersLegend(layer: CustomLayer): SafeHtml {

        return this._layersService.getOpenLayersLegend(layer);
    }

    //   generateSvgLegend(geometryType: string, fillColor: string, strokeColor: string, strokeWidth: number): string {
    //     const size = 20;
    //     let svg = '';

    //     switch (geometryType) {
    //       case 'Point':
    //         svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    //                  <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    //                </svg>`;
    //         break;
    //       case 'LineString':
    //       case 'MultiLineString':
    //         svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    //                  <line x1="0" y1="${size/2}" x2="${size}" y2="${size/2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    //                </svg>`;
    //         break;
    //       case 'Polygon':
    //       case 'MultiPolygon':
    //         svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    //                  <rect x="2" y="2" width="${size-4}" height="${size-4}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    //                </svg>`;
    //         break;
    //       default:
    //         svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    //                  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14">${geometryType[0]}</text>
    //                </svg>`;
    //     }

    //     return svg;
    //   }

    //   generateSvgLegend(geometryType: string, color: string): string {
    //     const size = 20;
    //     let svg = '';

    //     switch (geometryType) {
    //       case 'Point':
    //         svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    //                  <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="${color}" />
    //                </svg>`;
    //         break;
    //       case 'LineString':
    //         svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    //                  <line x1="0" y1="${size/2}" x2="${size}" y2="${size/2}" stroke="${color}" stroke-width="2" />
    //                </svg>`;
    //         break;
    //       case 'Polygon':
    //         svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    //                  <rect x="2" y="2" width="${size-4}" height="${size-4}" fill="${color}" />
    //                </svg>`;
    //         break;
    //       default:
    //         svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    //                  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14">${geometryType[0]}</text>
    //                </svg>`;
    //     }

    //     return svg;
    //   }

    selectLayer(layer: CustomLayer): void {
        {
            this.MMapselectedLayer = layer;
            this.selectedLayer = layer;
            this._changeDetectorRef.detectChanges();
        }
    }

    onLayerVisibilityChange(customLayer: CustomLayer): void {
        this._layersService.onLayerVisibilityChange(customLayer);
        this.selectLayer(customLayer);
    }

    ZoomToLayer(customLayer: CustomLayer): void {
        const extent = (customLayer.layer.getSource() as VectorSource).getExtent();
        this._mapService.getMap().getView().fit(extent, {
            duration: 4000,
            maxZoom: 15
        });
    }

    // DRAG AND DROP METHODS
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


    deleteLayer(layerId: string) {
        // Trouvez la couche à supprimer
        const layerToDelete = this.layers.find(layer => layer.id === layerId);

        if (!layerToDelete) {
            console.error(`Layer with id ${layerId} not found`);
            return;
        }

        // Supprimez la couche de la carte
        this._mapService.getMap().removeLayer(layerToDelete.layer);

        // Demandez au service de supprimer la couche
        this._layersService.removeLayer(layerId);

        // La mise à jour de this.layers se fera automatiquement via la souscription existante
    }


    onDropDelete(event: DragEvent) {
        event.preventDefault();
        const dragIndex = parseInt(event.dataTransfer.getData('text/plain'), 10);
        const layerToDelete = this.layers[dragIndex];

        const isConfirmed = confirm(`Are you sure you want to delete the layer "${layerToDelete.name}"?`);

        if (isConfirmed) {
            this.deleteLayer(this.selectedLayer.id);
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



    // STYLE MANAGEMENT METHODS
    // COLOR METHODS
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
    
    private cloneStyle(style: Style): Style {
        return new Style({
            image: style.getImage() ? style.getImage().clone() : undefined,
            fill: style.getFill() ? style.getFill() : undefined,
            stroke: style.getStroke() ? style.getStroke() : undefined,
        });
    }

    updateLayerColor(color: string): void {
        if (!this.MMapselectedLayer || !(this.MMapselectedLayer.style instanceof Style)) {
            console.error('Invalid layer or style');
            return;
        }

        const currentStyle = this.selectedLayer.style;
        const newStyle = this.cloneStyle(currentStyle);
        const geometryType = this.getGeometryType(this.MMapselectedLayer);

        switch (geometryType) {
            case 'MultiPoint':
            case 'Point':
                const image = newStyle.getImage();
                if (image instanceof Circle) {
                    image.setFill(new Fill({ color }));
                }
                break;
            case 'LineString':
            case 'MultiLineString':
                newStyle.getStroke().setColor(color);
                break;
            default:
                newStyle.setFill(new Fill({ color }));
        }

        this.applyNewStyle(newStyle);
    }

    private applyNewStyle(newStyle: Style): void {
        // if (this.preview){
        //     if (this.MMapselectedLayer && this.MMapselectedLayer.layer instanceof VectorLayer) {
        //         this.MMapselectedLayer.style = newStyle;
        //         this.MMapselectedLayer.layer.setStyle(() => newStyle);
        //         this.MMapselectedLayer.layer.changed();
        //     }
        // }
        // else{
        if (!this.preview) {

            // Apply the same style to the selectedLayer (principal map)
            if (this.selectedLayer && this.selectedLayer.layer instanceof VectorLayer) {
                this.MMapselectedLayer.style = newStyle;
                (this.MMapselectedLayer.layer as VectorLayer).setStyle(() => newStyle);
                this.MMapselectedLayer.layer.changed();
                this.selectedLayer.style = newStyle;
                this.selectedLayer.layer.setStyle(() => newStyle);
                this.selectedLayer.layer.changed();

                // Create a new reference to trigger ngOnChanges in MiniMapComponent
                this.MMapselectedLayer = { ...this.MMapselectedLayer };
            }
        }

        // Render the main map
        this._mapService.getMap().render();

        // Optionally, save the style to local storage or your backend
        // this._styleService.saveStyle(this.MMapselectedLayer.name, newStyle);
    }

    updateLayerStrokeColor(color: string): void {
        if (!this.MMapselectedLayer || !(this.MMapselectedLayer.style instanceof Style)) {
            console.error('Invalid layer or style');
            return;
        }

        const currentStyle = this.MMapselectedLayer.style;
        const newStyle = this.cloneStyle(currentStyle);
        const geometryType = this.getGeometryType(this.MMapselectedLayer);

        if (geometryType === 'Point' || geometryType === 'MultiPoint') {
            const image = newStyle.getImage();
            if (image instanceof Circle) {
                const currentStroke = image.getStroke();
                image.setStroke(new Stroke({
                    color: color,
                    width: currentStroke ? currentStroke.getWidth() : this.getLayerStrokeWidth()
                }));
            }
        } else {
            const currentStroke = currentStyle.getStroke();
            newStyle.setStroke(new Stroke({
                color: color,
                width: currentStroke ? currentStroke.getWidth() : this.getLayerStrokeWidth()
            }));
        }

        this.applyNewStyle(newStyle);
    }

    updateLayerStrokeWidth(width: number): void {
        if (!this.MMapselectedLayer || !(this.MMapselectedLayer.style instanceof Style)) {
            console.error('Invalid layer or style');
            return;
        }

        const currentStyle = this.MMapselectedLayer.style;
        const newStyle = this.cloneStyle(currentStyle);
        const geometryType = this.getGeometryType(this.MMapselectedLayer);

        if (geometryType === 'Point' || geometryType === 'MultiPoint') {
            const image = newStyle.getImage();
            if (image instanceof Circle) {
                const currentStroke = image.getStroke();
                image.setStroke(new Stroke({
                    color: currentStroke ? currentStroke.getColor() : 'black',
                    width: width
                }));
            }
        } else {
            const currentStroke = currentStyle.getStroke();
            newStyle.setStroke(new Stroke({
                color: currentStroke ? currentStroke.getColor() : 'black',
                width: width
            }));
        }

        this.applyNewStyle(newStyle);
    }
    //OPACITY METHODS
    updateLayerOpacity(opacity: number): void {
        if (this.MMapselectedLayer && this.MMapselectedLayer.layer) {
            this.MMapselectedLayer.layer.setOpacity(opacity);
            this.selectedLayer.layer.setOpacity(opacity);
            this.MMapselectedLayer.layer.changed();
            this.MMapselectedLayer = { ...this.MMapselectedLayer };
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
    getGeometryIcon(geometryType: string): string {
        const symbol = this.HavailableSymbols.find(s => s.label.toLowerCase() === geometryType.toLowerCase());
        return symbol ? symbol.icon : 'help_outline';
    }
    getSelectedSymbolIcon(): string {
        const symbol = this.availableSymbols.find(s => s.value === this.selectedSymbol);
        return symbol ? symbol.icon : '';
    }

    getSelectedSymbolLabel(): string {
        const symbol = this.availableSymbols.find(s => s.value === this.selectedSymbol);
        return symbol ? symbol.label : '';
    }

    createPointSymbolStyle(): Style {

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

        const image = new Icon({
            src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
            scale: 1, // We're setting the size in the SVG itself
            anchor: [0.5, 0.5], // Center the icon
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
        });

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

    //htmldisplay

    // getGeometryIcon(geometryType: string): string {
    //     const iconMap: { [key: string]: string } = {
    //       'Point': 'geo-point',
    //       'MultiPoint': 'geo-multipoint',
    //       'LineString': 'geo-linestring',
    //       'MultiLineString': 'geo-multilinestring',
    //       'Polygon': 'geo-polygon',
    //       'MultiPolygon': 'geo-multipolygon',
    //       'GeometryCollection': 'geo-collection'
    //     };

    //     return iconMap[geometryType] || 'help_outline';
    //   }
    //display geometry with lisible format
    getGeometryType(layer: CustomLayer): string {
        return this._layersService.getGeometryType(layer)
    }

    formatLayerName(name: string): string {
        const parts = name.split('_');
        if (parts.length > 1) {
            return this.capitalize(parts[parts.length - 1]);
        } else {
            return this.capitalize(name);
        }
    }


    toggleImportPanel(): void {
        this._quickChatService.isImportPanelVisible = !this._quickChatService.isImportPanelVisible;
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    openFileInput(): void {
        this._importService.openFileInput();
    }

    openAttributeTable(layerId: string) {
        const layer = this._layersService.getLayerById(layerId);
        this._attributeTableService.openAttributeTable(layer);
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
        if (this.opened) {
            // Clear the selected layer when closing the panel
            this.selectedLayer = null;
            this.MMapselectedLayer = null; // Also clear this if you're using it
        }
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
    isExpandedView: boolean = false;
    // toggleExpandedView(event: Event): void {
    //     event.stopPropagation();
    //     this.isExpandedView = !this.isExpandedView;

    //     this._changeDetectorRef.markForCheck();
    //   }

    toggleExpandedView(): void {
        this.isExpandedView = !this.isExpandedView;
    }

    expanded = false;

    toggleExpanded() {
        if (!this.opened) {
            this.expanded = !this.expanded;
        }
    }
    /////////////////////tools
    preview = false; // Initially false
    savepressed = false;

    togglePreviewMode() {
        this.preview = !this.preview;
        console.log(`Preview Mode is now ${this.preview ? 'activated' : 'deactivated'}`);
    }

    goBackward() {
        console.log('Navigating backward');
    }

    saveMapState() {
        console.log('Map state saved');
    }

    goForward() {
        console.log('Navigating forward');
    }

    navigateToMiniMap() {
        console.log('Navigating to Mini Map');
    }
}

