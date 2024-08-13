import { Component, Inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { AttributeTableService } from '../../attribute-table.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule, MatFabButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
    MatFormFieldModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatDialogContent,
    MatDialogActions,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFabButton,
  ],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.scss'
})
export class FilterComponent {
  filterForm: FormGroup;
  filterText: string = '';
  filterNumber: number | null = null;
  columns: string[] = [];
  selectedColumn: string = '';
  columnType: string = 'text';
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public columnsInfo: any,
    private _attributeTableService: AttributeTableService,
    private _dialogRef: MatDialogRef<FilterComponent>,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    if (this.columnsInfo.columns.length > 0) {
      this.columns = this.columnsInfo.columns;
      this.selectedColumn = this.columnsInfo.columns[0];
    }

    this.filterForm = this.fb.group({
      selectedColumn: ['', Validators.required],
      filterText: [''],
      filterNumber: [null]
    });

    this.filterForm.get('selectedColumn').valueChanges.subscribe(value => {
      this.selectedColumn = value;
      this.updateColumnType();
    });
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
  
  closeDialog(): void {
    this._dialogRef.close();
  }

  onSubmit(): void {
    if (this.filterForm.valid) {
      const selectedColumn = this.filterForm.get('selectedColumn').value;
      const filterText = this.filterForm.get('filterText').value;
      const filterNumber = this.filterForm.get('filterNumber').value;
      this._attributeTableService.applyFilter({ column: selectedColumn, value: this.columnType === 'text' ? filterText : filterNumber, type: this.columnType });
      this.closeDialog();
    }
  }

  updateColumnType(): void {
    this.columnType = this.columnsInfo.columnTypes[this.selectedColumn];

    if (this.columnType === 'text') {
      this.filterForm.get('filterText').setValidators(Validators.required);
      this.filterForm.get('filterNumber').clearValidators();
    } else if (this.columnType === 'number') {
      this.filterForm.get('filterNumber').setValidators(Validators.required);
      this.filterForm.get('filterText').clearValidators();
    }

    this.filterForm.get('filterText').updateValueAndValidity();
    this.filterForm.get('filterNumber').updateValueAndValidity();
  }
}
