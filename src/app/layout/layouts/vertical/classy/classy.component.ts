import { Component, OnDestroy, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { FuseFullscreenComponent } from '@fuse/components/fullscreen';
import { FuseLoadingBarComponent } from '@fuse/components/loading-bar';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { Navigation } from 'app/core/navigation/navigation.types';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { DistanceComponent } from 'app/layout/common/distance/distance.component';
import { SurfaceComponent } from 'app/layout/common/surface/surface.component';
import { LanguagesComponent } from 'app/layout/common/languages/languages.component';
import { MessagesComponent } from 'app/layout/common/messages/messages.component';
import { NotificationsComponent } from 'app/layout/common/notifications/notifications.component';
import { QuickChatComponent } from 'app/layout/common/quick-chat/quick-chat.component';
import { SearchComponent } from 'app/layout/common/search/search.component';
import { ShortcutsComponent } from 'app/layout/common/shortcuts/shortcuts.component';
import { UserComponent } from 'app/layout/common/user/user.component';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CircleComponent } from 'app/layout/common/circle/circle.component';
import { MatMenuModule } from '@angular/material/menu';
import { LayersFilterComponent } from 'app/layout/common/layers-filter/layers-filter.component';
import { ServerImportComponent } from 'app/layout/common/server-import/server-import.component';
import { QuickChatService } from 'app/layout/common/quick-chat/quick-chat.service';
import { ViewHistoryService } from 'app/layout/common/view-history/view-history.service';
import { AsyncPipe } from '@angular/common';
import { CustomLayer } from 'app/layout/common/quick-chat/quick-chat.types';
import { MapService } from 'app/modules/admin/services/map.service';
import { LayersService } from 'app/modules/admin/services/layers.service';
import { Feature } from 'ol';
import { Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import { Style } from 'ol/style';
import OlMap from 'ol/Map';
import { Extent } from 'ol/extent';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ImportService } from 'app/layout/common/local-import/import.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'classy-layout',
    templateUrl: './classy.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        FuseLoadingBarComponent,
        FuseVerticalNavigationComponent,
        NotificationsComponent,
        UserComponent,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatMenuModule,
        LanguagesComponent,
        FuseFullscreenComponent,
        SearchComponent,
        ShortcutsComponent,
        MessagesComponent,
        RouterOutlet,
        QuickChatComponent,
        DistanceComponent,
        SurfaceComponent,
        CircleComponent,
        LayersFilterComponent,
        ServerImportComponent,
        AsyncPipe,
    ],
})
export class ClassyLayoutComponent implements OnInit, OnDestroy {
    @ViewChild(ShortcutsComponent) shortcutsComponent: ShortcutsComponent;
    @ViewChild('printDialog') printDialog: TemplateRef<any>;

