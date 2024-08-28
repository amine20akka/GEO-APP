import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-map-capture',
  templateUrl: './map-capture.component.html',
  styleUrls: ['./map-capture.component.scss'],
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule]
})
export class MapCaptureComponent implements OnInit {
  screenshots: { image: string, description: string }[] = [];

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit() {}

  captureScreenshot() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      this.snackBar.open('Map element not found', 'Close', { duration: 3000 });
      return;
    }

    html2canvas(mapElement).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const description = prompt('Entrer une description pour cette vue:') || '';
      this.screenshots.push({ image: imgData, description });
      this.snackBar.open('vue capturée', 'Fermer', { duration: 2000 });
    });
  }

  generateReport() {
    if (this.screenshots.length === 0) {
      this.snackBar.open('No screenshots to generate report', 'Close', { duration: 3000 });
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Cover Page
    this.addCoverPage(pdf);
    pdf.addPage();

    // Table of Contents
    this.addTableOfContents(pdf);
    pdf.addPage();

    // Screenshots and descriptions
    this.screenshots.forEach((screenshot, index) => {
      this.addScreenshotPage(pdf, screenshot, index + 1);
      if (index < this.screenshots.length - 1) {
        pdf.addPage();
      }
    });

    // Add page numbers
    const totalPages = pdf.internal.pages.length - 1;    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    pdf.save('GIS_Map_Report.pdf');
    this.snackBar.open('Report generated successfully', 'Close', { duration: 3000 });
  }

  private addCoverPage(pdf: jsPDF) {
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Blue rectangle at the top
    pdf.setFillColor(0, 102, 204);
    pdf.rect(0, 0, pageWidth, 40, 'F');

    // Title
    pdf.setFontSize(28);
    pdf.setTextColor(255);
    pdf.text('GIS Map Report', pageWidth / 2, 30, { align: 'center' });

    // Subtitle
    pdf.setFontSize(16);
    pdf.setTextColor(0);
    pdf.text('Generated Map Captures and Analysis', pageWidth / 2, 60, { align: 'center' });

    // Date
    const date = new Date().toLocaleDateString();
    pdf.setFontSize(12);
    pdf.text(`Generated on: ${date}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
  }

  private addTableOfContents(pdf: jsPDF) {
    const pageWidth = pdf.internal.pageSize.width;

    pdf.setFontSize(20);
    pdf.setTextColor(0, 102, 204);
    pdf.text('Table of Contents', 20, 30);

    pdf.setFontSize(12);
    pdf.setTextColor(0);
    this.screenshots.forEach((_, index) => {
      pdf.text(`Vue n° ${index + 1}`, 30, 50 + index * 10);
      pdf.setTextColor(150);
      pdf.text(`Page ${index + 3}`, pageWidth - 30, 50 + index * 10, { align: 'right' });
      pdf.setTextColor(0);
    });
  }

  private addScreenshotPage(pdf: jsPDF, screenshot: { image: string, description: string }, pageNumber: number) {
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Title
    pdf.setFontSize(18);
    pdf.setTextColor(0, 102, 204);
    pdf.text(`Vue n° ${pageNumber}`, 20, 30);

    // Image
    const imgWidth = pageWidth - 40;
    const imgHeight = (imgWidth * 9) / 16; // Assuming 16:9 aspect ratio
    pdf.addImage(screenshot.image, 'PNG', 20, 40, imgWidth, imgHeight);

    // Description
    pdf.setFontSize(12);
    pdf.setTextColor(0);
    const splitDescription = pdf.splitTextToSize(screenshot.description, pageWidth - 40);
    pdf.text(splitDescription, 20, imgHeight + 60);

    // Blue line at the bottom
    pdf.setDrawColor(0, 102, 204);
    pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
  }
}