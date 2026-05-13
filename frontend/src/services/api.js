import axios from 'axios';

const API_URL = '/api';  // ← change from 'http://127.0.0.1:8000/api' to just '/api'

export const fetchPlots = async () => {
    try {
        const response = await axios.get(`${API_URL}/plots`);
        return response.data.data;
    } catch (error) {
        console.error("Error fetching plots:", error);
        return [];
    }
};

export const predictPlotPrice = async (shapeData) => {
    try {
        const response = await axios.post(`${API_URL}/ai/predict-price`, shapeData);
        return response.data;
    } catch (error) {
        console.error("Error predicting price:", error);
        return null;
    }
};

export const savePlotToDB = async (plotData) => {
    try {
        const response = await axios.post(`${API_URL}/plots`, plotData);
        return response.data;
    } catch (error) {
        console.error("Error saving plot:", error);
        return null;
    }
};

export const fetchPricingInsight = async (plotNumber) => {
  try {
    const response = await fetch(`http://localhost:8000/api/insights/pricing-window/${plotNumber}`);
    if (!response.ok) throw new Error("Plot not found");
    return await response.json();
  } catch (error) {
    console.error("Error fetching pricing insight:", error);
    return null;
  }
};

export const fetchCompletionForecast = async () => {
  try {
    const response = await fetch(`http://localhost:8000/api/insights/completion-forecast`);
    if (!response.ok) throw new Error("Forecast failed");
    return await response.json();
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return null;
  }
};

export const fetchSmartBundling = async () => {
  try {
    const response = await fetch(`http://localhost:8000/api/insights/smart-bundling`);
    if (!response.ok) throw new Error("Bundling failed");
    return await response.json();
  } catch (error) {
    console.error("Error fetching bundling insight:", error);
    return null;
  }
};

export const fetchBuyerPersona = async (plotNumber) => {
  try {
    const response = await fetch(`http://localhost:8000/api/insights/buyer-persona/${plotNumber}`);
    if (!response.ok) throw new Error("Persona generation failed");
    return await response.json();
  } catch (error) {
    console.error("Error fetching persona insight:", error);
    return null;
  }
};

export const updatePlotStatus = async (plotId, status) => {
  try {
    const response = await fetch(`http://localhost:8000/api/plots/${plotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error("Failed to update status");
    return await response.json();
  } catch (error) {
    console.error("Error updating plot status:", error);
    return null;
  }
};

export const detectPlotsCV = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  
  try {
    // Assuming API_BASE_URL is configured at the top of your api.js
    // If not, explicitly use "http://localhost:8000/api/ai/detect-plots"
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
    const response = await fetch(`${API_BASE_URL}/ai/detect-plots`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error("Computer Vision detection failed");
    return await response.json();
  } catch (error) {
    console.error("Error running CV detection:", error);
    return null;
  }
};

// Add these to api.js
export const fetchProjects = async () => {
    try {
        const response = await fetch(`${API_URL}/projects`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
};

export const createProject = async (projectData, file) => {
    const formData = new FormData();
    formData.append("id", projectData.id);
    formData.append("name", projectData.name);
    formData.append("location", projectData.location);
    formData.append("total_area", projectData.totalArea);
    formData.append("status", projectData.status);
    if (file) formData.append("file", file);

    try {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error("Error saving project:", error);
        return null;
    }
};