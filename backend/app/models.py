from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
import enum
from datetime import datetime

# Define Base right here!
Base = declarative_base()

class PlotStatus(enum.Enum):
    AVAILABLE = "Available"
    BOOKED = "Booked"
    SOLD = "Sold"

class Plot(Base):
    __tablename__ = "plots"

    id = Column(Integer, primary_key=True, index=True)
    
    # NEW: project_id added to isolate layouts
    project_id = Column(String, index=True, default="proj_1") 
    
    # MODIFIED: Removed unique=True so different projects can both have a "Plot 1"
    plot_number = Column(String, index=True, nullable=False) 
    
    # Dimensions
    width_ft = Column(Float, nullable=False)
    length_ft = Column(Float, nullable=False)
    total_area_sqft = Column(Float, nullable=False)
    
    # Financials & Status
    base_price = Column(Float, nullable=False)
    status = Column(Enum(PlotStatus), default=PlotStatus.AVAILABLE)
    
    # Booking Details
    buyer_name = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    booking_date = Column(DateTime, nullable=True)
    managed_by = Column(String, nullable=True)
    
    # Spatial Data
    polygon_coordinates = Column(String, nullable=False) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # NEW: Enforce that plot_number is only unique WITHIN the same project
    __table_args__ = (UniqueConstraint('project_id', 'plot_number', name='_project_plot_uc'),)