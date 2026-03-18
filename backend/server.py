from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64

# Google Integration
from google_integration import create_form_and_sheet_for_park, get_sheet_data, add_row_to_sheet

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'lunapark-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Luna Park Coupon API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "cliente"  # cliente, organizzatore, admin

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "cliente"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    favorite_parks: List[str] = Field(default_factory=list)  # Lista ID luna park preferiti

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    token: Optional[str] = None
    favorite_parks: List[str] = Field(default_factory=list)

# Luna Park Models
class LunaParkCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    city: str
    region: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    opening_hours: Optional[str] = None
    opening_date: Optional[str] = None
    closing_date: Optional[str] = None
    coupon_cooldown_hours: int = 24
    # Nuovi campi
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    about_us: Optional[str] = None  # Chi Siamo
    events: Optional[str] = None  # Eventi
    # Validità coupon globale
    valid_days: Optional[List[str]] = None  # Es: ["lunedi", "martedi"]
    valid_hours_start: Optional[str] = None
    valid_hours_end: Optional[str] = None

class LunaPark(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    address: str
    city: str
    region: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    opening_hours: Optional[str] = None
    opening_date: Optional[str] = None
    closing_date: Optional[str] = None
    coupon_cooldown_hours: int = 24
    organizer_id: str
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    image_url: Optional[str] = None
    # Social & Info
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    about_us: Optional[str] = None
    events: Optional[str] = None
    valid_days: Optional[List[str]] = None
    valid_hours_start: Optional[str] = None
    valid_hours_end: Optional[str] = None
    # Google Integration
    google_form_id: Optional[str] = None
    google_form_url: Optional[str] = None
    google_sheet_id: Optional[str] = None
    google_sheet_url: Optional[str] = None

# Giostra (Ride) Models
class RideCreate(BaseModel):
    name: str
    number: Optional[str] = None  # Numero opzionale
    description: Optional[str] = None
    owner_surname: Optional[str] = None  # Cognome titolare opzionale

class Ride(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    luna_park_id: str
    name: str
    number: Optional[str] = None
    description: Optional[str] = None
    owner_surname: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Coupon Models
class CouponCreate(BaseModel):
    ride_id: str
    discount_description: str
    image_url: Optional[str] = None  # Foto coupon
    link_url: Optional[str] = None  # Link quando si clicca la foto
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    valid_days: Optional[List[str]] = None
    valid_hours_start: Optional[str] = None
    valid_hours_end: Optional[str] = None
    is_active: bool = True

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    luna_park_id: str
    ride_id: str
    ride_name: str
    ride_number: Optional[str] = None
    owner_surname: Optional[str] = None
    discount_description: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    valid_days: Optional[List[str]] = None
    valid_hours_start: Optional[str] = None
    valid_hours_end: Optional[str] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Coupon Usage Models
class CouponUsage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coupon_id: str
    user_id: Optional[str] = None
    device_id: str  # Per utenti non registrati
    used_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        return user
    except:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Non autorizzato")
    return user

async def require_organizer(user: dict = Depends(require_auth)) -> dict:
    if user["role"] not in ["organizzatore", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso riservato agli organizzatori")
    return user

async def require_admin(user: dict = Depends(require_auth)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    # Create user
    user = User(
        email=data.email,
        name=data.name,
        role=data.role
    )
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.role)
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        token=token
    )

@api_router.post("/auth/login", response_model=UserResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_token(user["id"], user["role"])
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        token=token,
        favorite_parks=user.get("favorite_parks", [])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        favorite_parks=user.get("favorite_parks", [])
    )

# Preferiti
@api_router.post("/auth/favorites/{park_id}")
async def add_favorite(park_id: str, user: dict = Depends(require_auth)):
    """Aggiunge un luna park ai preferiti"""
    favorites = user.get("favorite_parks", [])
    if park_id not in favorites:
        favorites.append(park_id)
        await db.users.update_one({"id": user["id"]}, {"$set": {"favorite_parks": favorites}})
    return {"message": "Aggiunto ai preferiti", "favorite_parks": favorites}

@api_router.delete("/auth/favorites/{park_id}")
async def remove_favorite(park_id: str, user: dict = Depends(require_auth)):
    """Rimuove un luna park dai preferiti"""
    favorites = user.get("favorite_parks", [])
    if park_id in favorites:
        favorites.remove(park_id)
        await db.users.update_one({"id": user["id"]}, {"$set": {"favorite_parks": favorites}})
    return {"message": "Rimosso dai preferiti", "favorite_parks": favorites}

@api_router.get("/auth/favorites")
async def get_favorites(user: dict = Depends(require_auth)):
    """Ottieni lista preferiti"""
    return {"favorite_parks": user.get("favorite_parks", [])}

# Elimina Account
@api_router.delete("/auth/account")
async def delete_account(user: dict = Depends(require_auth)):
    """Elimina l'account utente"""
    await db.users.delete_one({"id": user["id"]})
    # Elimina anche i luna park dell'utente se è organizzatore
    if user["role"] == "organizzatore":
        await db.luna_parks.delete_many({"organizer_id": user["id"]})
    return {"message": "Account eliminato"}

# Password dimenticata (placeholder - richiede servizio email)
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Richiede reset password"""
    user = await db.users.find_one({"email": data.email})
    if user:
        # In produzione: inviare email con link reset
        # Per ora: restituisce messaggio generico
        pass
    return {"message": "Se l'email esiste, riceverai le istruzioni per il reset"}

# ==================== LUNA PARK ROUTES ====================

@api_router.get("/lunaparks", response_model=List[LunaPark])
async def get_luna_parks(
    search: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    status: str = "approved"
):
    query = {"status": status}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"region": {"$regex": search, "$options": "i"}}
        ]
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if region:
        query["region"] = {"$regex": region, "$options": "i"}
    
    parks = await db.luna_parks.find(query, {"_id": 0}).to_list(100)
    return parks

@api_router.get("/lunaparks/{park_id}", response_model=LunaPark)
async def get_luna_park(park_id: str):
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    return park

@api_router.post("/lunaparks", response_model=LunaPark)
async def create_luna_park(data: LunaParkCreate, user: dict = Depends(require_organizer)):
    park = LunaPark(
        **data.model_dump(),
        organizer_id=user["id"],
        status="pending" if user["role"] != "admin" else "approved"
    )
    await db.luna_parks.insert_one(park.model_dump())
    return park

@api_router.put("/lunaparks/{park_id}", response_model=LunaPark)
async def update_luna_park(park_id: str, data: LunaParkCreate, user: dict = Depends(require_organizer)):
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    update_data = data.model_dump()
    await db.luna_parks.update_one({"id": park_id}, {"$set": update_data})
    updated = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    return updated

@api_router.get("/organizer/lunaparks", response_model=List[LunaPark])
async def get_organizer_luna_parks(user: dict = Depends(require_organizer)):
    query = {"organizer_id": user["id"]} if user["role"] != "admin" else {}
    parks = await db.luna_parks.find(query, {"_id": 0}).to_list(100)
    return parks

@api_router.put("/lunaparks/{park_id}/archive")
async def archive_luna_park(park_id: str, user: dict = Depends(require_organizer)):
    """Archivia un luna park (non visibile agli utenti)"""
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.luna_parks.update_one({"id": park_id}, {"$set": {"status": "archived"}})
    return {"message": "Luna Park archiviato"}

@api_router.put("/lunaparks/{park_id}/restore")
async def restore_luna_park(park_id: str, user: dict = Depends(require_organizer)):
    """Ripristina un luna park archiviato"""
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.luna_parks.update_one({"id": park_id}, {"$set": {"status": "approved"}})
    return {"message": "Luna Park ripristinato"}

# ==================== GOOGLE INTEGRATION ROUTES ====================

@api_router.post("/lunaparks/{park_id}/create-google-form")
async def create_google_form_for_park(park_id: str, user: dict = Depends(require_organizer)):
    """Crea Google Form e Sheet per un Luna Park"""
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    # Check if already has Google integration
    if park.get("google_form_id"):
        return {
            "message": "Google Form già esistente",
            "form_url": park.get("google_form_url"),
            "sheet_url": park.get("google_sheet_url")
        }
    
    # Create Form and Sheet (pass organizer email for sharing)
    result = create_form_and_sheet_for_park(park["name"], park["city"], user.get("email"))
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    # Update park with Google info
    await db.luna_parks.update_one(
        {"id": park_id},
        {"$set": {
            "google_form_id": result.get("form_id"),
            "google_form_url": result.get("form_url"),
            "google_sheet_id": result.get("sheet_id"),
            "google_sheet_url": result.get("sheet_url")
        }}
    )
    
    return {
        "success": True,
        "message": "Google Form e Sheet creati con successo",
        "form_url": result.get("form_url"),
        "form_edit_url": result.get("form_edit_url"),
        "sheet_url": result.get("sheet_url")
    }

@api_router.get("/lunaparks/{park_id}/google-data")
async def get_google_sheet_data(park_id: str, user: dict = Depends(require_organizer)):
    """Ottieni i dati dal Google Sheet"""
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    if not park.get("google_sheet_id"):
        raise HTTPException(status_code=400, detail="Nessun Google Sheet collegato")
    
    result = get_sheet_data(park["google_sheet_id"])
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.post("/lunaparks/{park_id}/import-from-google")
async def import_coupons_from_google(park_id: str, user: dict = Depends(require_organizer)):
    """Importa i coupon dal Google Sheet"""
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    if not park.get("google_sheet_id"):
        raise HTTPException(status_code=400, detail="Nessun Google Sheet collegato")
    
    # Get data from sheet
    result = get_sheet_data(park["google_sheet_id"])
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    imported_count = 0
    
    for row in result.get("data", []):
        # Skip already imported rows
        if row.get("Importato") == "Sì":
            continue
        
        nome_giostra = row.get("Nome Giostra", "").strip()
        sconto = row.get("Sconto", "").strip()
        
        if not nome_giostra or not sconto:
            continue
        
        # Check if ride exists, create if not
        ride = await db.rides.find_one({
            "luna_park_id": park_id,
            "name": nome_giostra
        }, {"_id": 0})
        
        if not ride:
            # Create the ride
            ride = {
                "id": str(uuid.uuid4()),
                "luna_park_id": park_id,
                "name": nome_giostra,
                "number": row.get("Numero Giostra", "").strip() or None,
                "owner_surname": row.get("Cognome Titolare", "").strip() or None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.rides.insert_one(ride)
        
        # Create the coupon
        coupon = {
            "id": str(uuid.uuid4()),
            "luna_park_id": park_id,
            "ride_id": ride["id"],
            "ride_name": nome_giostra,
            "ride_number": row.get("Numero Giostra", "").strip() or None,
            "owner_surname": row.get("Cognome Titolare", "").strip() or None,
            "discount_description": sconto,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.coupons.insert_one(coupon)
        imported_count += 1
    
    return {
        "success": True,
        "message": f"Importati {imported_count} coupon",
        "imported_count": imported_count
    }

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/lunaparks/pending", response_model=List[LunaPark])
async def get_pending_luna_parks(user: dict = Depends(require_admin)):
    parks = await db.luna_parks.find({"status": "pending"}, {"_id": 0}).to_list(100)
    return parks

@api_router.put("/admin/lunaparks/{park_id}/approve")
async def approve_luna_park(park_id: str, user: dict = Depends(require_admin)):
    result = await db.luna_parks.update_one(
        {"id": park_id},
        {"$set": {"status": "approved"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    return {"message": "Luna Park approvato"}

@api_router.put("/admin/lunaparks/{park_id}/reject")
async def reject_luna_park(park_id: str, user: dict = Depends(require_admin)):
    result = await db.luna_parks.update_one(
        {"id": park_id},
        {"$set": {"status": "rejected"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    return {"message": "Luna Park rifiutato"}

# ==================== RIDES ROUTES ====================

@api_router.get("/lunaparks/{park_id}/rides", response_model=List[Ride])
async def get_rides(park_id: str, search: Optional[str] = None):
    query = {"luna_park_id": park_id}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"number": {"$regex": search, "$options": "i"}}
        ]
    rides = await db.rides.find(query, {"_id": 0}).to_list(100)
    return rides

@api_router.post("/lunaparks/{park_id}/rides", response_model=Ride)
async def create_ride(park_id: str, data: RideCreate, user: dict = Depends(require_organizer)):
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    ride = Ride(
        **data.model_dump(),
        luna_park_id=park_id
    )
    await db.rides.insert_one(ride.model_dump())
    return ride

@api_router.put("/rides/{ride_id}", response_model=Ride)
async def update_ride(ride_id: str, data: RideCreate, user: dict = Depends(require_organizer)):
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Giostra non trovata")
    
    park = await db.luna_parks.find_one({"id": ride["luna_park_id"]}, {"_id": 0})
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.rides.update_one({"id": ride_id}, {"$set": data.model_dump()})
    updated = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    return updated

@api_router.delete("/rides/{ride_id}")
async def delete_ride(ride_id: str, user: dict = Depends(require_organizer)):
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Giostra non trovata")
    
    park = await db.luna_parks.find_one({"id": ride["luna_park_id"]}, {"_id": 0})
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.rides.delete_one({"id": ride_id})
    await db.coupons.delete_many({"ride_id": ride_id})
    return {"message": "Giostra eliminata"}

# ==================== COUPONS ROUTES ====================

@api_router.get("/lunaparks/{park_id}/coupons", response_model=List[Coupon])
async def get_coupons(park_id: str, search: Optional[str] = None, active_only: bool = True):
    query = {"luna_park_id": park_id}
    if active_only:
        query["is_active"] = True
    if search:
        query["$or"] = [
            {"ride_name": {"$regex": search, "$options": "i"}},
            {"ride_number": {"$regex": search, "$options": "i"}}
        ]
    coupons = await db.coupons.find(query, {"_id": 0}).to_list(100)
    return coupons

@api_router.post("/lunaparks/{park_id}/coupons", response_model=Coupon)
async def create_coupon(park_id: str, data: CouponCreate, user: dict = Depends(require_organizer)):
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    ride = await db.rides.find_one({"id": data.ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Giostra non trovata")
    
    coupon = Coupon(
        **data.model_dump(),
        luna_park_id=park_id,
        ride_name=ride["name"],
        ride_number=ride.get("number"),
        owner_surname=ride.get("owner_surname")
    )
    await db.coupons.insert_one(coupon.model_dump())
    return coupon

@api_router.put("/coupons/{coupon_id}", response_model=Coupon)
async def update_coupon(coupon_id: str, data: CouponCreate, user: dict = Depends(require_organizer)):
    coupon = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon non trovato")
    
    park = await db.luna_parks.find_one({"id": coupon["luna_park_id"]}, {"_id": 0})
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    ride = await db.rides.find_one({"id": data.ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Giostra non trovata")
    
    update_data = data.model_dump()
    update_data["ride_name"] = ride["name"]
    update_data["ride_number"] = ride.get("number")
    update_data["owner_surname"] = ride.get("owner_surname")
    
    await db.coupons.update_one({"id": coupon_id}, {"$set": update_data})
    updated = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    return updated

@api_router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, user: dict = Depends(require_organizer)):
    coupon = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon non trovato")
    
    park = await db.luna_parks.find_one({"id": coupon["luna_park_id"]}, {"_id": 0})
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.coupons.delete_one({"id": coupon_id})
    return {"message": "Coupon eliminato"}

# ==================== COUPON USAGE ROUTES ====================

class UseCouponRequest(BaseModel):
    device_id: str

class CouponUsageResponse(BaseModel):
    success: bool
    message: str
    next_available_at: Optional[str] = None
    cooldown_hours: int = 0

@api_router.post("/coupons/{coupon_id}/use", response_model=CouponUsageResponse)
async def use_coupon(
    coupon_id: str, 
    data: UseCouponRequest,
    user: Optional[dict] = Depends(get_current_user)
):
    coupon = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon non trovato")
    
    if not coupon.get("is_active", True):
        return CouponUsageResponse(success=False, message="Questo coupon non è più attivo")
    
    park = await db.luna_parks.find_one({"id": coupon["luna_park_id"]}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    
    cooldown_hours = park.get("coupon_cooldown_hours", 24)
    
    # Check last usage
    user_id = user["id"] if user else None
    usage_query = {"coupon_id": coupon_id, "device_id": data.device_id}
    if user_id:
        usage_query = {"coupon_id": coupon_id, "$or": [{"user_id": user_id}, {"device_id": data.device_id}]}
    
    last_usage = await db.coupon_usages.find_one(
        usage_query,
        sort=[("used_at", -1)]
    )
    
    if last_usage:
        last_used = datetime.fromisoformat(last_usage["used_at"].replace("Z", "+00:00"))
        next_available = last_used + timedelta(hours=cooldown_hours)
        now = datetime.now(timezone.utc)
        
        if now < next_available:
            remaining = next_available - now
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            return CouponUsageResponse(
                success=False,
                message=f"Potrai usare questo coupon tra {hours}h {minutes}m",
                next_available_at=next_available.isoformat(),
                cooldown_hours=cooldown_hours
            )
    
    # Record usage
    usage = CouponUsage(
        coupon_id=coupon_id,
        user_id=user_id,
        device_id=data.device_id
    )
    await db.coupon_usages.insert_one(usage.model_dump())
    
    next_available = datetime.now(timezone.utc) + timedelta(hours=cooldown_hours)
    return CouponUsageResponse(
        success=True,
        message=f"Coupon utilizzato! Mostra questa schermata alla cassa.",
        next_available_at=next_available.isoformat(),
        cooldown_hours=cooldown_hours
    )

@api_router.get("/coupons/{coupon_id}/check-availability")
async def check_coupon_availability(
    coupon_id: str,
    device_id: str,
    user: Optional[dict] = Depends(get_current_user)
):
    coupon = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon non trovato")
    
    park = await db.luna_parks.find_one({"id": coupon["luna_park_id"]}, {"_id": 0})
    cooldown_hours = park.get("coupon_cooldown_hours", 24) if park else 24
    
    user_id = user["id"] if user else None
    usage_query = {"coupon_id": coupon_id, "device_id": device_id}
    if user_id:
        usage_query = {"coupon_id": coupon_id, "$or": [{"user_id": user_id}, {"device_id": device_id}]}
    
    last_usage = await db.coupon_usages.find_one(
        usage_query,
        sort=[("used_at", -1)]
    )
    
    if last_usage:
        last_used = datetime.fromisoformat(last_usage["used_at"].replace("Z", "+00:00"))
        next_available = last_used + timedelta(hours=cooldown_hours)
        now = datetime.now(timezone.utc)
        
        if now < next_available:
            remaining = next_available - now
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            return {
                "available": False,
                "message": f"Disponibile tra {hours}h {minutes}m",
                "next_available_at": next_available.isoformat()
            }
    
    return {"available": True, "message": "Coupon disponibile"}

# ==================== STATS ROUTES ====================

@api_router.get("/organizer/stats")
async def get_organizer_stats(user: dict = Depends(require_organizer)):
    query = {"organizer_id": user["id"]} if user["role"] != "admin" else {}
    parks = await db.luna_parks.find(query, {"_id": 0}).to_list(100)
    park_ids = [p["id"] for p in parks]
    
    total_rides = await db.rides.count_documents({"luna_park_id": {"$in": park_ids}})
    total_coupons = await db.coupons.count_documents({"luna_park_id": {"$in": park_ids}})
    total_usages = await db.coupon_usages.count_documents({"coupon_id": {"$in": [
        c["id"] for c in await db.coupons.find({"luna_park_id": {"$in": park_ids}}, {"id": 1, "_id": 0}).to_list(1000)
    ]}})
    
    return {
        "total_parks": len(parks),
        "total_rides": total_rides,
        "total_coupons": total_coupons,
        "total_usages": total_usages
    }

# ==================== IMAGE UPLOAD ====================

class ImageUploadResponse(BaseModel):
    success: bool
    image_url: str
    message: str

@api_router.post("/upload/image", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_organizer)
):
    """Upload an image and return base64 data URL"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Tipo file non supportato. Usa JPG, PNG, WebP o GIF.")
        
        # Read and encode file
        contents = await file.read()
        
        # Check file size (max 5MB)
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File troppo grande. Massimo 5MB.")
        
        # Convert to base64 data URL
        base64_encoded = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_encoded}"
        
        return ImageUploadResponse(
            success=True,
            image_url=data_url,
            message="Immagine caricata con successo"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail="Errore durante il caricamento dell'immagine")

