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

import { ColorPieChartComponentComponent } from '../color-pie-chart-component/color-pie-chart-component.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomLayer } from './quick-chat.types';
import { FilterLayersPipe } from 'app/modules/admin/filter-layers-pipe/filter-layers.pipe';
import { ImportService } from '../import/import.service';
import { StyleService } from 'app/modules/admin/services/style.service';
import { AttributeTableService } from './attribute-table/attribute-table.service';
import Feature from 'ol/Feature';
import { MatDialogModule } from '@angular/material/dialog';

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
        MatDialogModule,
        FilterLayersPipe,
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
        private _attributeTableService: AttributeTableService,
    ) { }

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
    // setActiveTab(tab: 'color' | 'opacity') {
    //     this.activeTab = tab;
    // }

    //   updateLayerColor(color: string) {
    //     if (this.selectedLayer) {
    //         this.selectedLayer.color = color;
    //         console.log('Updated layer color:', color);
    //         // If you're using a service to manage layers, update it there as well
    //         // this._layersService.updateLayerColor(this.selectedLayer.name, color);
    //     }
    // }

    //   updateLayerOpacity(event: Event) {
    //     const opacity = (event.target as HTMLInputElement).value;
    //     if (this.selectedLayer) {
    //       this.selectedLayer.opacity = parseFloat(opacity);
    //       // Add any additional logic for updating the layer
    //       console.log('Updated layer opacity:', this.selectedLayer.opacity);
    //     }
    //   }
    //   updateLayerOpacity(opacity: number) {
    //     this.selectedLayer.opacity = opacity;
    //     // Add any additional logic for updating the layer
    //   }

    // formatOpacity(value: number): string {
    //     return `${(value * 100).toFixed(0)}%`;
    // }

    
    ngOnInit(): void {
        
        this.layersSubscription = this._layersService.layers$.subscribe(layers => {
            this.layers = layers;
        });
        
    }
    
    
    ngOnDestroy(): void {
        this.layersSubscription.unsubscribe();
        this._mutationObserver.disconnect();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
    
    onLayerVisibilityChange(layerId: string): void {
        this._layersService.onLayerVisibilityChange(layerId);
    }

    openFileInput() : void {
        this._importService.openFileInput();
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

    openAttributeTable(layerId: string) {
        const layer = this._layersService.getLayerById(layerId);
        this._attributeTableService.openAttributeTable(layer);
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
}