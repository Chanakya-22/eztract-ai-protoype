from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database

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