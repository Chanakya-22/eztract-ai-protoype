import cv2
import pytesseract
import numpy as np
import json
import os

# 1. TELL PYTHON WHERE TESSERACT IS INSTALLED ON WINDOWS
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_plots_from_image(image_path, output_json):
    print(f"Loading image: {image_path}...")
    img = cv2.imread(image_path)
    
    if img is None:
        print("Error: Could not load image. Check the path.")
        return

    # 2. PRE-PROCESSING (Make lines pop out)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Blur slightly to remove paper texture noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    # Adaptive thresholding isolates the black lines from the white paper
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

    # 3. FIND SHAPES (Contours)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    extracted_data = []
    print(f"Found {len(contours)} raw shapes. Filtering for plots...")

    count = 0
    for cnt in contours:
        # Approximate the polygon to smooth out rough hand-drawn/printed lines
        epsilon = 0.02 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        
        # Calculate area to filter out tiny dust specs or the massive entire page border
        area = cv2.contourArea(cnt)
        
        # Adjust these area thresholds based on your image resolution!
        # Assuming plots are roughly between 1,000 and 20,000 pixels in size
        if 1000 < area < 20000 and len(approx) >= 4:
            x, y, w, h = cv2.boundingRect(approx)
            
            # Crop the plot from the grayscale image for OCR
            roi = gray[y:y+h, x:x+w]
            
            # Pre-process the ROI specifically for reading text (upscale and threshold)
            roi_large = cv2.resize(roi, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
            _, roi_thresh = cv2.threshold(roi_large, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
            
            # Run OCR. 
            # --psm 6 assumes a single uniform block of text. 
            # tessedit_char_whitelist restricts it to numbers and letters to avoid reading noise as punctuation.
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            text = pytesseract.image_to_string(roi_thresh, config=custom_config).strip()
            
            # Clean up the text (grab the first "word" which is usually the big plot number)
            plot_num = text.split('\n')[0].strip() if text else f"Unknown_{count}"
            
            if not plot_num:
                plot_num = f"Unknown_{count}"

            extracted_data.append({
                "plot_number": plot_num,
                "width_ft": round(w * 0.5, 1), # Synthetic size calculation based on pixels
                "length_ft": round(h * 0.5, 1),
                "total_area_sqft": round((w * 0.5) * (h * 0.5), 1),
                "base_price": round(((w * 0.5) * (h * 0.5)) * 1200, 2),
                "status": "Available",
                "polygon_coordinates": f"[[{x},{y}], [{x+w},{y}], [{x+w},{y+h}], [{x},{y+h}]]"
            })
            count += 1

            # OPTIONAL: Draw a green box on the image to show what we found
            cv2.rectangle(img, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(img, plot_num, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

    # 4. SAVE THE DATA
    with open(output_json, 'w') as f:
        json.dump(extracted_data, f, indent=4)
    
    print(f"Extraction complete! Found {len(extracted_data)} potential plots.")
    
    # Save an annotated image so you can visually verify what the AI saw
    debug_image_path = os.path.join(os.path.dirname(image_path), "cv_debug_output.jpg")
    cv2.imwrite(debug_image_path, img)
    print(f"Saved visual debug map to: {debug_image_path}")


# Execution
if __name__ == "__main__":
    # Point this to the image sitting in your Next.js public folder
    IMAGE_PATH = "../frontend/public/layout.jpg" 
    OUTPUT_JSON = "cv_extracted_plots.json"
    
    extract_plots_from_image(IMAGE_PATH, OUTPUT_JSON)