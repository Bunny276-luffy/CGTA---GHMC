================================================================================
GHMC GRIEVANCE PORTAL
Project Overview, Features, and Tech Stack
================================================================================

1. PROJECT OVERVIEW
--------------------------------------------------------------------------------
The GHMC Grievance Portal is a modern, enterprise-grade civic technology web application. It aims to streamline the reporting, tracking, and resolution of civic issues (e.g., potholes, waste management, broken streetlights) between citizens and municipality administrators. 

The application provides two core experiences:
- Citizen Portal: Where users can easily submit grievances using advanced AI tools (voice, text, image recognition) and track their progress.
- Admin Command Center: A secure dashboard for municipal workers to view data analytics, manage tasks, and visualize issue hotspots on a live map.

2. CORE FEATURES & USE CASES
--------------------------------------------------------------------------------
CITIZEN FEATURES:
* Intelligent Grievance Submission: 
  - Image Analysis: Users can upload photos, and the Gemini AI will automatically analyze the image, categorize it, assess its urgency, and provide a detailed description summary.
  - Voice Dictation: Users can speak their grievances using the Web Speech API. The input is then passed through an AI text enhancer to ensure formal, clear language.
  - Geolocation Integration: Automatically captures the precise coordinates of the reported issue using browser location APIs.
* Real-time Tracking (Command Log/List):
  - Users have a personalized dashboard to track their active and past complaints.
  - Distinct status badges (Pending, In Progress, Resolved) and ticket IDs provide full transparency.
* Modern Authentication:
  - Secure login and registration using Firebase Authentication.

ADMIN COMMAND CENTER FEATURES:
* Command Center Data Board: Complete tabular view of all grievances, sorted chronologically with integrated AI synopses and threat/urgency levels.
* Geospatial Live Map: Displays the locations of all active issues using Leaflet and a CartoDB DarkMatter map layer. Features interactive popups detailing the complaint context.
* Advanced Analytics: Visualizes operational status and categorizes grievances using responsive charts (Bar and Pie charts) to help city managers optimize resource allocation.
* Resolution Management: Features single-click resolution actions to archive and close out completed tickets.

3. ARCHITECTURE & TECHNOLOGY STACK
--------------------------------------------------------------------------------
FRONTEND:
* React (Vite): Core UI library and high-performance build tool.
* Tailwind CSS: Utility-first CSS framework used for rapid, responsive styling, utilizing glassmorphism and a "Professional Civic-Tech" dark theme.
* Framer Motion: Animation library responsible for smooth page transitions, staggered layout entrances, and interactive micro-animations.
* Lucide React: Clean, consistent iconography throughout the application.

BACKEND & INFRASTRUCTURE:
* Firebase Firestore: Real-time NoSQL database storing user profiles and complaint documents (categories, text, status, lat/lng).
* Firebase Storage: Cloud storage bucket for securely maintaining user-uploaded evidence imagery.
* Firebase Authentication: Handles user sessions, registration, and secure access rules differentiating Citizens from Admins.

ARTIFICIAL INTELLIGENCE:
* Google Gemini API (`@google/generative-ai`): Powers the instant photo analysis and audio transcription formatting. Generates structured JSON responses to automatically populate the frontend forms.

MAPPING & DATA VISUALIZATION:
* React-Leaflet / Leaflet: Rendering the interactive, dark-themed maps.
* Recharts: Building the responsive Analytics dashboard.

4. UI / UX DESIGN SYSTEM
--------------------------------------------------------------------------------
- Theme: Dark Glassmorphism, structured specifically for an enterprise "Command Center" feel.
- Color Palette: Deep Navy & Midnight Blue backgrounds, with Cyan highlights for interactions and Amber/Emerald for status indications.
- Visual Depth: Heavily relies on translucent cards, strategic drop shadows, and glowing accent borders to maintain visual hierarchy without feeling cluttered.
- Typography: 'Inter' font, optimized for readability and professional aesthetics.

5. HOW IT WORKS
--------------------------------------------------------------------------------
1. Citizen logs in and initiates a new report.
2. Citizen takes a picture of the issue (e.g., a burst pipe). 
3. The image is analyzed directly in the browser by Gemini AI, which writes the description and sets the category to "Water/Sewage" and urgency to "High".
4. The location is grabbed from the device's GPS. The Citizen hits submit.
5. The image is pushed to Firebase Storage, returning a URL. All text data + the URL is committed to Firestore.
6. The Admin logs into the Command Center, sees the new issue populate on the map and data board.
7. Admin dispatches a crew, updates the status, bridging the gap between civic issue identification and resolution.
