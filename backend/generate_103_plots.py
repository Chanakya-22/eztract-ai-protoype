import random
import math
from app.database import engine, SessionLocal
from app.models import Base, Plot, PlotStatus

# Ensure tables exist
Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Wiping old test data...")
db.query(Plot).delete()
db.commit()

print("Generating 103 production-grade plots...")

statuses = ["Available", "Booked", "Sold"]
names = ["Ramesh Kumar", "Priya Sharma", "Vikram Singh", "Anita Desai", "Rahul Verma", "Sneha Reddy", "Arjun Patel", "Kavita Iyer", "Sanjay Gupta", "Neha Menon"]
managers = ["Admin_Main", "Agent_01", "Agent_02", "Agent_03"]

# Mathematical grid to spread the plots across the image visually
# Assuming a canvas size of roughly 800x600
cols = 10
x_offset, y_offset = 50, 50
plot_width_px, plot_height_px = 60, 40

for i in range(1, 104):
    status = random.choices(statuses, weights=[0.5, 0.2, 0.3])[0] # 50% available, 20% booked, 30% sold
    
    # Calculate visual coordinates on the map
    row = (i - 1) // cols
    col = (i - 1) % cols
    x1 = x_offset + (col * (plot_width_px + 5))
    y1 = y_offset + (row * (plot_height_px + 5))
    x2, y2 = x1 + plot_width_px, y1 + plot_height_px
    polygon = f"[[{x1},{y1}], [{x2},{y1}], [{x2},{y2}], [{x1},{y2}]]"

    # Assign realistic dimensions (e.g., 30x40, 30x50, 40x60)
    w_ft = random.choice([30.0, 40.0, 50.0])
    l_ft = random.choice([40.0, 50.0, 60.0])
    area = w_ft * l_ft
    price = area * 1200 # ₹1200 per sqft

    new_plot = Plot(
        plot_number=str(i),
        width_ft=w_ft,
        length_ft=l_ft,
        total_area_sqft=area,
        base_price=price,
        status=PlotStatus(status),
        buyer_name=random.choice(names) if status != "Available" else None,
        contact_number=f"+91-9{random.randint(100000000, 999999999)}" if status != "Available" else None,
        managed_by=random.choice(managers) if status != "Available" else None,
        polygon_coordinates=polygon
    )
    db.add(new_plot)

db.commit()
db.close()
print("Successfully injected 103 plots into the database!")