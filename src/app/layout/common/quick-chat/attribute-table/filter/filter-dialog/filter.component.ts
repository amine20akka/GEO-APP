import { Component, Inject } from '@angular/core';
import { FilterService } from '../filter.service';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AttributeTableService } from '../../attribute-table.service';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatLabel,
    FormsModule,
  ],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.scss'
})
export class FilterComponent {
  filterText: string = '';
  filterNumber: number | null = null;
  selectedColumn: string = '';
  columnType: string = 'text';
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public columnsInfo: any,
    private filterService: FilterService,
    private _attributeTableService: AttributeTableService,
    private _dialogRef: MatDialogRef<FilterComponent>,
  ) {}

  ngOnInit(): void {
    if (this.columnsInfo.columns.length > 0) {
      this.selectedColumn = this.columnsInfo.columns[0];
      this.updateColumnType();
    }
  }
  
  closeDialog(): void {
    this._dialogRef.close();
  }

  applyFilter(): void {
    this._attributeTableService.features = this._attributeTableService.features.filter(item => {
      const itemValue = item[this.selectedColumn];
      if (this.columnType === 'number') {
        return itemValue === this.filterNumber;
      } else {
        return itemValue.toString().toLowerCase().includes(this.filterText.toString().toLowerCase());
      }
    });
    this.closeDialog();
  }

  updateColumnType(): void {
    if (this.selectedColumn && this.columnsInfo.columnsTypes[this.selectedColumn]) {
      this.columnType = this.columnsInfo.columnsTypes[this.selectedColumn];
    }
  }
}
