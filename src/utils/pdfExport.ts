import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentProfile, Subject, PautaSummary } from '../types';
import { generatePautaSummary } from './gradeCalculations';

export function exportPautaToPdf(
  student: StudentProfile,
  subjects: Subject[],
  targetGrade: number = 14
): boolean {
  try {
    const visibleSubjects = subjects.filter((s) => !s.hiddenInPauta);
    const summary: PautaSummary = generatePautaSummary(student, visibleSubjects);

    // Create landscape or portrait PDF based on table width. Landscape (A4) gives perfect space for all 3 quarters!
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const primaryColor: [number, number, number] = [30, 64, 175]; // Blue 800
    const secondaryColor: [number, number, number] = [79, 70, 229]; // Indigo 600
    const darkSlate: [number, number, number] = [15, 23, 42]; // Slate 900
    const lightGray: [number, number, number] = [241, 245, 249]; // Slate 100

    // Top Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 18, 'F');

    // Header title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CalFéx Pro - SISTEMA DE GESTÃO ESCOLAR E PAUTA ACADÉMICA', pageWidth / 2, 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('BOLETIM OFICIAL DE AVALIAÇÃO DO RENDIMENTO ESCOLAR', pageWidth / 2, 14, { align: 'center' });

    // Student Info Card
    const cardY = 22;
    const cardHeight = 24;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(12, cardY, pageWidth - 24, cardHeight, 3, 3, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(12, cardY, pageWidth - 24, cardHeight, 3, 3, 'D');

    // Student Details Grid
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    const col1 = 16;
    const col2 = 90;
    const col3 = 175;
    const col4 = 235;

    // Row 1
    doc.text('Estudante:', col1, cardY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(student.name || 'Estudante CalFéx', col1 + 22, cardY + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Nº de Ordem:', col2, cardY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(student.orderNumber ? `Nº ${student.orderNumber}` : 'S/N', col2 + 25, cardY + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Turma / Classe:', col3, cardY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(student.classRoom || 'Não definida', col3 + 28, cardY + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Ano Lectivo:', col4, cardY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(student.academicYear || '2025/2026', col4 + 22, cardY + 7);

    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.text('Curso:', col1, cardY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(student.course || 'Ensino Geral', col1 + 14, cardY + 15);

    doc.setFont('helvetica', 'bold');
    doc.text('Instituição:', col2, cardY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(student.schoolName || 'Complexo Escolar', col2 + 20, cardY + 15);

    doc.setFont('helvetica', 'bold');
    doc.text('Género:', col3, cardY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(student.gender === 'masculino' ? 'Masculino' : 'Feminino', col3 + 16, cardY + 15);

    doc.setFont('helvetica', 'bold');
    doc.text('Emitido em:', col4, cardY + 15);
    doc.setFont('helvetica', 'normal');
    const todayStr = new Date().toLocaleDateString('pt-PT');
    doc.text(todayStr, col4 + 21, cardY + 15);

    // Prepare table columns and rows
    const tableColumns = [
      { header: 'Nº', dataKey: 'num' },
      { header: 'Disciplina', dataKey: 'name' },
      { header: 'P1', dataKey: 't1_p1' },
      { header: 'P2', dataKey: 't1_p2' },
      { header: 'MAC', dataKey: 't1_mac' },
      { header: 'MT1', dataKey: 'mt1' },
      { header: 'P1', dataKey: 't2_p1' },
      { header: 'P2', dataKey: 't2_p2' },
      { header: 'MAC', dataKey: 't2_mac' },
      { header: 'MT2', dataKey: 'mt2' },
      { header: 'P1', dataKey: 't3_p1' },
      { header: 'P2', dataKey: 't3_p2' },
      { header: 'MAC', dataKey: 't3_mac' },
      { header: 'MT3', dataKey: 'mt3' },
      { header: 'MFD', dataKey: 'mfd' },
      { header: 'Classificação', dataKey: 'qualitative' },
      { header: 'Situação', dataKey: 'status' },
    ];

    const tableRows = summary.subjects.map((sub, index) => ({
      num: (index + 1).toString(),
      name: sub.weight > 1 ? `${sub.name} (p.${sub.weight})` : sub.name,
      t1_p1: sub.t1P1 !== null ? sub.t1P1.toFixed(1) : '-',
      t1_p2: sub.t1P2 !== null ? sub.t1P2.toFixed(1) : '-',
      t1_mac: sub.t1Mac !== null ? sub.t1Mac.toFixed(1) : '-',
      mt1: sub.mt1 !== null ? sub.mt1.toFixed(1) : '-',
      t2_p1: sub.t2P1 !== null ? sub.t2P1.toFixed(1) : '-',
      t2_p2: sub.t2P2 !== null ? sub.t2P2.toFixed(1) : '-',
      t2_mac: sub.t2Mac !== null ? sub.t2Mac.toFixed(1) : '-',
      mt2: sub.mt2 !== null ? sub.mt2.toFixed(1) : '-',
      t3_p1: sub.t3P1 !== null ? sub.t3P1.toFixed(1) : '-',
      t3_p2: sub.t3P2 !== null ? sub.t3P2.toFixed(1) : '-',
      t3_mac: sub.t3Mac !== null ? sub.t3Mac.toFixed(1) : '-',
      mt3: sub.mt3 !== null ? sub.mt3.toFixed(1) : '-',
      mfd: sub.mfd !== null ? sub.mfd.toFixed(1) : '-',
      qualitative: sub.qualitative || '-',
      status: sub.status || 'Pendente',
    }));

    // Generate AutoTable
    autoTable(doc, {
      startY: 50,
      margin: { left: 12, right: 12 },
      columns: tableColumns,
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        halign: 'center',
        valign: 'middle',
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 58, 138], // Dark navy
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      columnStyles: {
        num: { cellWidth: 8, halign: 'center' },
        name: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
        t1_p1: { cellWidth: 10 },
        t1_p2: { cellWidth: 10 },
        t1_mac: { cellWidth: 10 },
        mt1: { cellWidth: 12, fontStyle: 'bold', fillColor: [238, 242, 255], textColor: [29, 78, 216] },
        t2_p1: { cellWidth: 10 },
        t2_p2: { cellWidth: 10 },
        t2_mac: { cellWidth: 10 },
        mt2: { cellWidth: 12, fontStyle: 'bold', fillColor: [238, 242, 255], textColor: [67, 56, 202] },
        t3_p1: { cellWidth: 10 },
        t3_p2: { cellWidth: 10 },
        t3_mac: { cellWidth: 10 },
        mt3: { cellWidth: 12, fontStyle: 'bold', fillColor: [238, 242, 255], textColor: [14, 116, 144] },
        mfd: { cellWidth: 14, fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 64, 175], fontSize: 8.5 },
        qualitative: { cellWidth: 26, halign: 'center' },
        status: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        // Color status cell based on result
        if (data.section === 'body' && data.column.dataKey === 'status') {
          const val = data.cell.raw as string;
          if (val === 'Aprovado') {
            data.cell.styles.textColor = [21, 128, 61]; // Green
          } else if (val === 'Suficiente') {
            data.cell.styles.textColor = [37, 99, 235]; // Blue
          } else if (val === 'Em Risco') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
          } else if (val === 'Reprovado') {
            data.cell.styles.textColor = [225, 29, 72]; // Rose
          }
        }
      },
    });

    // Summary Box below the table
    // @ts-expect-error jspdf-autotable adds lastAutoTable to doc
    const finalY = (doc.lastAutoTable?.finalY || 140) + 6;

    if (finalY < pageHeight - 35) {
      // Summary Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(12, finalY, pageWidth - 24, 18, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(12, finalY, pageWidth - 24, 18, 2, 2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

      const avgText = summary.generalAverage !== null ? `${summary.generalAverage.toFixed(1)} / 20` : 'Pendente';
      doc.text(`Média Final Geral: ${avgText}`, 16, finalY + 6);
      doc.text(`Disciplinas Totais: ${summary.totalSubjects}`, 16, finalY + 12);

      doc.text(`Aprovadas: ${summary.approvedCount}`, 85, finalY + 6);
      doc.text(`Em Risco / Recurso: ${summary.warningCount}`, 85, finalY + 12);

      doc.text(`Reprovadas: ${summary.failedCount}`, 155, finalY + 6);
      doc.text(`Meta Definida: >= ${targetGrade} val`, 155, finalY + 12);

      const isOverallApproved = summary.generalAverage !== null && summary.generalAverage >= 10 && summary.failedCount === 0;
      doc.setTextColor(isOverallApproved ? 21 : 225, isOverallApproved ? 128 : 29, isOverallApproved ? 61 : 72);
      doc.setFontSize(9.5);
      doc.text(`Resultado Geral: ${isOverallApproved ? 'APROVADO' : 'EM AVALIAÇÃO'}`, 215, finalY + 9);

      // Signatures
      const sigY = finalY + 22;
      if (sigY + 12 < pageHeight) {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);

        doc.line(30, sigY + 6, 95, sigY + 6);
        doc.text('O Director Pedagógico', 62, sigY + 10, { align: 'center' });

        doc.line(115, sigY + 6, 180, sigY + 6);
        doc.text('O Professor Titular / Coordenador', 147, sigY + 10, { align: 'center' });

        doc.line(200, sigY + 6, 265, sigY + 6);
        doc.text('O Encarregado de Educação', 232, sigY + 10, { align: 'center' });
      }
    }

    // Page footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Documento gerado automaticamente pelo CalFéx Pro em ${new Date().toLocaleString('pt-PT')} | Autenticidade Garantida`,
      pageWidth / 2,
      pageHeight - 4,
      { align: 'center' }
    );

    // Sanitize filename
    const studentNameClean = (student.name || 'Estudante').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Pauta_CalFex_${studentNameClean}.pdf`;

    // Trigger instant download
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}
