from prometheus_client import Counter, Gauge, Histogram, Summary, generate_latest, REGISTRY
from starlette.middleware.base import BaseHTTPMiddleware
import time

# ============================================
# 1️⃣ COUNTERS (Compteurs)
# ============================================

# Basique : Nombre total de requêtes HTTP
http_requests_total = Counter(
    'http_requests_total',
    'Total number of HTTP requests',
    ['method', 'endpoint', 'status']
)

# Avancé : Nombre d'items créés
items_created_total = Counter(
    'items_created_total',
    'Total number of items created'
)

# Avancé : Nombre d'opérations sur le stock
stock_operations_total = Counter(
    'stock_operations_total',
    'Total number of stock operations',
    ['operation', 'status']
)

# Avancé : Nombre d'erreurs
inventory_errors_total = Counter(
    'inventory_errors_total',
    'Total number of inventory errors',
    ['error_type']
)

# ============================================
# 2️⃣ GAUGES (Jauges)
# ============================================

# Basique : Stock total actuel
current_stock_total = Gauge(
    'current_stock_total',
    'Current total stock across all items'
)

# Avancé : Stock par produit
stock_by_item = Gauge(
    'stock_by_item',
    'Current stock for each item',
    ['item_id', 'item_name']
)

# Avancé : Nombre de produits différents
unique_items_count = Gauge(
    'unique_items_count',
    'Number of unique items in inventory'
)

# Avancé : Valeur totale de l'inventaire
inventory_total_value = Gauge(
    'inventory_total_value_mad',
    'Total value of inventory in MAD'
)

# Avancé : Items avec stock faible
low_stock_items = Gauge(
    'low_stock_items',
    'Number of items with low stock (< 10)'
)

# ============================================
# 3️⃣ HISTOGRAMS (Histogrammes)
# ============================================

# Basique : Durée des requêtes HTTP
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'Duration of HTTP requests in seconds',
    ['method', 'endpoint', 'status'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1, 2]
)

# Avancé : Quantité des opérations de stock
stock_operation_quantity = Histogram(
    'stock_operation_quantity',
    'Quantity of items in stock operations',
    ['operation'],
    buckets=[1, 5, 10, 20, 50, 100]
)

# Avancé : Prix des produits
item_price_distribution = Histogram(
    'item_price_mad',
    'Distribution of item prices in MAD',
    buckets=[100, 500, 1000, 5000, 10000, 50000]
)

# Avancé : Temps de requête base de données
database_query_duration = Histogram(
    'database_query_duration_seconds',
    'Database query execution time',
    ['operation'],
    buckets=[0.001, 0.01, 0.05, 0.1, 0.5]
)

# ============================================
# 4️⃣ SUMMARIES (Résumés)
# ============================================

# Basique : Temps de réponse API
api_response_time = Summary(
    'api_response_time_seconds',
    'API response time in seconds',
    ['endpoint']
)

# Avancé : Latence des opérations de stock
stock_operation_latency = Summary(
    'stock_operation_latency_seconds',
    'Latency of stock operations',
    ['operation']
)

# Avancé : Temps de traitement des requêtes par type
request_processing_time = Summary(
    'request_processing_time_seconds',
    'Request processing time by type',
    ['request_type']
)

# ============================================
# Middleware pour collecter les métriques HTTP
# ============================================
class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        # Counter
        http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        # Histogram
        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).observe(duration)
        
        # Summary
        api_response_time.labels(
            endpoint=request.url.path
        ).observe(duration)
        
        return response