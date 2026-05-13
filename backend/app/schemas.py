from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# --- CV / SPATIAL SCHEMAS ---
class AIShapeRequest(BaseModel):
    x: float
    y: float
    width: float
    height: float

class AIPredictionResponse(BaseModel):
    width_ft: float
    length_ft: float
    total_area_sqft: float
    predicted_price: float
    ai_insight: str

# --- PLOT DATABASE SCHEMAS ---
class PlotBase(BaseModel):
    project_id: str  # <--- NEW FIELD added here
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

class PlotCreate(PlotBase):
    pass

class PlotResponse(PlotBase):
    id: int
    booking_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- AI INSIGHT SCHEMAS ---
class PricingWindowInsight(BaseModel):
    plot_number: str
    optimal_price: float
    probability_optimal: int
    timeframe_weeks: int
    drop_price_threshold: float
    probability_drop: int
    insight_message: str
        
class CompletionForecastInsight(BaseModel):
    projected_sellout_date: str
    current_velocity: float
    available_plots: int
    ai_suggestion: str        
    
class PlotBundle(BaseModel):
    bundle_name: str
    total_area: float
    bundled_price: float
    viability: str

class SmartBundlingInsight(BaseModel):
    bundles: list[PlotBundle]
    insight_message: str    
    
class BuyerPersonaInsight(BaseModel):
    plot_number: str
    persona_name: str
    target_demographic: str
    recommended_pitch: str