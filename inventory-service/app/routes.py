from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from . import models, schemas, database
from .metrics import (
    items_created_total,
    stock_operations_total,
    inventory_errors_total,
    current_stock_total,
    stock_by_item,
    unique_items_count,
    inventory_total_value,
    low_stock_items,
    stock_operation_quantity,
    item_price_distribution,
    database_query_duration,
    stock_operation_latency
)
import time

router = APIRouter()

# ✅ Fonction pour mettre à jour les gauges
def update_inventory_gauges(db: Session):
    try:
        start_time = time.time()
        
        # Stock total
        total_stock = db.query(func.sum(models.InventoryItem.quantity)).scalar() or 0
        current_stock_total.set(total_stock)
        
        # Nombre de produits uniques
        item_count = db.query(models.InventoryItem).count()
        unique_items_count.set(item_count)
        
        # Valeur totale de l'inventaire
        items = db.query(models.InventoryItem).all()
        total_value = sum(item.quantity * item.price for item in items)
        inventory_total_value.set(total_value)
        
        # Items avec stock faible
        low_stock_count = db.query(models.InventoryItem).filter(models.InventoryItem.quantity < 10).count()
        low_stock_items.set(low_stock_count)
        
        # Stock par item
        for item in items:
            stock_by_item.labels(
                item_id=str(item.id),
                item_name=item.name
            ).set(item.quantity)
        
        # Mesurer le temps de requête
        duration = time.time() - start_time
        database_query_duration.labels(operation='update_gauges').observe(duration)
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des gauges: {e}")
        inventory_errors_total.labels(error_type='gauge_update_failed').inc()

@router.get("/")
def home():
    return {"message": "Inventory Service is running"}

@router.post("/items", response_model=schemas.InventoryItemResponse)
def create_item(item: schemas.InventoryItemCreate, db: Session = Depends(database.get_db)):
    start_time = time.time()
    
    try:
        new_item = models.InventoryItem(
            name=item.name, 
            quantity=item.quantity,
            price=item.price
        )
        
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        # ✅ Métriques
        items_created_total.inc()
        item_price_distribution.observe(float(item.price))
        
        # Latence
        duration = time.time() - start_time
        stock_operation_latency.labels(operation='create').observe(duration)
        
        # Mettre à jour les gauges
        update_inventory_gauges(db)
        
        return new_item
        
    except Exception as e:
        inventory_errors_total.labels(error_type='creation_failed').inc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items", response_model=list[schemas.InventoryItemResponse])
def list_items(db: Session = Depends(database.get_db)):
    start_time = time.time()
    
    items = db.query(models.InventoryItem).all()
    
    # Mesurer le temps de requête
    duration = time.time() - start_time
    database_query_duration.labels(operation='list_items').observe(duration)
    
    return items

@router.get("/items/{item_id}", response_model=schemas.InventoryItemResponse)
def get_item(item_id: int, db: Session = Depends(database.get_db)):
    start_time = time.time()
    
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    
    duration = time.time() - start_time
    database_query_duration.labels(operation='get_item').observe(duration)
    
    if not item:
        inventory_errors_total.labels(error_type='item_not_found').inc()
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    return item

@router.put("/items/{item_id}/decrement", response_model=schemas.InventoryItemResponse)
def decrement_stock(
    item_id: int, 
    quantity_data: schemas.QuantityDecrement, 
    db: Session = Depends(database.get_db)
):
    start_time = time.time()
    
    try:
        item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
        
        if not item:
            inventory_errors_total.labels(error_type='item_not_found').inc()
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        if item.quantity < quantity_data.quantity:
            inventory_errors_total.labels(error_type='insufficient_stock').inc()
            stock_operations_total.labels(operation='decrement', status='error').inc()
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuffisant. Disponible: {item.quantity}, Demandé: {quantity_data.quantity}"
            )
        
        # Décrémenter le stock
        item.quantity -= quantity_data.quantity
        db.commit()
        db.refresh(item)
        
        # ✅ Métriques
        stock_operations_total.labels(operation='decrement', status='success').inc()
        stock_operation_quantity.labels(operation='decrement').observe(quantity_data.quantity)
        
        # Latence
        duration = time.time() - start_time
        stock_operation_latency.labels(operation='decrement').observe(duration)
        
        # Mettre à jour les gauges
        update_inventory_gauges(db)
        
        return item
        
    except HTTPException:
        raise
    except Exception as e:
        inventory_errors_total.labels(error_type='decrement_failed').inc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/items/{item_id}/increment", response_model=schemas.InventoryItemResponse)
def increment_stock(
    item_id: int, 
    quantity_data: schemas.QuantityIncrement, 
    db: Session = Depends(database.get_db)
):
    start_time = time.time()
    
    try:
        item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
        
        if not item:
            inventory_errors_total.labels(error_type='item_not_found').inc()
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        # Incrémenter le stock
        item.quantity += quantity_data.quantity
        db.commit()
        db.refresh(item)
        
        # ✅ Métriques
        stock_operations_total.labels(operation='increment', status='success').inc()
        stock_operation_quantity.labels(operation='increment').observe(quantity_data.quantity)
        
        # Latence
        duration = time.time() - start_time
        stock_operation_latency.labels(operation='increment').observe(duration)
        
        # Mettre à jour les gauges
        update_inventory_gauges(db)
        
        return item
        
    except HTTPException:
        raise
    except Exception as e:
        inventory_errors_total.labels(error_type='increment_failed').inc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/items/{item_id}", response_model=schemas.InventoryItemResponse)
def update_item(
    item_id: int, 
    item_update: schemas.InventoryItemUpdate, 
    db: Session = Depends(database.get_db)
):
    start_time = time.time()
    
    try:
        item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
        
        if not item:
            inventory_errors_total.labels(error_type='item_not_found').inc()
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        # Mettre à jour les champs fournis
        if item_update.name is not None:
            item.name = item_update.name
        if item_update.quantity is not None:
            item.quantity = item_update.quantity
        if item_update.price is not None:
            item.price = item_update.price
            item_price_distribution.observe(float(item_update.price))
        
        db.commit()
        db.refresh(item)
        
        # Latence
        duration = time.time() - start_time
        stock_operation_latency.labels(operation='update').observe(duration)
        
        # Mettre à jour les gauges
        update_inventory_gauges(db)
        
        return item
        
    except HTTPException:
        raise
    except Exception as e:
        inventory_errors_total.labels(error_type='update_failed').inc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(database.get_db)):
    start_time = time.time()
    
    try:
        item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
        
        if not item:
            inventory_errors_total.labels(error_type='item_not_found').inc()
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        db.delete(item)
        db.commit()
        
        # Latence
        duration = time.time() - start_time
        stock_operation_latency.labels(operation='delete').observe(duration)
        
        # Mettre à jour les gauges
        update_inventory_gauges(db)
        
        return {"message": f"Item {item_id} supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        inventory_errors_total.labels(error_type='delete_failed').inc()
        raise HTTPException(status_code=500, detail=str(e))