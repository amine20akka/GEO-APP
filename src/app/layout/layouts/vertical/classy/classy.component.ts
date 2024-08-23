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
import { ImportService } from 'app/layout/common/import/import.service';
import { MatTooltipModule } from '@angular/material/tooltip';
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
        LanguagesComponent,
        FuseFullscreenComponent,
        SearchComponent,
        ShortcutsComponent,
        MessagesComponent,
        RouterOutlet,
        QuickChatComponent,
        DistanceComponent,
        SurfaceComponent
    ],
})
export class ClassyLayoutComponent implements OnInit, OnDestroy {
    @ViewChild(ShortcutsComponent) shortcutsComponent: ShortcutsComponent;
    @ViewChild('printDialog') printDialog: TemplateRef<any>;

    isScreenSmall: boolean;
    navigation: Navigation;
    user: User;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private dialogRef: MatDialogRef<any>;

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _navigationService: NavigationService,
        private _userService: UserService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private _importService: ImportService,
        private mapService: MapService,
        private layersService: LayersService,
        private dialog: MatDialog
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

    openFileInput(): void {
        this._importService.openFileInput();
    }

    openShortcuts(): void {
        this.shortcutsComponent?.openPanel();
    }

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

            // Proceed with printing based on the selected option
            if (result === 'current') {
                console.log('Printing current view');
            } else if (result === 'extended') {
                console.log('Printing extended view');
            }

            const pmap = this.mapService.getMap();
            console.log('Map obtained:', pmap);

            const layers: CustomLayer[] = await firstValueFrom(this.layersService.layers$);
            console.log('Layers obtained:', layers);

            if (!pmap || !layers) {
                console.error("La carte ou les couches ne sont pas disponibles.");
                return;
            }

            const fenetreImpression: Window | null = window.open('', '_blank', 'height=600,width=800');
            
            if (fenetreImpression) {
                let mapImage: string;
                const originalCenter = pmap.getView().getCenter();
                const originalZoom = pmap.getView().getZoom();
                
                if (result === 'current') {
                    console.log('Capturing current view');
                    const mapCanvas = pmap.getViewport().querySelector('canvas');
                    if (!mapCanvas) {
                        console.error("L'élément canvas de la carte n'a pas été trouvé.");
                        return;
                    }
                    mapImage = (mapCanvas as HTMLCanvasElement).toDataURL('image/png');
                } else {
                    console.log('Capturing extended view');
                    const extent = this.getLayersExtent(layers);
                    pmap.getView().fit(extent, { padding: [50, 50, 50, 50] });
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const mapCanvas = pmap.getViewport().querySelector('canvas');
                    mapImage = (mapCanvas as HTMLCanvasElement).toDataURL('image/png');
                    pmap.getView().setCenter(originalCenter);
                    pmap.getView().setZoom(originalZoom);
                }

                const date = new Date().toLocaleDateString();
                fenetreImpression.document.write(`
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
                            }
                            .layer-item:last-child { border-bottom: none; }
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
                            ${layers.map(layer => `
                                <div class="layer-item">
                                    ${layer.name} (${this.layersService.getOpenLayersLegend(layer)})
                                </div>
                            `).join('')}
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

    private getLayersExtent(layers: CustomLayer[]): Extent {
        let extent: Extent = [Infinity, Infinity, -Infinity, -Infinity];
        layers.forEach(layer => {
            if (layer.layer instanceof VectorLayer) {
                const layerExtent = layer.layer.getSource().getExtent();
                extent[0] = Math.min(extent[0], layerExtent[0]);
                extent[1] = Math.min(extent[1], layerExtent[1]);
                extent[2] = Math.max(extent[2], layerExtent[2]);
                extent[3] = Math.max(extent[3], layerExtent[3]);
            }
        });
        return extent;
    }
}