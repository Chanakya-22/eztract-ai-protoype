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