import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DOCUMENT, DatePipe, NgClass, NgTemplateOutlet, PercentPipe } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    HostBinding,
    Inject,
    NgZone,
    OnDestroy,
    OnInit,
    Renderer2,
    ViewChild,
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
import { QuickChatService } from 'app/layout/common/quick-chat/quick-chat.service';
import { Chat, Layer } from 'app/layout/common/quick-chat/quick-chat.types';
import { LayersService } from 'app/modules/admin/services/layers.service';
import { MapService } from 'app/modules/admin/services/map.service';
import { catchError, from, of, Subject, takeUntil } from 'rxjs';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ColorPieChartComponentComponent } from '../color-pie-chart-component/color-pie-chart-component.component';

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
    
    ],
})
export class QuickChatComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('messageInput') messageInput: ElementRef;
    chat: Chat;
    chats: Chat[];
    opened: boolean = false;
    selectedChat: Chat;
    layers: Layer[] = [];
    selectedLayer: Layer;
    clicked: boolean = false;
    draggedOverIndex: number | null = null;
    map: Map;
    wmsLayer: ImageLayer<ImageWMS>;
    activeTab: 'color' | 'opacity' = 'color';
    isDragging: boolean = false;
    isOverDelete: boolean = false;

    private _mutationObserver: MutationObserver;
    private _scrollStrategy: ScrollStrategy = this._scrollStrategyOptions.block();
    private _overlay: HTMLElement;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _elementRef: ElementRef,
        private _renderer2: Renderer2,
        private _ngZone: NgZone,
        private _quickChatService: QuickChatService,
        private _scrollStrategyOptions: ScrollStrategyOptions,
        private _layersService: LayersService,
        private _mapService: MapService,
        private dialog: MatDialog
    ) {}

    @HostBinding('class') get classList(): any {
        return {
            'quick-chat-opened': this.opened,
        };
    }

//     setActiveTab(event: MatTabChangeEvent) {
//     this.activeTab = event.index === 0 ? 'color' : 'opacity';
//   }

//   updateLayerColor(color: string) {
//     this.selectedLayer.color = color;
//     // Add any additional logic for updating the layer
//   }
setActiveTab(tab: 'color' | 'opacity') {
    this.activeTab = tab;
  }

  updateLayerColor(color: string) {
    if (this.selectedLayer) {
        this.selectedLayer.color = color;
        console.log('Updated layer color:', color);
        // If you're using a service to manage layers, update it there as well
        // this._layersService.updateLayerColor(this.selectedLayer.name, color);
    }
}

  updateLayerOpacity(event: Event) {
    const opacity = (event.target as HTMLInputElement).value;
    if (this.selectedLayer) {
      this.selectedLayer.opacity = parseFloat(opacity);
      // Add any additional logic for updating the layer
      console.log('Updated layer opacity:', this.selectedLayer.opacity);
    }
  }
//   updateLayerOpacity(opacity: number) {
//     this.selectedLayer.opacity = opacity;
//     // Add any additional logic for updating the layer
//   }

  formatOpacity(value: number): string {
    return `${(value * 100).toFixed(0)}%`;
  }

    ngOnInit(): void {
        this.fetchLayers();
        
        this._quickChatService.chat$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((chat: Chat) => {
                this.chat = chat;
            });

        this._quickChatService.chats$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((chats: Chat[]) => {
                this.chats = chats;
            });

        this.initMap();
    }


    initMap(): void {
        this.map = new Map({
            target: 'map3d',
            layers: [
                new TileLayer({
                    source: new OSM()
                })
            ],
            view: new View({
                center: [0, 0],
                zoom: 2
            })
        });
    }
//output JSON{ sld , ressources}
    fetchLayers(): void {
        const workspace = 'test_data';
        from(this._layersService.fetchLayersFromWorkspace(workspace))
            .pipe(
                catchError(error => {
                    console.error('Error fetching layers:', error);
                    return of(null);
                })
            )
            .subscribe(
                data => {
                    if (data) {
                        this._layersService.processWorkspaceLayersData(data, this.addLayer.bind(this));
                    }
                }
            );
    }

    // updateLayerOpacity(event: any): void {
        
    //     if (this.selectedLayer) {
    //         this.selectedLayer.opacity = event.target.value;
    //     }
    // }
    addLayer(name: string): void {
        this.layers.push({ name, isClicked: false, zIndex: this.layers.length, opacity: 1, color: '' });
    }
    
    selectLayer(layer: Layer): void {
        this.selectedLayer = layer;
        
        if (!this.opened) {
            console.log(layer);
            if (!layer.isClicked) {
                this._mapService.addWMSLayer(layer.name);
                layer.isClicked = true;
            } else {
                this._mapService.removeWMSLayer(layer.name);
                layer.isClicked = false;
            }
        }

        console.log(this.selectedLayer)
    }

    onDragOverDelete(event: DragEvent) {
        event.preventDefault();
        this.isOverDelete = true;
    }

    onDragLeaveDelete(event: DragEvent) {
        this.isOverDelete = false;
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
      
      deleteLayer(index: number) {
        const layerToDelete = this.layers[index];
        this.layers.splice(index, 1);
        this._mapService.removeWMSLayer(layerToDelete.name);
        
        // Update z-indexes for remaining layers
        this.layers.forEach((layer, i) => {
          layer.zIndex = this.layers.length - i - 1;
        });
      
        const newOrder = this.layers.map(layer => ({name: layer.name, zIndex: layer.zIndex}));
        this._mapService.reorderLayers(newOrder);
      }

    onDragStart(event: DragEvent, index: number) {
        event.dataTransfer.setData('text/plain', index.toString());
        this.draggedOverIndex = null;
        this.isDragging = true;
    }

    onDragEnd(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    this.isOverDelete = false;
    this.draggedOverIndex = null;
}

    onDragOver(event: DragEvent, index: number) {
        event.preventDefault();
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
    
            // Update z-indexes
            this.layers.forEach((layer, index) => {
                layer.zIndex = this.layers.length - index - 1;
            });
    
            const newOrder = this.layers.map(layer => ({name: layer.name, zIndex: layer.zIndex}));
            this._mapService.reorderLayers(newOrder);
        }
        this.draggedOverIndex = null;
        this.isDragging = false;  // Add this line to hide the delete button
    }
// setActiveTab(tab: 'color' | 'opacity'): void {
//     this.activeTab = tab;
// }

   
    ngAfterViewInit(): void {
        this._mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const mutationTarget = mutation.target as HTMLElement;
                if (mutation.attributeName === 'class') {
                    if (mutationTarget.classList.contains('cdk-global-scrollblock')) {
                        const top = parseInt(mutationTarget.style.top, 10);
                        this._renderer2.setStyle(
                            this._elementRef.nativeElement,
                            'margin-top',
                            `${Math.abs(top)}px`
                        );
                    } else {
                        this._renderer2.setStyle(
                            this._elementRef.nativeElement,
                            'margin-top',
                            null
                        );
                    }
                }
            });
        });
        this._mutationObserver.observe(this._document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    ngOnDestroy(): void {
        this._mutationObserver.disconnect();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
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

    selectChat(id: string): void {
        this._toggleOpened(true);
        this._quickChatService.getChatById(id).subscribe();
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
}