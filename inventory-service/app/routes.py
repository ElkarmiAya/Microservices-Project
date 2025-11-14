from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas, database

router = APIRouter()

@router.get("/")
def home():
    return {"message": "Inventory Service is running"}

@router.post("/items", response_model=schemas.InventoryItemResponse)
def create_item(item: schemas.InventoryItemCreate, db: Session = Depends(database.get_db)):
    new_item = models.InventoryItem(name=item.name, quantity=item.quantity)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/items", response_model=list[schemas.InventoryItemResponse])
def list_items(db: Session = Depends(database.get_db)):
    return db.query(models.InventoryItem).all()

# ✅ NOUVEAU : Récupérer un item par ID
@router.get("/items/{item_id}", response_model=schemas.InventoryItemResponse)
def get_item(item_id: int, db: Session = Depends(database.get_db)):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    return item

# ✅ NOUVEAU : Décrémenter le stock
@router.put("/items/{item_id}/decrement", response_model=schemas.InventoryItemResponse)
def decrement_stock(
    item_id: int, 
    quantity_data: schemas.QuantityDecrement, 
    db: Session = Depends(database.get_db)
):
    # Récupérer l'item
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    # Vérifier si le stock est suffisant
    if item.quantity < quantity_data.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Stock insuffisant. Disponible: {item.quantity}, Demandé: {quantity_data.quantity}"
        )
    
    # Décrémenter le stock
    item.quantity -= quantity_data.quantity
    db.commit()
    db.refresh(item)
    
    return item

# ✅ NOUVEAU : Incrémenter le stock (utile pour les retours)
@router.put("/items/{item_id}/increment", response_model=schemas.InventoryItemResponse)
def increment_stock(
    item_id: int, 
    quantity_data: schemas.QuantityIncrement, 
    db: Session = Depends(database.get_db)
):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    # Incrémenter le stock
    item.quantity += quantity_data.quantity
    db.commit()
    db.refresh(item)
    
    return item

# ✅ NOUVEAU : Mettre à jour complètement un item
@router.put("/items/{item_id}", response_model=schemas.InventoryItemResponse)
def update_item(
    item_id: int, 
    item_update: schemas.InventoryItemUpdate, 
    db: Session = Depends(database.get_db)
):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    # Mettre à jour les champs fournis
    if item_update.name is not None:
        item.name = item_update.name
    if item_update.quantity is not None:
        item.quantity = item_update.quantity
    
    db.commit()
    db.refresh(item)
    
    return item

# ✅ NOUVEAU : Supprimer un item
@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(database.get_db)):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    db.delete(item)
    db.commit()
    
    return {"message": f"Item {item_id} supprimé avec succès"}