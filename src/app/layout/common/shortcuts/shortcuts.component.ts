import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    Input,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormsModule,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ShortcutsService } from 'app/layout/common/shortcuts/shortcuts.service';
import { Shortcut } from 'app/layout/common/shortcuts/shortcuts.types';
import { MapService } from 'app/modules/admin/services/map.service';
import { Subject, takeUntil } from 'rxjs';
import { MatDialogModule } from '@angular/material/dialog';
import { ImportService } from '../local-import/import.service';

@Component({
    selector: 'shortcuts',
    templateUrl: './shortcuts.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'shortcuts',
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        NgClass,
        NgTemplateOutlet,
        RouterLink,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSlideToggleModule,
    ],
})
export class ShortcutsComponent implements OnInit, OnDestroy {
    @Input() tooltip: string;
    @ViewChild('shortcutsOrigin') private _shortcutsOrigin: MatButton;
    @ViewChild('shortcutsPanel') private _shortcutsPanel: TemplateRef<any>;

    mode: 'view' | 'modify' | 'add' | 'edit' = 'view';
    shortcutForm: UntypedFormGroup;
    shortcuts: Shortcut[];
    private _overlayRef: OverlayRef;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _formBuilder: UntypedFormBuilder,
        private _shortcutsService: ShortcutsService,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
        private mapService: MapService,
        private importService: ImportService
    ) {}

    
    ngOnInit(): void {
        // Initialize the form
        this.shortcutForm = this._formBuilder.group({
            id: [null],
            label: ['', Validators.required],
            description: [''],
            icon: ['', Validators.required],
            link: ['', Validators.required],
            useRouter: ['', Validators.required],
            type: ['', Validators.required],
        });

        // Get the shortcuts
        this._shortcutsService.shortcuts$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((shortcuts: Shortcut[]) => {
                this.shortcuts = shortcuts;
                this._changeDetectorRef.markForCheck();
            });
    }
    
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        if (this._overlayRef) {
            this._overlayRef.dispose();
        }
    }
    
    groupShortcuts(): { [key: string]: Shortcut[] } {
        return this.shortcuts.reduce((groups, shortcut) => {
            const type = shortcut.type || 'other';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(shortcut);
            return groups;
        }, { mapRelated: [], other: [] } as { [key: string]: Shortcut[] });
    }
    
    /**
     * On destroy
    
    
    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------
    
    /**
     * Open the shortcuts panel
    */
   openPanel(): void {
       // Return if the shortcuts panel or its origin is not defined
       if (!this._shortcutsPanel || !this._shortcutsOrigin) {
           return;
        }
        
        // Make sure to start in 'view' mode
        this.mode = 'view';

        // Create the overlay if it doesn't exist
        if (!this._overlayRef) {
            this._createOverlay();
        }
        
        // Attach the portal to the overlay
        this._overlayRef.attach(
            new TemplatePortal(this._shortcutsPanel, this._viewContainerRef)
        );
    }

    /**
     * Close the shortcuts panel
     */
    closePanel(): void {
        this._overlayRef.detach();
    }
    
    /**
     * Change the mode
    */
   changeMode(mode: 'view' | 'modify' | 'add' | 'edit'): void {
       // Change the mode
       this.mode = mode;
    }

    /**
     * Prepare for a new shortcut
    */
    newShortcut(): void {
        // Reset the form
        this.shortcutForm.reset();
        
        // Enter the add mode
        this.mode = 'add';
    }

    /**
     * Edit a shortcut
    */
    editShortcut(shortcut: Shortcut): void {
        // Reset the form with the shortcut
        this.shortcutForm.reset(shortcut);
        
        // Enter the edit mode
        this.mode = 'edit';
    }

    /**
     * Save shortcut
     */
    save(): void {
        // Get the data from the form
        const shortcut = this.shortcutForm.value;

        // If there is an id, update it...
        if (shortcut.id) {
            this._shortcutsService.update(shortcut.id, shortcut).subscribe();
        }
        // Otherwise, create a new shortcut...
        else {
            this._shortcutsService.create(shortcut).subscribe();
        }

        // Go back the modify mode
        this.mode = 'modify';
    }

    /**
     * Delete shortcut
     */
    delete(): void {
        // Get the data from the form
        const shortcut = this.shortcutForm.value;

        // Delete
        this._shortcutsService.delete(shortcut.id).subscribe();

        // Go back the modify mode
        this.mode = 'modify';
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
    */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }
    
    onBackgroundChange(selectedValue: string): void {
        this.mapService.onBackgroundChange(selectedValue);
    }

    openFileInput() : void {
        this.importService.openFileInput();
        this.closePanel();
    }
    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------
    
    /**
     * Create the overlay
     */
    private _createOverlay(): void {
        // Create the overlay
        this._overlayRef = this._overlay.create({
            hasBackdrop: true,
            backdropClass: 'fuse-backdrop-on-mobile',
            scrollStrategy: this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay
                .position()
                .flexibleConnectedTo(
                    this._shortcutsOrigin._elementRef.nativeElement
                )
                .withLockedPosition(true)
                .withPush(true)
                .withPositions([
                    {
                        originX: 'start',
                        originY: 'bottom',
                        overlayX: 'start',
                        overlayY: 'top',
                    },
                    {
                        originX: 'start',
                        originY: 'top',
                        overlayX: 'start',
                        overlayY: 'bottom',
                    },
                    {
                        originX: 'end',
                        originY: 'bottom',
                        overlayX: 'end',
                        overlayY: 'top',
                    },
                    {
                        originX: 'end',
                        originY: 'top',
                        overlayX: 'end',
                        overlayY: 'bottom',
                    },
                ]),
        });

        // Detach the overlay from the portal on backdrop click
        this._overlayRef.backdropClick().subscribe(() => {
            this._overlayRef.detach();
        });
    }
}
