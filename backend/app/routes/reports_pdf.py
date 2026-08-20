from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.utils.db import get_database
from app.routes.auth import get_current_user
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfgen import canvas
import os

router = APIRouter(prefix="/reports/pdf", tags=["PDF Reports"])

# Teacher PDF Report
@router.get("/teacher/attendance")
async def get_teacher_attendance_pdf(
    current_user: dict = Depends(get_current_user),
    class_id: str = None,
    start_date: str = None,
    end_date: str = None
):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    db = get_database()
    
    query = {}
    if class_id:
        students = await db.students.find({"class_id": class_id}).to_list(None)
        student_names = [s.get("name") for s in students]
        if student_names:
            query["student_name"] = {"$in": student_names}
    
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}
    
    attendance = await db.attendance.find(query).to_list(None)
    
    # Remove duplicates
    seen = set()
    unique_attendance = []
    for a in attendance:
        key = f"{a['student_name']}_{a['date']}"
        if key not in seen:
            seen.add(key)
            unique_attendance.append(a)
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=50, bottomMargin=30)
    styles = getSampleStyleSheet()
    elements = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#4CAF50'),
        alignment=1,
        spaceAfter=20
    )
    title = Paragraph("Attendance Report", title_style)
    elements.append(title)
    
    # Subtitle
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        alignment=1,
        spaceAfter=30
    )
    subtitle = Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>Teacher: {current_user.get('full_name', '')}", subtitle_style)
    elements.append(subtitle)
    
    # Summary box
    total_students = len(set([a.get('student_name') for a in unique_attendance]))
    summary_data = [
        ["Total Students", "Total Attendance Records", "Report Date"],
        [str(total_students), str(len(unique_attendance)), datetime.now().strftime("%Y-%m-%d")]
    ]
    summary_table = Table(summary_data, colWidths=[150, 150, 150])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4CAF50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Attendance Table
    if unique_attendance:
        table_data = [["S.No", "Student Name", "Date", "Time", "Confidence"]]
        for idx, a in enumerate(unique_attendance, 1):
            table_data.append([
                str(idx),
                a.get("student_name", ""),
                a.get("date", ""),
                a.get("time", ""),
                f"{round(a.get('confidence', 0) * 100, 1)}%"
            ])
        
        attendance_table = Table(table_data, colWidths=[40, 150, 80, 60, 70])
        attendance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2196F3')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        elements.append(attendance_table)
    else:
        no_data = Paragraph("No attendance records found.", styles['Normal'])
        elements.append(no_data)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Student PDF Report
@router.get("/student/attendance")
async def get_student_attendance_pdf(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    db = get_database()
    
    student = await db.students.find_one({"user_id": str(current_user["_id"])})
    if not student:
        student = await db.students.find_one({"email": current_user["email"]})
    
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    
    attendance = await db.attendance.find({"student_name": student.get("name")}).to_list(None)
    
    # Remove duplicates and sort
    seen = set()
    unique_attendance = []
    for a in attendance:
        key = f"{a['student_name']}_{a['date']}"
        if key not in seen:
            seen.add(key)
            unique_attendance.append(a)
    unique_attendance.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=50, bottomMargin=30)
    styles = getSampleStyleSheet()
    elements = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#2196F3'),
        alignment=1,
        spaceAfter=20
    )
    title = Paragraph("My Attendance Report", title_style)
    elements.append(title)
    
    # Student Info
    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6
    )
    elements.append(Paragraph(f"<b>Student Name:</b> {student.get('name', '')}", info_style))
    elements.append(Paragraph(f"<b>Roll Number:</b> {student.get('roll_number', '')}", info_style))
    elements.append(Paragraph(f"<b>Email:</b> {student.get('email', '')}", info_style))
    elements.append(Paragraph(f"<b>Generated On:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", info_style))
    elements.append(Spacer(1, 20))
    
    # Summary
    total_present = len(unique_attendance)
    summary_data = [
        ["Total Present Days", "Attendance Percentage"],
        [str(total_present), f"{min(100, (total_present / 30) * 100):.1f}%"]
    ]
    summary_table = Table(summary_data, colWidths=[150, 150])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2196F3')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Attendance Table
    if unique_attendance:
        table_data = [["S.No", "Date", "Time", "Confidence"]]
        for idx, a in enumerate(unique_attendance, 1):
            table_data.append([
                str(idx),
                a.get("date", ""),
                a.get("time", ""),
                f"{round(a.get('confidence', 0) * 100, 1)}%"
            ])
        
        attendance_table = Table(table_data, colWidths=[40, 100, 80, 80])
        attendance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4CAF50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(attendance_table)
    else:
        no_data = Paragraph("No attendance records found.", styles['Normal'])
        elements.append(no_data)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"my_attendance_{student.get('roll_number', 'student')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )