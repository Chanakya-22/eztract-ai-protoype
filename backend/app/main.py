from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import math
from . import models, schemas, database
from .database import engine
from datetime import datetime, timedelta

# Initialize the FastAPI app
app = FastAPI(title="EZTract AI Prototype API")

# Setup CORS (Crucial so your Next.js frontend on localhost:3000 can communicate with this API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ← exact origin, not "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint 1: Fetch all plots to display on the map
@app.get("/api/plots")
def get_all_plots(db: Session = Depends(database.get_db)):
    plots = db.query(models.Plot).all()
    result = []
    for plot in plots:
        result.append({
            "id": plot.id,
            "plot_number": plot.plot_number,
            "width_ft": plot.width_ft,
            "length_ft": plot.length_ft,
            "total_area_sqft": plot.total_area_sqft,
            "base_price": plot.base_price,
            "status": plot.status.value if plot.status else "Available",
            "buyer_name": plot.buyer_name,
            "contact_number": plot.contact_number,
            "managed_by": plot.managed_by,
            "polygon_coordinates": plot.polygon_coordinates,
        })
    return {"status": "success", "data": result}

@app.post("/api/plots")
def create_plot(plot_data: schemas.PlotCreate, db: Session = Depends(database.get_db)):
    # Convert the string status to the Enum expected by the database
    db_status = models.PlotStatus(plot_data.status)
    
    new_plot = models.Plot(
        plot_number=plot_data.plot_number,
        width_ft=plot_data.width_ft,
        length_ft=plot_data.length_ft,
        total_area_sqft=plot_data.total_area_sqft,
        base_price=plot_data.base_price,
        status=db_status,
        buyer_name=plot_data.buyer_name,
        contact_number=plot_data.contact_number,
        managed_by=plot_data.managed_by,
        polygon_coordinates=plot_data.polygon_coordinates
    )
    db.add(new_plot)
    db.commit()
    db.refresh(new_plot)
    return {"status": "success", "message": "Plot saved successfully!"}

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
from pydantic import BaseModel

class LoginRequest(BaseModel):
    password: str

@app.post("/api/admin/login")
def admin_login(req: LoginRequest):
    if req.password == "admin123":
        return {"status": "success", "role": "admin"}
    raise HTTPException(status_code=401, detail="Incorrect Password")    


# ==========================================
# PHASE 3: AI INTELLIGENCE ENDPOINTS
# ==========================================

@app.get("/api/insights/pricing-window/{plot_number}", response_model=schemas.PricingWindowInsight)
def get_pricing_window_insight(plot_number: str, db: Session = Depends(database.get_db)):
    # 1. Fetch the target plot
    target_plot = db.query(models.Plot).filter(models.Plot.plot_number == plot_number).first()
    if not target_plot:
        raise HTTPException(status_code=404, detail="Plot not found in database")

    # 2. Gather Layout Ground Truth Data
    all_plots = db.query(models.Plot).filter(models.Plot.total_area_sqft > 0).all()
    if not all_plots:
        raise HTTPException(status_code=400, detail="Insufficient layout data")

    # Calculate live market average price-per-sqft across the whole layout
    total_value = sum(p.base_price for p in all_plots if p.base_price)
    total_sqft = sum(p.total_area_sqft for p in all_plots if p.total_area_sqft)
    market_avg_psf = total_value / total_sqft if total_sqft else 1200

    # 3. Statistical Analysis for Target Plot
    plot_sqft = target_plot.total_area_sqft
    
    # Baseline optimal price aligned with live market data
    optimal_price = plot_sqft * market_avg_psf
    
    # Market Velocity Logic: Smaller plots (<1600 sqft) sell faster than massive ones
    if plot_sqft <= 1600:
        base_weeks = 2
        prob_optimal = 82
    elif plot_sqft <= 2400:
        base_weeks = 3
        prob_optimal = 78
    else:
        base_weeks = 5
        prob_optimal = 65

    # Penalty Logic: Overpricing by 10% kills the probability of a quick sale
    drop_price_threshold = optimal_price * 1.10
    prob_drop = prob_optimal - 33

    # Format numbers into Indian Lakhs (L) for the GenAI string
    def format_lakhs(price):
        return f"₹{price / 100000:.1f}L"

    # Construct the final intelligent pitch
    insight_message = (
        f"Plot {plot_number} has a {prob_optimal}% probability of sale within "
        f"{base_weeks} weeks at {format_lakhs(optimal_price)}. "
        f"Alert: Market velocity suggests a drop to {prob_drop}% probability "
        f"if priced above {format_lakhs(drop_price_threshold)}."
    )

    return {
        "plot_number": plot_number,
        "optimal_price": optimal_price,
        "probability_optimal": prob_optimal,
        "timeframe_weeks": base_weeks,
        "drop_price_threshold": drop_price_threshold,
        "probability_drop": prob_drop,
        "insight_message": insight_message
    }
    
@app.get("/api/insights/completion-forecast", response_model=schemas.CompletionForecastInsight)
def get_completion_forecast(db: Session = Depends(database.get_db)):
    all_plots = db.query(models.Plot).filter(models.Plot.total_area_sqft > 0).all()
    if not all_plots:
        raise HTTPException(status_code=400, detail="Insufficient layout data")
        
    total_plots = len(all_plots)
    
    # Count how many plots are off the market
    sold_or_booked = len([p for p in all_plots if p.status.value in ["Sold", "Booked"]])
    available = total_plots - sold_or_booked
    
    # Statistical Heuristic: Assume the project has been actively selling for 6 months
    active_months = 6.0
    velocity = sold_or_booked / active_months if active_months > 0 else 1.0
    velocity = max(velocity, 0.5) # Set a floor so math doesn't divide by zero
    
    # Predict the future sell-out date
    months_remaining = available / velocity
    future_date = datetime.now() + timedelta(days=30 * months_remaining)
    projected_date_str = future_date.strftime("%b %Y")
    
    # Dynamic AI Sales Suggestion
    optimized_velocity = velocity * 1.35 # What if we increase velocity by 35%?
    optimized_months_remaining = available / optimized_velocity
    optimized_date = datetime.now() + timedelta(days=30 * optimized_months_remaining)
    
    suggestion = (
        f"AI Suggestion: At {round(velocity, 1)} plots/mo, you have {math.ceil(months_remaining)} months of inventory left. "
        f"Applying a targeted 5% discount to the {available} available plots could increase market velocity to "
        f"{round(optimized_velocity, 1)} plots/mo, clearing the layout early by {optimized_date.strftime('%b %Y')}."
    )
    
    return {
        "projected_sellout_date": projected_date_str,
        "current_velocity": round(velocity, 1),
        "available_plots": available,
        "ai_suggestion": suggestion
    }    