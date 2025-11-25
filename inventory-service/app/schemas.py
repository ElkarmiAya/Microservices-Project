# ce fichier a deux roles principeaux :
# 1- Définir les “schemas” ou “pydantic models”:
####### Ce sont des classes Python qui valident et sérialisent les données entrantes ou sortantes de ton API.
# 2- Séparer les données internes et externes
####### Les models.py (SQLAlchemy) représentent la structure réelle de la base de données.
####### Les schemas.py représentent les données que l’API envoie ou reçoit. 
from pydantic import  BaseModel, ConfigDict, Field
from typing import Optional

# Pour créer un nouvel item
class InventoryItemCreate(BaseModel):
    name: str
    quantity: int
    price: float = Field(..., gt=0, description="Prix unitaire de l'item")  # ✅ NOUVEAU


# Pour renvoyer un item à l'utilisateur
class InventoryItemResponse(BaseModel):
    id: int
    name: str
    quantity: int
    price: float  # ✅ NOUVEAU

    model_config = ConfigDict(from_attributes=True)

# ✅ AJOUTEZ CES NOUVEAUX SCHEMAS

# Pour décrémenter le stock
class QuantityDecrement(BaseModel):
    quantity: int

# Pour incrémenter le stock
class QuantityIncrement(BaseModel):
    quantity: int

# Pour mettre à jour un item
class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = Field(None, gt=0, description="Prix unitaire")  # ✅ NOUVEAU 