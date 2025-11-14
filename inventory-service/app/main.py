from fastapi import FastAPI
from . import models, database
from .routes import router as inventory_router

app = FastAPI(title="Inventory Service")


# Crée les tables au démarrage
models.Base.metadata.create_all(bind=database.engine)

# Inclure les routes

app.include_router(inventory_router, prefix="", tags=["Items"])