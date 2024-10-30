import logging

from ninja import NinjaAPI
from oauth2_provider.models import AccessToken

from bats_ai.core.views import GRTSCellsRouter, GuanoMetadataRouter, RecordingRouter, SpeciesRouter

logger = logging.getLogger(__name__)


def global_auth(request):
    if request.user.is_anonymous:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if len(token) > 0:
            try:
                access_token = AccessToken.objects.get(token=token)
            except AccessToken.DoesNotExist:
                access_token = None
            if access_token and access_token.user:
                if not access_token.user.is_anonymous:
                    request.user = access_token.user
    return not request.user.is_anonymous


api = NinjaAPI(auth=global_auth)

api.add_router('/recording/', RecordingRouter)
api.add_router('/species/', SpeciesRouter)
api.add_router('/grts/', GRTSCellsRouter)
api.add_router('/guano/', GuanoMetadataRouter)
