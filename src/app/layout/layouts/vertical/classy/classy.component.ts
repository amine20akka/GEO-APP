import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { FuseFullscreenComponent } from '@fuse/components/fullscreen';
import { FuseLoadingBarComponent } from '@fuse/components/loading-bar';
import {
    FuseNavigationService,
    FuseVerticalNavigationComponent,
} from '@fuse/components/navigation';
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
import { Subject, takeUntil } from 'rxjs';
import { ImportService } from 'app/layout/common/import/import.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'classy-layout',
    templateUrl: './classy.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        FuseLoadingBarComponent,
        FuseVerticalNavigationComponent,
        NotificationsComponent,
        UserComponent,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        LanguagesComponent,
        FuseFullscreenComponent,
        SearchComponent,
        ShortcutsComponent,
        MessagesComponent,
        RouterOutlet,
        QuickChatComponent,
        DistanceComponent,
        SurfaceComponent,
    ],
})
export class ClassyLayoutComponent implements OnInit, OnDestroy {
    @ViewChild(ShortcutsComponent) shortcutsComponent: ShortcutsComponent;

    isScreenSmall: boolean;
    navigation: Navigation;
    user: User;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _navigationService: NavigationService,
        private _userService: UserService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private _importService: ImportService,
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for current year
     */
    get currentYear(): number {
        return new Date().getFullYear();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Subscribe to navigation data
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) => {
                this.navigation = navigation;
            });

        // Subscribe to the user service
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user;
            });

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                // Check if the screen is small
                this.isScreenSmall = !matchingAliases.includes('md');
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------
    
    openFileInput() : void {
        this._importService.openFileInput();
    }
    
    openShortcuts(): void {
        if (this.shortcutsComponent) {
            this.shortcutsComponent.openPanel();
        }
    }
    /**
     * Toggle navigation
     *
     * @param name
     */
    toggleNavigation(name: string): void {
        // Get the navigation
        const navigation =
            this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(
                name
            );

        if (navigation) {
            // Toggle the opened status
            navigation.toggle();
        }
    }

    
    imprimerCarte(): void {
        // Créer une nouvelle fenêtre pour l'impression
        const fenetreImpression: Window | null = window.open('', 'Impression Carte', 'height=600,width=800');
        
        if (fenetreImpression) {
          // Récupérer l'élément de la carte
          const mapElement: HTMLElement | null = document.getElementById('map');
          
          if (mapElement) {
            // Obtenir les dimensions de l'élément de la carte
            const style = window.getComputedStyle(mapElement);
            const width = style.width;
            const height = style.height;
      
            // Écrire le contenu HTML dans la nouvelle fenêtre
            fenetreImpression.document.write(`
              <html>
                <head>
                  <title>Impression Carte</title>
                  <style>
                    .map-container {
                      width: ${width};
                      height: ${height};
                      border: 1px solid black;
                    }
                  </style>
                </head>
                <body>
                  <div class="map-container"></div>
                </body>
              </html>
            `);
            
            fenetreImpression.document.close();
            fenetreImpression.focus();
            
            // Lancer l'impression
            fenetreImpression.print();
            
            // Fermer la fenêtre après l'impression
            setTimeout(() => {
              fenetreImpression.close();
            }, 500);
          } else {
            console.error("L'élément de la carte n'a pas été trouvé.");
          }
        } else {
          console.error("Impossible d'ouvrir la fenêtre d'impression.");
        }
      }
}
