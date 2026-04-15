from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
import enum
from datetime import datetime

Base = declarative_base()

class PlotStatus(enum.Enum):
    AVAILABLE = "Available"
    BOOKED = "Booked"
    SOLD = "Sold"

class Plot(Base):
    __tablename__ = "plots"

    id = Column(Integer, primary_key=True, index=True)
    plot_number = Column(String, unique=True, index=True, nullable=False) # e.g., "1", "55A", "72pt"
    
    # Dimensions (Based on the image markings like 30'0" x 50'0")
    width_ft = Column(Float, nullable=False)
    length_ft = Column(Float, nullable=False)
    total_area_sqft = Column(Float, nullable=False)
    
    # Financials & Status
    base_price = Column(Float, nullable=False) # For the AI to base predictions on
    status = Column(Enum(PlotStatus), default=PlotStatus.AVAILABLE)
    
    # Booking Details (Nullable because they might be empty if Available)
    buyer_name = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    booking_date = Column(DateTime, nullable=True)
    managed_by = Column(String, nullable=True) # The Agent/Admin name
    
    # Spatial Data (Crucial for the Canvas and AI pricing proximity)
    # Storing the pixel coordinates of the polygon [ [x1,y1], [x2,y2], [x3,y3], [x4,y4] ]
    polygon_coordinates = Column(String, nullable=False) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)