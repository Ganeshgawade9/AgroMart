"""
AI Chatbot for AgroConnect.
Farmer describes crop problem → AI gives disease name, medicine recommendation, nearby shop suggestion.
Uses Cohere (free tier) with fallback to rule-based responses.
"""
import json
import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.conf import settings
from django.contrib.auth import get_user_model
import math

User = get_user_model()

# Rule-based fallback knowledge base (works even without API key)
CROP_DISEASE_KB = {
    "yellow leaves": {
        "diseases": ["Nitrogen Deficiency", "Yellow Leaf Curl Virus", "Downy Mildew"],
        "medicines": ["Urea fertilizer (for nitrogen)", "Imidacloprid spray", "Mancozeb fungicide"],
        "category": "fertilizer"
    },
    "yellow": {
        "diseases": ["Nitrogen Deficiency", "Iron Chlorosis"],
        "medicines": ["Urea (46% N)", "Ferrous Sulphate"],
        "category": "fertilizer"
    },
    "brown spots": {
        "diseases": ["Alternaria Blight", "Early Blight", "Rust"],
        "medicines": ["Mancozeb 75%WP", "Carbendazim", "Propiconazole"],
        "category": "fungicide"
    },
    "brown": {
        "diseases": ["Fungal infection", "Root rot"],
        "medicines": ["Carbendazim 50%WP", "Trichoderma"],
        "category": "fungicide"
    },
    "wilting": {
        "diseases": ["Fusarium Wilt", "Root Rot", "Bacterial Wilt"],
        "medicines": ["Carbendazim", "Copper oxychloride", "Trichoderma viride"],
        "category": "fungicide"
    },
    "white powder": {
        "diseases": ["Powdery Mildew"],
        "medicines": ["Sulphur dust 80%", "Hexaconazole", "Dinocap"],
        "category": "fungicide"
    },
    "holes in leaves": {
        "diseases": ["Caterpillar / Bollworm attack"],
        "medicines": ["Chlorpyrifos", "Profenofos", "Spinosad"],
        "category": "pesticide"
    },
    "insects": {
        "diseases": ["Aphid infestation", "Whitefly", "Thrips"],
        "medicines": ["Imidacloprid 17.8SL", "Thiamethoxam", "Fipronil"],
        "category": "pesticide"
    },
    "no growth": {
        "diseases": ["Nutrient Deficiency", "Poor soil"],
        "medicines": ["NPK 19:19:19", "DAP fertilizer", "Micronutrient mix"],
        "category": "fertilizer"
    },
    "urea": {
        "diseases": ["Nitrogen deficiency"],
        "medicines": ["Urea 46% N - 1 bag per acre"],
        "category": "fertilizer"
    },
    "dap": {
        "diseases": ["Phosphorus deficiency"],
        "medicines": ["DAP (18:46:0) - 1 bag per acre"],
        "category": "fertilizer"
    },
}


def rule_based_response(message):
    """Fallback rule-based diagnosis."""
    message_lower = message.lower()
    matched = None
    for keyword, data in CROP_DISEASE_KB.items():
        if keyword in message_lower:
            matched = data
            break

    if not matched:
        return {
            "diagnosis": "I need more details about your crop problem.",
            "possible_diseases": ["Unable to determine from description"],
            "recommended_medicines": ["Please describe symptoms more clearly (e.g. yellow leaves, brown spots, wilting, insects)"],
            "category": "general",
            "tip": "Common problems: Yellow leaves (nitrogen deficiency), Brown spots (fungal), Wilting (root rot), White powder (powdery mildew), Holes in leaves (insects)",
            "source": "rule-based"
        }

    return {
        "diagnosis": f"Based on your description, this looks like a crop disease/deficiency issue.",
        "possible_diseases": matched["diseases"],
        "recommended_medicines": matched["medicines"],
        "category": matched["category"],
        "tip": "Apply as per label instructions. Consult a local agricultural expert for confirmation.",
        "source": "rule-based"
    }


def ai_response_cohere(message):
    """Use Cohere API for smarter responses."""
    try:
        import cohere
        co = cohere.Client(settings.COHERE_API_KEY)
        prompt = f"""You are an expert Indian agricultural advisor. A farmer has described their crop problem:

"{message}"

Respond ONLY with a valid JSON object (no markdown, no explanation outside JSON) with these exact keys:
{{
  "diagnosis": "brief explanation of the problem",
  "possible_diseases": ["disease1", "disease2"],
  "recommended_medicines": ["medicine1 with dosage", "medicine2 with dosage"],
  "category": "fertilizer OR pesticide OR fungicide OR herbicide",
  "tip": "one practical farming tip in simple language",
  "source": "ai"
}}

Focus on Maharashtra farming context. Be specific with Indian product names and dosages."""

        response = co.generate(
            model='command',
            prompt=prompt,
            max_tokens=400,
            temperature=0.3,
        )
        text = response.generations[0].text.strip()
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return None
    except Exception:
        return None


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


class AIChatbotView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        message = request.data.get('message', '').strip()
        user_lat = request.data.get('lat')
        user_lng = request.data.get('lng')

        if not message:
            return Response({'error': 'Message is required'}, status=400)

        # Try AI first, fall back to rule-based
        result = None
        if settings.COHERE_API_KEY:
            result = ai_response_cohere(message)

        if not result:
            result = rule_based_response(message)

        # Find nearby shops selling the recommended category
        nearby_shops = []
        if user_lat and user_lng:
            try:
                lat, lng = float(user_lat), float(user_lng)
                category = result.get('category', '')
                sellers = User.objects.filter(
                    role='seller', is_approved=True, is_active=True,
                    latitude__isnull=False, longitude__isnull=False
                ).select_related('seller_profile')

                for seller in sellers:
                    dist = haversine(lat, lng, float(seller.latitude), float(seller.longitude))
                    if dist <= 30:
                        # Check if seller has products in needed category
                        has_category = seller.products.filter(
                            category__category_type=category, is_active=True, stock__gt=0
                        ).exists() if category else True

                        if has_category:
                            nearby_shops.append({
                                'id': seller.id,
                                'shop_name': seller.seller_profile.shop_name if hasattr(seller, 'seller_profile') else seller.full_name,
                                'distance_km': round(dist, 1),
                                'village': seller.village,
                                'district': seller.district,
                                'phone': seller.phone,
                                'latitude': float(seller.latitude),
                                'longitude': float(seller.longitude),
                            })

                nearby_shops.sort(key=lambda x: x['distance_km'])
                nearby_shops = nearby_shops[:5]
            except Exception:
                pass

        result['nearby_shops'] = nearby_shops
        result['message'] = message
        return Response(result)


class VoiceSearchView(APIView):
    """Convert voice search text to product search query."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Text is required'}, status=400)

        # Extract product names from voice text
        keywords = text.lower()
        # Remove common Hindi/Marathi filler words
        fillers = ['show', 'mujhe', 'chahiye', 'dikhao', 'search', 'dhundo', 'la', 'fertilizer', 'medicine', 'karo']
        for f in fillers:
            keywords = keywords.replace(f, ' ')
        keywords = ' '.join(keywords.split())

        return Response({'search_query': keywords, 'original': text})
