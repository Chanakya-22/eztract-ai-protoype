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