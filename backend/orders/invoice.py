"""
PDF Sales Slip / Invoice generator using ReportLab.
Generates a professional invoice PDF with shop branding, GST breakdown,
and full order details.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                 Paragraph, Spacer, HRFlowable, Image)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import io
import os
import requests
from django.conf import settings


# --- Amount in words (Indian numbering) ---

_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
         'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
         'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
         'Sixty', 'Seventy', 'Eighty', 'Ninety']


def _two_digits(n):
    if n < 20:
        return _ONES[n]
    return _TENS[n // 10] + ('' if n % 10 == 0 else ' ' + _ONES[n % 10])


def _three_digits(n):
    if n == 0:
        return ''
    h = n // 100
    rest = n % 100
    parts = []
    if h:
        parts.append(_ONES[h] + ' Hundred')
    if rest:
        parts.append(_two_digits(rest))
    return ' '.join(parts)


def amount_in_words(amount):
    """Convert amount to Indian-style words"""
    amount = round(float(amount), 2)
    rupees = int(amount)
    paise = round((amount - rupees) * 100)

    if rupees == 0 and paise == 0:
        return 'Rupees Zero Only'

    parts = []
    if rupees >= 10000000:
        parts.append(_two_digits(rupees // 10000000) + ' Crore')
        rupees %= 10000000
    if rupees >= 100000:
        parts.append(_two_digits(rupees // 100000) + ' Lakh')
        rupees %= 100000
    if rupees >= 1000:
        parts.append(_two_digits(rupees // 1000) + ' Thousand')
        rupees %= 1000
    if rupees > 0:
        parts.append(_three_digits(rupees))

    result = 'Rupees ' + ' '.join(parts)
    if paise:
        result += ' and ' + _two_digits(paise) + ' Paise'
    result += ' Only'
    return result


def _get_image_flowable(image_field, max_width=1.5*cm, max_height=1.5*cm, align='CENTER'):
    """Try to load a Django ImageField as a ReportLab Image flowable."""
    if not image_field:
        return ''
    try:
        if hasattr(image_field, 'path'):
            try:
                path = image_field.path
                if os.path.exists(path):
                    img = Image(path, width=max_width, height=max_height)
                    img.hAlign = align
                    return img
            except (NotImplementedError, ValueError):
                pass
        if hasattr(image_field, 'url'):
            url = image_field.url
            if url:
                # If running locally without full URL
                if url.startswith('/'):
                    return ''
                resp = requests.get(url, timeout=3)
                if resp.status_code == 200:
                    img_buf = io.BytesIO(resp.content)
                    img = Image(img_buf, width=max_width, height=max_height)
                    img.hAlign = align
                    return img
    except Exception:
        pass
    return ''


def get_qr_code(text, size=2.5*cm):
    """Generate a QR code via an external API."""
    try:
        url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={text}"
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200:
            img_buf = io.BytesIO(resp.content)
            img = Image(img_buf, width=size, height=size)
            img.hAlign = 'RIGHT'
            return img
    except Exception:
        pass
    return ''


def generate_invoice_pdf(order):
    """Generate a professional PDF sales slip / payment receipt."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=1.2*cm, leftMargin=1.2*cm,
                            topMargin=1.2*cm, bottomMargin=1.2*cm)

    GREEN = colors.HexColor('#16a34a')
    LIGHT_GREEN = colors.HexColor('#f0fdf4')
    DARK = colors.HexColor('#111827')
    GRAY = colors.HexColor('#6b7280')

    styles = getSampleStyleSheet()
    story = []

    # Gather seller info
    seller_profile = getattr(order.seller, 'seller_profile', None)
    shop_name = seller_profile.shop_name if seller_profile else order.seller.full_name
    gst_number = seller_profile.gst_number if seller_profile else ''
    seller_logo = _get_image_flowable(seller_profile.shop_logo if seller_profile else None, max_width=2.5*cm, max_height=2.5*cm, align='LEFT')

    # =========================================================================
    # TOP HEADER — AgriMart & Tax Invoice
    # =========================================================================
    top_header_data = [
        [Paragraph('<font size="18" color="#16a34a"><b>🌿 AgriMart</b></font>', styles['Normal']),
         Paragraph('<font size="16" color="#111827"><b>TAX INVOICE</b></font>', ParagraphStyle('right', alignment=TA_RIGHT, fontSize=16))],
    ]
    top_header_table = Table(top_header_data, colWidths=[9*cm, 9.6*cm])
    top_header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(top_header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=GREEN, spaceAfter=12))

    # =========================================================================
    # INVOICE META DATA (Invoice #, Date, Tracking, Expected Delivery)
    # =========================================================================
    invoice_no = getattr(getattr(order, 'invoice', None), 'invoice_number', f"INV-{order.order_number}")
    tracking_no = getattr(order, 'tracking_number', 'N/A')
    exp_delivery = getattr(order, 'expected_delivery', None)
    exp_delivery_str = exp_delivery.strftime("%d %b %Y") if exp_delivery else 'N/A'

    meta_text = f"""<font size="9" color="#4b5563">
<b>Invoice Number:</b> {invoice_no}<br/>
<b>Order Number:</b> {order.order_number}<br/>
<b>Tracking Number:</b> {tracking_no}<br/>
<b>Invoice Date:</b> {order.created_at.strftime("%d %b %Y")}<br/>
<b>Expected Delivery:</b> {exp_delivery_str}
</font>"""
    
    # =========================================================================
    # SELLER SHOP BRANDING (Logo + Address)
    # =========================================================================
    seller_lines = []
    if seller_logo:
        seller_lines.append(seller_logo)
        seller_lines.append(Spacer(1, 4))

    seller_lines.append(Paragraph(f'<font size="12" color="#1f2937"><b>{shop_name}</b></font>', styles['Normal']))
    seller_lines.append(Paragraph(f'<font size="9" color="#4b5563">{order.seller.full_name}</font>', styles['Normal']))
    
    if order.seller.address:
        seller_lines.append(Paragraph(f'<font size="9" color="#6b7280">{order.seller.address}, {order.seller.village}</font>', styles['Normal']))
        seller_lines.append(Paragraph(f'<font size="9" color="#6b7280">{order.seller.taluka}, {order.seller.district}</font>', styles['Normal']))
    
    seller_lines.append(Paragraph(f'<font size="9" color="#4b5563">Email: {order.seller.email}</font>', styles['Normal']))
    seller_lines.append(Paragraph(f'<font size="9" color="#4b5563">Phone: {order.seller.phone}</font>', styles['Normal']))
    
    if gst_number:
        seller_lines.append(Paragraph(f'<font size="9" color="#4b5563"><b>GSTIN: {gst_number}</b></font>', styles['Normal']))

    left_cell_data = [[p] for p in seller_lines]
    left_cell = Table(left_cell_data, colWidths=[9*cm])
    left_cell.setStyle(TableStyle([
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
    ]))

    header_data = [[
        left_cell,
        Paragraph(meta_text, ParagraphStyle('right', alignment=TA_RIGHT, leading=14)),
    ]]
    header_table = Table(header_data, colWidths=[9*cm, 9.6*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(header_table)

    # =========================================================================
    # BILL TO (Farmer Info)
    # =========================================================================
    to_lines = [
        f'<font size="10" color="#111827"><b>Billed To (Farmer):</b></font>',
        f'<font size="9" color="#374151">{order.farmer.full_name}</font>',
        f'<font size="9" color="#6b7280">{order.delivery_address}</font>',
        f'<font size="9" color="#6b7280">{order.delivery_village}, {order.delivery_taluka}</font>',
        f'<font size="9" color="#6b7280">{order.delivery_district} - {order.delivery_pincode}</font>',
        f'<font size="9" color="#4b5563">Phone: {order.delivery_phone}</font>',
        f'<font size="9" color="#4b5563">Email: {order.farmer.email}</font>',
    ]
    to_text = '<br/>'.join([line for line in to_lines if line])

    address_data = [[
        Paragraph(to_text, ParagraphStyle('addr2', fontSize=9, leading=14)),
    ]]
    address_table = Table(address_data, colWidths=[18.6*cm])
    address_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), LIGHT_GREEN),
        ('BOX', (0,0), (0,0), 0.5, GREEN),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(address_table)
    story.append(Spacer(1, 14))

    # =========================================================================
    # PRODUCT DETAILS TABLE
    # =========================================================================
    # Columns: Sr. No., Image, Name, Category, Qty, Unit Price, Discount, Total
    items_header = ['Sr. No.', 'Product Image', 'Product Name', 'Category', 'Qty', 'Unit Price', 'Discount', 'Total Price']
    items_data = [items_header]

    for i, item in enumerate(order.items.all(), 1):
        prod_img = _get_image_flowable(item.product.image, max_width=1.2*cm, max_height=1.2*cm, align='CENTER')
        
        discount_str = f"{item.product.discount_percent}%" if item.product.discount_percent else "-"
        category_name = item.product.category.name if item.product.category else "-"
        
        items_data.append([
            str(i),
            prod_img,
            Paragraph(f"<font size='8'>{item.product_name}</font>", styles['Normal']),
            Paragraph(f"<font size='8'>{category_name}</font>", styles['Normal']),
            str(item.quantity),
            f'{item.product_price:.2f}',
            discount_str,
            f'{item.subtotal:.2f}',
        ])

    items_table = Table(items_data, colWidths=[1.5*cm, 2.5*cm, 5.0*cm, 2.5*cm, 1.2*cm, 2.0*cm, 1.7*cm, 2.2*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), GREEN),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1fae5')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (1,-1), 'CENTER'),
        ('ALIGN', (4,0), (-1,-1), 'CENTER'),
        ('ALIGN', (7,0), (7,-1), 'RIGHT'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))

    # =========================================================================
    # ORDER SUMMARY & PAYMENT INFO
    # =========================================================================
    # Left side: Payment Info
    payment_record = order.payments.filter(status='paid').first()
    txn_id = 'N/A'
    ref_number = 'N/A'
    payment_time = order.created_at.strftime("%d %b %Y %I:%M %p")
    if payment_record:
        txn_id = payment_record.transaction_id or 'N/A'
        ref_number = payment_record.reference_number or 'N/A'
        if payment_record.paid_at:
            payment_time = payment_record.paid_at.strftime("%d %b %Y %I:%M %p")
    elif order.razorpay_payment_id:
        txn_id = order.razorpay_payment_id

    payment_info = [
        f'<font size="10" color="#111827"><b>Payment Information</b></font>',
        f'<font size="9" color="#4b5563"><b>Method:</b> {order.get_payment_method_display()}</font>',
        f'<font size="9" color="#4b5563"><b>Payment Status:</b> {order.payment_status.upper()}</font>',
        f'<font size="9" color="#4b5563"><b>Transaction ID:</b> {txn_id}</font>',
        f'<font size="9" color="#4b5563"><b>Reference Number:</b> {ref_number}</font>',
        f'<font size="9" color="#4b5563"><b>Payment Time:</b> {payment_time}</font>',
        f'<font size="9" color="#4b5563"><b>Order Status:</b> {order.get_status_display()}</font>',
        f'<font size="9" color="#4b5563"><b>Delivery Status:</b> {"Delivered" if order.status == "delivered" else "Pending"}</font>',
    ]
    payment_text = '<br/>'.join(payment_info)
    
    # Right side: Totals
    total_items = sum(item.quantity for item in order.items.all())
    
    totals_data = [
        ['Total Items:', str(total_items)],
        ['Subtotal:', f'Rs. {order.subtotal:.2f}'],
        ['Delivery Charges:', f'Rs. {order.delivery_charge:.2f}'],
    ]
    if float(order.discount) > 0:
        totals_data.append(['Discount:', f'- Rs. {order.discount:.2f}'])
        
    totals_data.append(['Tax (GST):', f'Rs. {order.gst_amount:.2f}'])
    totals_data.append(['GRAND TOTAL:', f'Rs. {order.total:.2f}'])

    totals_table = Table(totals_data, colWidths=[4*cm, 3.5*cm])
    total_rows = len(totals_data)
    totals_table.setStyle(TableStyle([
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        # Grand total row
        ('FONTNAME', (0, total_rows-1), (-1, total_rows-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, total_rows-1), (-1, total_rows-1), 11),
        ('TEXTCOLOR', (0, total_rows-1), (-1, total_rows-1), GREEN),
        ('LINEABOVE', (0, total_rows-1), (-1, total_rows-1), 1, GREEN),
        ('BACKGROUND', (0, total_rows-1), (-1, total_rows-1), LIGHT_GREEN),
    ]))

    # Wrap them in a master table side-by-side
    summary_master = Table([
        [Paragraph(payment_text, ParagraphStyle('pay', leading=14)), totals_table]
    ], colWidths=[10*cm, 8.6*cm])
    summary_master.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    
    story.append(summary_master)
    story.append(Spacer(1, 15))

    # =========================================================================
    # AMOUNT IN WORDS
    # =========================================================================
    words = amount_in_words(order.total)
    story.append(
        Paragraph(
            f'<font size="9" color="#374151"><b>Amount in Words:</b> <i>{words}</i></font>',
            ParagraphStyle('words', fontSize=9, leading=14)
        )
    )
    story.append(Spacer(1, 25))

    # =========================================================================
    # FOOTER (Seller Logo, Thank You, QR Code)
    # =========================================================================
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY))
    story.append(Spacer(1, 10))
    
    qr_code = get_qr_code(f"AgriMart Receipt: {order.order_number}")
    
    footer_text = f"""<font size="9" color="#374151">
<b>Thank you for shopping with {shop_name} via AgriMart!</b><br/>
<br/>
<font size="8" color="#6b7280">
<b>Customer Support Email:</b> support@agrimart.in | <b>Phone:</b> 1800-AGRI-MART<br/>
<b>Terms & Conditions:</b> Goods once sold are not returnable. Settlements are processed under standard AgriMart marketplace guidelines. Please inspect products upon delivery.<br/>
<br/>
<i>This is a computer-generated tax invoice and does not require a physical signature.</i>
</font>
</font>"""

    footer_master_data = [[
        Paragraph(footer_text, ParagraphStyle('footer', leading=13)),
        qr_code
    ]]
    footer_master = Table(footer_master_data, colWidths=[15*cm, 3.6*cm])
    footer_master.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    
    story.append(footer_master)

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
