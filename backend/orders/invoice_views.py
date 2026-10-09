from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import permissions
from .models import Order
from .invoice import generate_invoice_pdf


class DownloadInvoiceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        try:
            user = request.user
            # Farmer or seller can download their order invoice
            if user.role == 'farmer':
                order = Order.objects.get(id=order_id, farmer=user)
                if order.status != 'delivered' or order.payment_status != 'paid':
                    return HttpResponse("Invoice is only available after successful delivery and payment.", status=403)
            elif user.role == 'seller':
                order = Order.objects.get(id=order_id, seller=user)
            else:
                return HttpResponse("Unauthorized", status=403)
        except Order.DoesNotExist:
            return HttpResponse("Order not found", status=404)

        pdf_bytes = generate_invoice_pdf(order)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{order.order_number}.pdf"'
        return response
