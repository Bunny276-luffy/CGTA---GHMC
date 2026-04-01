# GHMC Grievance Portal 🏛️

## 📌 What is this project?
The GHMC Grievance Portal is an AI-powered Integrated Grievance Redressal System built for the Greater Hyderabad Municipal Corporation. It serves as a comprehensive web application connecting citizens with municipal administration. 

Currently, the project features a **clean, minimalistic, and professional government-style interface**. It utilizes a light theme with flat color palettes, clear information hierarchies, and subtle shadows to provide a trustworthy and accessible user experience, moving away from flashy, game-like aesthetics.

## 🌟 Present Features

*   **Citizen & Admin Panels**: Role-based access control managed securely via Firebase Authentication.
*   **Professional Dashboards**: Clean, structured, and flat-themed dashboards for both citizens and administrators, featuring intuitive stat cards and timeline trackers.
*   **AI Auto-fill (Gemini)**:
    *   **Vision AI**: Upload photo evidence and Google Gemini will automatically analyze the image to generate a professional complaint description.
    *   **Voice Dictation**: Speak your issue, and the system will transcribe and enhance the text.
*   **Interactive Mapping**: 
    *   GPS coordination for exact complaint locations, backed by automatic and manual geocoding fallbacks.
    *   Admins view a live "Command Center" map with clustered markers indicating civic hotspots using React Leaflet.
*   **Admin Command Center**: Visual analytics featuring responsive bar and pie charts for sector traffic and operational status.
*   **Smart Search & Filter**: Instant, client-side sorting of complaints by status, priority, and category.

## 🛠️ Tech Stack

*   **Frontend**: React (Vite)
*   **Styling**: Tailwind CSS, Framer Motion
*   **Backend & Database**: Google Firebase (Authentication, Firestore, Storage)
*   **AI Integration**: Google Gemini API (`@google/generative-ai`)
*   **Mapping & Data Vis**: React Leaflet, Recharts, Lucide Icons

## 🚀 Installation & Running Locally

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd gh-grievance-portal/frontend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    *   Create a `.env` file in the `frontend` directory.
    *   Add your Google Gemini API Key:
        ```
        VITE_GEMINI_API_KEY=your_api_key_here
        ```
    *   Ensure your Firebase credentials are correct in `src/firebase.js`.

4.  **Run the App**:
    ```bash
    npm run dev
    ```

## 📝 Architecture Note
This application utilizes a Serverless Architecture. The React frontend interacts directly with Firebase services (BaaS) and external AI APIs. No traditional local backend server is required to run the application.
