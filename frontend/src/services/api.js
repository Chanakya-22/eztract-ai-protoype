import axios from 'axios';

// Point this to your FastAPI server URL
const API_URL = 'http://127.0.0.1:8000/api';

export const fetchPlots = async () => {
    try {
        const response = await axios.get(`${API_URL}/plots`);
        return response.data.data; // We access .data twice because your FastAPI returns {"status": "success", "data": [...]}
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

export const updatePlotInDB = async (id, updatedData) => {
    try {
        const response = await axios.put(`${API_URL}/plots/${id}`, updatedData);
        return response.data;
    } catch (error) {
        console.error("Error updating plot:", error);
        return null;
    }
};

export const deletePlotFromDB = async (id) => {
    try {
        const response = await axios.delete(`${API_URL}/plots/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting plot:", error);
        return null;
    }
};