from django.urls import path
from .views import AIChatbotView, VoiceSearchView

urlpatterns = [
    path('chat/', AIChatbotView.as_view(), name='ai_chat'),
    path('voice-search/', VoiceSearchView.as_view(), name='voice_search'),
]
