from sqlalchemy import Column, Integer, String, Float
from .database import Base

class InventoryItem(Base):
    __tablename__= "inventory_items"

    id = Column(Integer, primary_key=True, index= True)
    name = Column(String, index = True)
    quantity =Column(Integer)
    price = Column(Float, nullable=False)  # ✅ NOUVEAU champ prix