    isScreenSmall: boolean;
    navigation: Navigation;
    user: User;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    isMeasurementPanelVisible = false;
    isFilterPanelVisible = false;
    private dialogRef: MatDialogRef<any>;

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _navigationService: NavigationService,
        private _userService: UserService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private _importService: ImportService,
        public _mapService: MapService,
        public _quickChatService: QuickChatService,
        public _viewHistoryService: ViewHistoryService,
        private _layersService: LayersService,
        private dialog: MatDialog,
        private sanitizer: DomSanitizer

    ) {}

    get currentYear(): number {
        return new Date().getFullYear();
    }

    ngOnInit(): void {
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) => {
                this.navigation = navigation;
            });

        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user;
            });

        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    openFileInput(): void {
        this._importService.openFileInput();
    }

    geolocate(): void {
        this._mapService.geolocate();
        this._mapService.isGeolocationActive = !this._mapService.isGeolocationActive;
    }

    openShortcuts(): void {
        this.shortcutsComponent?.openPanel();
    }

    toggleMeasurementPanel(): void {
        this.isMeasurementPanelVisible = !this.isMeasurementPanelVisible;
    }

    toggleFilterPanel(): void {
        this.isFilterPanelVisible = !this.isFilterPanelVisible;
    }

    toggleImportPanel(): void {
        this._quickChatService.isImportPanelVisible = !this._quickChatService.isImportPanelVisible;
    }

    goToPreviousView() {
        this._viewHistoryService.goToPreviousView();
    }

    goToNextView() {
        this._viewHistoryService.goToNextView();
    }

    /**
     * Toggle navigation
     *
     * @param name
     */
    toggleNavigation(name: string): void {
        const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(name);
        navigation?.toggle();
    }

    closeDialog(result?: string): void {
        this.dialogRef.close(result);
    }

    async imprimerCarte(): Promise<void> {
        console.log('imprimerCarte method started');
        this.dialogRef = this.dialog.open(this.printDialog, {
            width: '400px',
            disableClose: true
        });
        
        try {
            const result = await this.dialogRef.afterClosed().toPromise();
            console.log('Dialog closed with result:', result);
    
            if (result === undefined) {
                console.log('Print canceled');
                return;
            }
    
            console.log('Print option selected:', result);
    
            const pmap = this._mapService.getMap();
            console.log('Map obtained:', pmap);
    
            if (!pmap) {
                console.error("La carte n'est pas disponible.");
                return;
            }
    
            // Wait for the map to be fully loaded
            await new Promise<void>((resolve) => {
                if (pmap.getLayers().getLength() > 0) {
                    resolve();
                } else {
                    pmap.once('rendercomplete', () => resolve());
                }
            });
    
            const layers: CustomLayer[] = await firstValueFrom(this._layersService.layers$);
            console.log('Layers obtained:', layers);
    
            const fenetreImpression: Window | null = window.open('', '_blank', 'height=600,width=800');
            
            if (fenetreImpression) {
                let mapImage: string;
                const originalCenter = pmap.getView().getCenter();
                const originalZoom = pmap.getView().getZoom();
                
                const captureMap = async () => {
                    return new Promise<string>((resolve) => {
                        setTimeout(() => {
                            const mapCanvas = pmap.getViewport().querySelector('canvas');
                            if (mapCanvas) {
                                resolve((mapCanvas as HTMLCanvasElement).toDataURL('image/png'));
                            } else {
                                console.error("Canvas element not found");
                                resolve('');
                            }
                        }, 500); // Add a 500ms delay
                    });
                };
    
                if (result === 'current') {
                    console.log('Capturing current view');
                    mapImage = await captureMap();
                } else {
                    console.log('Capturing extended view');
                    const extent = this.getLayersExtent(layers);
                    if (extent) {
                        pmap.getView().fit(extent, { padding: [50, 50, 50, 50] });
                        await new Promise(resolve => setTimeout(resolve, 500)); // Add delay after fitting
                        mapImage = await captureMap();
                        pmap.getView().setCenter(originalCenter);
                        pmap.getView().setZoom(originalZoom);
                    } else {
                        console.error("No valid extent found for layers");
                        mapImage = await captureMap(); // Fallback to current view
                    }
                }
    
                if (!mapImage) {
                    console.error("Failed to capture map image");
                    return;
                }
    
                const date = new Date().toLocaleDateString();
                const layersHtml = layers.filter(layer => layer.layer.getVisible()).map(layer => {
                    const legendHtml = this._layersService.getOpenLayersLegend(layer);
                    const legendElement = this.sanitizer.sanitize(1, legendHtml) || '';
                    return `
                        <div class="layer-item">
                            <span class="layer-name">${layer.title}</span>
                            <span class="layer-legend">${legendElement}</span>
                        </div>
                    `;
                }).join('');                fenetreImpression.document.write(`
                    <!DOCTYPE html>
                    <html lang="fr">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Carte - ${date}</title>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
                            body { 
                                font-family: 'Roboto', sans-serif; 
                                line-height: 1.6;
                                color: #333;
                                max-width: 210mm;
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .header { 
                                display: flex; 
                                justify-content: space-between; 
                                align-items: center;
                                margin-bottom: 20px;
                                border-bottom: 2px solid #007bff;
                                padding-bottom: 10px;
                            }
                            .logo { font-size: 24px; font-weight: bold; color: #007bff; }
                            .date { font-size: 14px; color: #666; }
                            .map-container { 
                                width: 100%; 
                                max-width: 800px; 
                                margin: 0 auto;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            }
                            .map-image { 
                                width: 100%; 
                                border: 1px solid #ccc; 
                                border-radius: 4px;
                            }
                            .layers-list { 
                                margin-top: 20px; 
                                background-color: #f8f9fa;
                                border-radius: 4px;
                                padding: 15px;
                            }
                            .layers-title {
                                font-size: 18px;
                                font-weight: bold;
                                margin-bottom: 10px;
                                color: #007bff;
                            }
                            .layer-item { 
                                margin-bottom: 5px;
                                padding: 5px 0;
                                border-bottom: 1px solid #e9ecef;
                                display: flex;
                                align-items: center;
                            }
                            .layer-item:last-child { border-bottom: none; }
                            .layer-name { flex: 1; }
                            .layer-legend { margin-left: 10px; }
                            .footer {
                                margin-top: 20px;
                                text-align: center;
                                font-size: 12px;
                                color: #666;
                            }
                            @media print {
                                body { -webkit-print-color-adjust: exact; }
                                .map-container { box-shadow: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">Carte GIS</div>
                            <div class="date">${date}</div>
                        </div>
                        <div class="map-container">
                            <img src="${mapImage}" alt="Carte" class="map-image">
                        </div>
                        <div class="layers-list">
                            <div class="layers-title">Couches actives</div>
                            ${layersHtml}
                        </div>
                        <div class="footer">
                            Ce document a été généré automatiquement. © ${new Date().getFullYear()} Stage d'été: Aymen derbel , Amin Akrimi
                        </div>
                    </body>
                    </html>
                `);
                
                fenetreImpression.document.close();
            
                console.log('Print window prepared, initiating print');
                setTimeout(() => {
                    fenetreImpression.print();
                    setTimeout(() => {
                        fenetreImpression.close();
                    }, 500);
                }, 250);
            } else {
                console.error("Impossible d'ouvrir la fenêtre d'impression.");
            }
        } catch (error) {
            console.error("Erreur lors de l'impression:", error);
        }
    }
    
    
    private getLayersExtent(layers: CustomLayer[]): Extent | undefined {
        let extent: Extent = [Infinity, Infinity, -Infinity, -Infinity];
        let hasValidExtent = false;
        layers.forEach(layer => {
            if (layer.layer instanceof VectorLayer && layer.layer.getVisible()) {
                const layerExtent = layer.layer.getSource().getExtent();
                if (layerExtent.every(value => isFinite(value))) {
                    extent[0] = Math.min(extent[0], layerExtent[0]);
                    extent[1] = Math.min(extent[1], layerExtent[1]);
                    extent[2] = Math.max(extent[2], layerExtent[2]);
                    extent[3] = Math.max(extent[3], layerExtent[3]);
                    hasValidExtent = true;
                }
            }
        });
        return hasValidExtent ? extent : undefined;
    }

    // getGeometryType(layer: CustomLayer): string {
    //     if (layer && layer.layer instanceof VectorLayer) {
    //         const source = layer.layer.getSource();
    //         const features = source.getFeatures();

    //         if (features.length > 0) {
    //             const geometry = features[0].getGeometry();
    //             if (geometry instanceof Point) return 'Point';
    //             if (geometry instanceof MultiPoint) return 'MultiPoint';
    //             if (geometry instanceof LineString) return 'LineString';
    //             if (geometry instanceof MultiLineString) return 'MultiLineString';
    //             if (geometry instanceof Polygon) return 'Polygon';
    //             if (geometry instanceof MultiPolygon) return 'MultiPolygon';
    //             if (geometry instanceof GeometryCollection) return 'GeometryCollection';

    //             return geometry ? geometry.getType() : 'Unknown';
    //         } else {
    //             const style = layer.layer.getStyle();
    //             if (typeof style === 'function') {
    //                 const dummyFeature = new Feature();
    //                 const appliedStyle = style(dummyFeature, 1);
    //                 if (appliedStyle instanceof Style) {
    //                     if (appliedStyle.getImage()) return 'Point';
    //                     if (appliedStyle.getStroke() && !appliedStyle.getFill()) return 'LineString';
    //                     if (appliedStyle.getFill()) return 'Polygon';
    //                 }
    //             }
    //         }
    //     }
    //     return 'Unknown';
    // }

    // private getLayersExtent(layers: CustomLayer[]): Extent {
    //     let extent: Extent = [Infinity, Infinity, -Infinity, -Infinity];
    //     layers.forEach(layer => {
    //         if (layer.layer instanceof VectorLayer) {
    //             const layerExtent = layer.layer.getSource().getExtent();
    //             extent[0] = Math.min(extent[0], layerExtent[0]);
    //             extent[1] = Math.min(extent[1], layerExtent[1]);
    //             extent[2] = Math.max(extent[2], layerExtent[2]);
    //             extent[3] = Math.max(extent[3], layerExtent[3]);
    //         }
    //     });
    //     return extent;
    // }
}