import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AttributeTableService } from '../../attribute-table.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
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
    MatButtonModule,
    MatIconModule,
  ],
})
export class FilterComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  filterText: string = '';
  columns: string[] = [];
  selectedColumn: string = '';
  columnType: string = '';
  private destroy$ = new Subject<void>();

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
      filterMinNumber: [null],
      filterMaxNumber: [null],
    });

    this.filterForm.get('selectedColumn').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.selectedColumn = value;
        this.updateColumnType();
      });

    this.addNumberValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      const filterMinNumber = this.filterForm.get('filterMinNumber').value;
      const filterMaxNumber = this.filterForm.get('filterMaxNumber').value;

      this._attributeTableService.applyFilter({
        column: selectedColumn,
        value: this.columnType === 'text' ? filterText : { min: filterMinNumber, max: filterMaxNumber },
        type: this.columnType,
      });
      this.closeDialog();
    }
  }

  updateColumnType(): void {
    this.columnType = this.columnsInfo.columnTypes[this.selectedColumn];

    if (this.columnType === 'text') {
      this.filterForm.get('filterMinNumber').clearValidators();
      this.filterForm.get('filterMaxNumber').clearValidators();
      this.filterForm.get('filterText').setValidators(Validators.required);
    } else if (this.columnType === 'number') {
      this.filterForm.get('filterText').clearValidators();
      this.addNumberValidation();
    }

    this.filterForm.get('filterText').updateValueAndValidity();
    this.filterForm.get('filterMinNumber').updateValueAndValidity();
    this.filterForm.get('filterMaxNumber').updateValueAndValidity();
  }

  addNumberValidation(): void {
    this.filterForm.get('filterMinNumber').setValidators(Validators.required);
    this.filterForm.get('filterMaxNumber').setValidators(Validators.required);

    const minControl = this.filterForm.get('filterMinNumber');
    const maxControl = this.filterForm.get('filterMaxNumber');

    minControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((minValue) => {
        if (this.columnType === 'number') {
          if (minValue !== null && maxControl.value !== null && minValue > maxControl.value) {
            maxControl.setValue(minValue);
          }
          maxControl.setValidators([Validators.required, Validators.min(minValue)]);
          maxControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        }
      });

    maxControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((maxValue) => {
        if (this.columnType === 'number') {
          if (maxValue !== null && minControl.value !== null && maxValue < minControl.value) {
            minControl.setValue(maxValue);
          }
          minControl.setValidators([Validators.required, Validators.max(maxValue)]);
          minControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        }
      });
  }
}
