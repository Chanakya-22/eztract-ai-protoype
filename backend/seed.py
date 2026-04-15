import json
import os
from datetime import datetime
from app.database import engine, SessionLocal
from app.models import Base, Plot, PlotStatus

print("Connecting to Supabase to create tables...")

# 1. Create all tables defined in models.py
Base.metadata.create_all(bind=engine)
print("Tables created successfully!")

# 2. Open a database session
db = SessionLocal()

try:
    # 3. Load the JSON data
    json_path = os.path.join(os.path.dirname(__file__), "data", "seed_data.json")
    with open(json_path, "r") as file:
        plots_data = json.load(file)

    print("Checking for existing data...")
    # 4. Insert data if the table is empty
    existing_plots = db.query(Plot).count()
    if existing_plots == 0:
        print("Injecting synthetic plots into Supabase...")
        for p in plots_data:
            new_plot = Plot(
                plot_number=p["plot_number"],
                width_ft=p["width_ft"],
                length_ft=p["length_ft"],
                total_area_sqft=p["total_area_sqft"],
                base_price=p["base_price"],
                status=PlotStatus(p["status"]),
                buyer_name=p["buyer_name"],
                contact_number=p["contact_number"],
                booking_date=datetime.fromisoformat(p["booking_date"].replace('Z', '+00:00')) if p["booking_date"] else None,
                managed_by=p["managed_by"],
                polygon_coordinates=p["polygon_coordinates"]
            )
            db.add(new_plot)
        db.commit()
        print("Data injection complete! Database is primed.")
    else:
        print("Data already exists. Skipping injection.")

except Exception as e:
    print(f"An error occurred: {e}")
    db.rollback()
finally:
    db.close()