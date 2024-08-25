import { Injectable } from '@angular/core';
import { MapService } from 'app/modules/admin/services/map.service';
import { View } from 'ol';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ViewHistoryService {
  private previousViewsSubject = new BehaviorSubject<View[]>([]);
  private nextViewsSubject = new BehaviorSubject<View[]>([]);
  private currentView: View;
  private isTrackingChanges = true;
  private saveViewTimeout: any;

  constructor(private mapService: MapService) {}

  trackViewChanges(): void {
    const view = this.mapService.getMap().getView();
    view.on('change:center', () => this.saveCurrentViewDelayed());
    view.on('change:resolution', () => this.saveCurrentViewDelayed());
    view.on('change:rotation', () => this.saveCurrentViewDelayed());
  }

  saveCurrentViewDelayed(): void {
    if (this.saveViewTimeout) {
      clearTimeout(this.saveViewTimeout);
    }
    this.saveViewTimeout = setTimeout(() => {
      this.saveCurrentView();
    }, 500); // Délai en millisecondes
  }

  saveCurrentView(): void {
    if (this.isTrackingChanges) {
      const view = this.mapService.getMap().getView();
      const newView = new View({
        center: view.getCenter(),
        zoom: view.getZoom(),
        rotation: view.getRotation()
      });

      if (!this.isViewEqual(this.currentView, newView)) {
        if (this.currentView) {
          this.previousViewsSubject.next([...this.previousViewsSubject.value, this.currentView]);
        }
        this.currentView = newView;
        this.nextViewsSubject.next([]); // Clear the next views stack
      }
    }
  }

  isViewEqual(view1: View | null, view2: View | null): boolean {
    if (!view1 || !view2) {
      return view1 === view2;
    }
    return (
      JSON.stringify(view1.getCenter()) === JSON.stringify(view2.getCenter()) &&
      view1.getResolution() === view2.getResolution() &&
      view1.getRotation() === view2.getRotation()
    );
  }

  get canGoToPreviousView$(): Observable<boolean> {
    return this.previousViewsSubject.asObservable().pipe(
      map(previousViews => previousViews.length > 0)
    );
  }

  get canGoToNextView$(): Observable<boolean> {
    return this.nextViewsSubject.asObservable().pipe(
      map(nextViews => nextViews.length > 0)
    );
  }

  goToPreviousView(): void {
    if (this.previousViewsSubject.value.length > 0) {
      this.nextViewsSubject.next([...this.nextViewsSubject.value, this.currentView]);
      const previousView = this.previousViewsSubject.value.pop();
      this.restoreView(previousView);
      this.previousViewsSubject.next(this.previousViewsSubject.value);
    }
  }

  goToNextView(): void {
    if (this.nextViewsSubject.value.length > 0) {
      this.previousViewsSubject.next([...this.previousViewsSubject.value, this.currentView]);
      const nextView = this.nextViewsSubject.value.pop();
      this.restoreView(nextView);
      this.nextViewsSubject.next(this.nextViewsSubject.value);
    }
  }

  restoreView(view: View): void {
    this.isTrackingChanges = false; // Désactiver les écouteurs d'événements
    const mapView = this.mapService.getMap().getView();
    mapView.setCenter(view.getCenter());
    mapView.setResolution(view.getResolution());
    mapView.setRotation(view.getRotation());
    this.currentView = view;
    this.isTrackingChanges = true; // Réactiver les écouteurs d'événements
  }
}