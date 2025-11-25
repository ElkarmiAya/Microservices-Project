from fastapi import FastAPI
from fastapi.responses import Response
from sqlalchemy import text
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from .database import engine, Base
from .routes import router as inventory_router
from .metrics import MetricsMiddleware
import psycopg2

# Créer les tables au démarrage
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory Service", version="1.0.0")

# ✅ Ajouter le middleware de métriques
app.add_middleware(MetricsMiddleware)

# Inclure les routes
app.include_router(inventory_router)

@app.get("/")
def root():
    return {"message": "Inventory Service is running"}

# ✅ Endpoint /health
@app.get("/health")
def health_check():
    try:
        # Vérifier la connexion à la base de données
        from .database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        
        return {
            "status": "healthy",
            "service": "inventory-service",
            "checks": {
                "database": "connected"
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "inventory-service",
            "error": str(e)
        }

# ✅ Endpoint /metrics (format Prometheus)
@app.get("/metrics")
def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )