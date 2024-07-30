import { Component } from '@angular/core';
import { MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import GPX from 'ol/format/GPX';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [MatIcon,
    MatDialogContent,
    MatDialogActions
  ],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss'
})
export class ImportDialogComponent {
  selectedFile: File | null = null;
  preparedFeatures: Feature[] = [];
  featureProperties: any[] = [];

  constructor(public dialogRef: MatDialogRef<ImportDialogComponent>) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.prepareFileContent(this.selectedFile);
    }
  }

  prepareFileContent(file: File): void {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      const content = e.target.result;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      switch (fileExtension) {
        case 'geojson':
          this.preparedFeatures = this.prepareGeoJSON(content);
          break;
        case 'kml':
          this.preparedFeatures = this.prepareKML(content);
          break;
        case 'gpx':
          this.preparedFeatures = this.prepareGPX(content);
          break;
        default:
          console.error('Unsupported file format');
          this.preparedFeatures = [];
      }

      this.extractFeatureProperties();
    };

    reader.readAsText(file);
  }

  prepareGeoJSON(content: string): Feature[] {
    try {
      const features = new GeoJSON().readFeatures(content);
      return features.map(feature => {
        const geometry = feature.getGeometry();
        if (geometry) {
          geometry.transform('EPSG:4326', 'EPSG:3857');
        }
        return feature;
      });
    } catch (error) {
      console.error('Error parsing GeoJSON:', error);
      return [];
    }
  }

  prepareKML(content: string): Feature[] {
    try {
      const features = new KML().readFeatures(content);
      return features.map(feature => {
        const geometry = feature.getGeometry();
        if (geometry) {
          geometry.transform('EPSG:4326', 'EPSG:3857');
        }
        return feature;
      });
    } catch (error) {
      console.error('Error parsing KML:', error);
      return [];
    }
  }

  prepareGPX(content: string): Feature[] {
    try {
      const features = new GPX().readFeatures(content);
      return features.map(feature => {
        const geometry = feature.getGeometry();
        if (geometry) {
          geometry.transform('EPSG:4326', 'EPSG:3857');
        }
        return feature;
      });
    } catch (error) {
      console.error('Error parsing GPX:', error);
      return [];
    }
  }

  extractFeatureProperties(): void {
    this.featureProperties = this.preparedFeatures.map(feature => {
      const properties = feature.getProperties();
      delete properties.geometry; // Exclure la géométrie de l'affichage
      return properties;
    });
  }

  importFile(): void {
    if (this.preparedFeatures.length > 0) {
      this.dialogRef.close(this.preparedFeatures);
    }
    this.selectedFile = null;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).classList.add('dragover');
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).classList.remove('dragover');
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).classList.remove('dragover');
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
    this.prepareFileContent(this.selectedFile);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
