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