@api_router.put("/lunaparks/{park_id}/image")
async def update_park_image(
    park_id: str,
    image_url: str,
    user: dict = Depends(require_organizer)
):
    """Update luna park image"""
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.luna_parks.update_one({"id": park_id}, {"$set": {"image_url": image_url}})
    return {"message": "Immagine aggiornata con successo"}

class UpdateParkImageRequest(BaseModel):
    image_url: str

@api_router.put("/lunaparks/{park_id}/update-image")
async def update_park_image_body(
    park_id: str,
    data: UpdateParkImageRequest,
    user: dict = Depends(require_organizer)
):
    """Update luna park image via request body"""
    park = await db.luna_parks.find_one({"id": park_id}, {"_id": 0})
    if not park:
        raise HTTPException(status_code=404, detail="Luna Park non trovato")
    if park["organizer_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    await db.luna_parks.update_one({"id": park_id}, {"$set": {"image_url": data.image_url}})
    return {"message": "Immagine aggiornata con successo"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Seed demo data for testing"""
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@lunapark.it"})
    if not admin_exists:
        admin = {
            "id": str(uuid.uuid4()),
            "email": "admin@lunapark.it",
            "name": "Admin",
            "role": "admin",
            "password": hash_password("admin123"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin)
    
    # Create demo organizer
    org_exists = await db.users.find_one({"email": "organizzatore@lunapark.it"})
    if not org_exists:
        org = {
            "id": "org-demo-1",
            "email": "organizzatore@lunapark.it",
            "name": "Mario Rossi",
            "role": "organizzatore",
            "password": hash_password("org123"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(org)
    
    # Create demo luna parks
    parks_exist = await db.luna_parks.count_documents({})
    if parks_exist == 0:
        demo_parks = [
            {
                "id": "park-1",
                "name": "Luna Park Andora",
                "description": "Il più grande luna park della Riviera Ligure! Divertimento per tutta la famiglia.",
                "address": "Via Vespucci, Lungo il Fiume",
                "city": "Andora",
                "region": "Liguria",
                "latitude": 43.9456,
                "longitude": 8.1418,
                "phone": "320 0452523",
                "opening_hours": "20:30 - 24:00",
                "opening_date": "20 Giugno 2025",
                "closing_date": "1 Settembre 2025",
                "coupon_cooldown_hours": 4,
                "organizer_id": "org-demo-1",
                "status": "approved",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "image_url": "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=800"
            },
            {
                "id": "park-2",
                "name": "Luna Park Roma EUR",
                "description": "Giostre moderne e attrazioni per tutti nel cuore di Roma.",
                "address": "Piazzale dell'Industria",
                "city": "Roma",
                "region": "Lazio",
                "latitude": 41.8311,
                "longitude": 12.4686,
                "phone": "06 1234567",
                "opening_hours": "17:00 - 23:00",
                "opening_date": "15 Maggio 2025",
                "closing_date": "15 Settembre 2025",
                "coupon_cooldown_hours": 6,
                "organizer_id": "org-demo-1",
                "status": "approved",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "image_url": "https://images.unsplash.com/photo-1536768139911-e290a59011e4?w=800"
            },
            {
                "id": "park-3",
                "name": "Luna Park Milano Idroscalo",
                "description": "Il luna park più atteso dell'estate milanese!",
                "address": "Via Circonvallazione Est",
                "city": "Milano",
                "region": "Lombardia",
                "latitude": 45.4536,
                "longitude": 9.2820,
                "phone": "02 9876543",
                "opening_hours": "18:00 - 01:00",
                "opening_date": "1 Luglio 2025",
                "closing_date": "31 Agosto 2025",
                "coupon_cooldown_hours": 3,
                "organizer_id": "org-demo-1",
                "status": "approved",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "image_url": "https://images.unsplash.com/photo-1567446537708-ac4aa75c9c28?w=800"
            }
        ]
        await db.luna_parks.insert_many(demo_parks)
        
        # Create demo rides
        demo_rides = [
            {"id": "ride-1", "luna_park_id": "park-1", "name": "Ruota Panoramica", "number": "1", "owner_surname": "Bianchi", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "ride-2", "luna_park_id": "park-1", "name": "Montagne Russe", "number": "2", "owner_surname": "Verdi", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "ride-3", "luna_park_id": "park-1", "name": "Autoscontro", "number": "3", "owner_surname": "Neri", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "ride-4", "luna_park_id": "park-1", "name": "Casa degli Specchi", "number": "4", "owner_surname": "Gialli", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "ride-5", "luna_park_id": "park-2", "name": "Tagadà", "number": "1", "owner_surname": "Russo", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "ride-6", "luna_park_id": "park-2", "name": "Calcinculo", "number": "2", "owner_surname": "Ferrari", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "ride-7", "luna_park_id": "park-3", "name": "Giostra Cavalli", "number": "1", "owner_surname": "Colombo", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "ride-8", "luna_park_id": "park-3", "name": "Bruco Mela", "number": "2", "owner_surname": "Fontana", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.rides.insert_many(demo_rides)
        
        # Create demo coupons
        demo_coupons = [
            {"id": "coupon-1", "luna_park_id": "park-1", "ride_id": "ride-1", "ride_name": "Ruota Panoramica", "ride_number": "1", "owner_surname": "Bianchi", "discount_amount": 1.0, "discount_description": "1€ di sconto", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "coupon-2", "luna_park_id": "park-1", "ride_id": "ride-2", "ride_name": "Montagne Russe", "ride_number": "2", "owner_surname": "Verdi", "discount_amount": 1.5, "discount_description": "1.50€ di sconto", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "coupon-3", "luna_park_id": "park-1", "ride_id": "ride-3", "ride_name": "Autoscontro", "ride_number": "3", "owner_surname": "Neri", "discount_amount": 0.5, "discount_description": "0.50€ di sconto", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "coupon-4", "luna_park_id": "park-2", "ride_id": "ride-5", "ride_name": "Tagadà", "ride_number": "1", "owner_surname": "Russo", "discount_amount": 1.0, "discount_description": "1€ di sconto", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "coupon-5", "luna_park_id": "park-3", "ride_id": "ride-7", "ride_name": "Giostra Cavalli", "ride_number": "1", "owner_surname": "Colombo", "discount_amount": 1.0, "discount_description": "1€ di sconto", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.coupons.insert_many(demo_coupons)
    
    return {"message": "Demo data seeded successfully"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Luna Park Coupon API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
