import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CustomLayer } from '../quick-chat.types';
import { AttributeTableComponent } from './attribute-table-dialog/attribute-table.component';
import { Feature } from 'ol';

@Injectable({
  providedIn: 'root'
})
export class AttributeTableService {
  displayedColumns: string[] = [];
  filteredDataSource: any[] = [];
  features: Feature[] = [];

  constructor(private dialog: MatDialog) {}

  openAttributeTable(layer: CustomLayer): void {
    if (layer.type === 'VECTOR' && layer.features.length > 0) {
      this.dialog.open(AttributeTableComponent, {
        data: { features: layer.features, layerName: layer.name },
        width: '80%',
        height: '80%',
      });
    } else {
      alert('Cette couche n\'a pas de caractéristiques vectorielles.');
    }
  }
}
