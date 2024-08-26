import { Component, OnInit } from '@angular/core';
import { MatDialogActions, MatDialogContent, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import GPX from 'ol/format/GPX';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ImportService } from '../import.service';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [MatIcon,
    MatDialogContent,
    MatDialogActions,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss'
})
export class ImportDialogComponent implements OnInit {
  importForm: FormGroup;
  selectedFile: File | null = null;
  preparedFeatures: Feature[] = [];
  featureProperties: any[] = [];
  layerName: string = '';

  constructor(
    public dialogRef: MatDialogRef<ImportDialogComponent>, 
    private fb: FormBuilder, 
    private importService: ImportService,
  ) {}

  ngOnInit() : void {
    this.importForm = this.fb.group({
      layerName: ['', Validators.required]
    });
  }

  // Methode pour soumettre le formulaire
  onSubmit(): void {
    if (this.importForm.valid) {
      const layerNameTyped = this.importForm.get('layerName').value;
      this.layerName = layerNameTyped;
      this.importFile();
    }
  }

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
    this.preparedFeatures.forEach(feature => {
      if (this.layerName.trim() !== '') {
        feature.set('_layerName_$', this.layerName);
      }
      feature.set('_type_$', 'Feature')
    });
    if (this.preparedFeatures.length > 0 && this.layerName.trim() !== '') {
      const isAdded = this.importService.addFeaturesToMap({name: this.layerName, features: this.preparedFeatures});
      if (isAdded) {
        this.dialogRef.close({});
      }
    } else {
      // Afficher un message d'erreur si le nom de la couche est vide
      console.error('Le nom de la couche ne peut pas être vide');
    }
    this.selectedFile = null;
    this.preparedFeatures = [];
    this.featureProperties = [];
    this.layerName = '';
    this.importForm.get('layerName').setValue('');
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
    this.selectedFile = null;
    this.preparedFeatures = [];
    this.featureProperties = [];
    this.layerName = '';
    this.dialogRef.close();
  }
}
