from pydantic import BaseModel
from typing import Optional

# What the frontend sends to the AI
class AIShapeRequest(BaseModel):
    x: float
    y: float
    width: float
    height: float

# What the AI sends back to the frontend
class AIPredictionResponse(BaseModel):
    width_ft: float
    length_ft: float
    total_area_sqft: float
    predicted_price: float
    ai_insight: str
    
class PlotCreate(BaseModel):
    plot_number: str
    width_ft: float
    length_ft: float
    total_area_sqft: float
    base_price: float
    status: str
    buyer_name: Optional[str] = None
    contact_number: Optional[str] = None
    managed_by: Optional[str] = None
    polygon_coordinates: str

class PlotUpdate(BaseModel):
    status: Optional[str] = None
    buyer_name: Optional[str] = None
    contact_number: Optional[str] = None
    managed_by: Optional[str] = None