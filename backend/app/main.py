from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database
import math
from . import schemas

# Initialize the FastAPI app
app = FastAPI(title="EZTract AI Prototype API")

# Setup CORS (Crucial so your Next.js frontend on localhost:3000 can communicate with this API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, we change "*" to your actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint 1: Fetch all plots to display on the map
@app.get("/api/plots")
def get_all_plots(db: Session = Depends(database.get_db)):
    # Query the database for all rows in the Plot table
    plots = db.query(models.Plot).all()
    return {"status": "success", "data": plots}

# A simple root check to ensure the server is running
@app.get("/")
def read_root():
    return {"message": "EZTract Backend is Running!"}

@app.post("/api/ai/predict-price", response_model=schemas.AIPredictionResponse)
def predict_plot_price(shape: schemas.AIShapeRequest, db: Session = Depends(database.get_db)):
    # 1. Spatial Conversion: Convert Pixels to Real-World Feet
    # Assuming for this Kumaran Nagar map, 1 pixel = ~0.5 feet based on our sample data
    PIXEL_TO_FEET_RATIO = 0.5 
    
    width_ft = round(abs(shape.width) * PIXEL_TO_FEET_RATIO, 1)
    length_ft = round(abs(shape.height) * PIXEL_TO_FEET_RATIO, 1)
    
    # Ensure minimum sensible dimensions
    if width_ft < 10: width_ft = 20.0
    if length_ft < 10: length_ft = 30.0
        
    total_area = round(width_ft * length_ft, 1)

    # 2. Base Valuation Logic (Industry Standard calculation)
    # Let's assume the base rate in this area is ₹1,200 per sq ft.
    base_rate_per_sqft = 1200
    predicted_price = total_area * base_rate_per_sqft

    # 3. Proximity & Optimization Logic (The "AI" part)
    # If the area is larger than 1500 sqft, it's considered premium
    insight = ""
    if total_area > 1500:
        premium_multiplier = 1.15 # 15% bump for large plots
        predicted_price *= premium_multiplier
        insight = f"AI Insight: Large plot detected ({total_area} sq ft). Applying a 15% premium due to high demand for spacious corner-store layouts in this quadrant."
    elif width_ft > length_ft:
        insight = "AI Tip: This plot has a wide frontage. Consider adjusting the depth to maximize commercial visibility and valuation."
    else:
        insight = "AI Tip: Standard dimensions. Highly suitable for residential buyers. Suggested listing price aligns with current market average."

    return {
        "width_ft": width_ft,
        "length_ft": length_ft,
        "total_area_sqft": total_area,
        "predicted_price": round(predicted_price, 2),
        "ai_insight": insight
    }
    