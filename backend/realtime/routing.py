from django.urls import re_path

from . import consumers


class HealthConsumer(consumers.AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send_json({"type": "pong"})
        await self.close()


websocket_urlpatterns = [
    re_path(r"^ws/v1/status/$", consumers.StatusConsumer.as_asgi()),
    re_path(r"^ws/health/$", HealthConsumer.as_asgi()),
]
