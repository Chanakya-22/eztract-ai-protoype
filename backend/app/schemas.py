from pydantic import BaseModel

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