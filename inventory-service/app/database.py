#dans ce fichier nous allons assurer la connection a la base de donnes PostgesSQL 
from sqlalchemy import create_engine , text 
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
try:
    # essaie de te connecter et exécuter une simple requête
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("✅ Connexion à PostgreSQL réussie !")
except Exception as e:
    print("❌ Impossible de se connecter à PostgreSQL :", e)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
