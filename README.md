# JoyMap

\*\*Digitalizing access to educational and recreational activities

JoyMap is a cross-platform mobile application designed to connect parents with providers of extracurricular activities for children. It addresses the difficulty parents face in quickly discovering suitable local activities, while providing institutions with a dedicated channel for market exposure and visibility. The primary objective is to simplify the booking process and create a safe environment with a strict validation system for institutions.

## Tech Stack & Architecture

The project utilizes a client-server architecture, completely separating the visual interface from the data processing logic.

- **Frontend (Mobile Client):** React Native (Expo) for cross-platform development (iOS and Android from a single codebase).
- **Backend (Server):** Node.js (Express), deployed on a remote server to coordinate application logic, validate actions, and apply security rules.
- **Database:** MySQL, utilizing a relational model to organize Users, Activities, and Bookings, hosted as a fully managed cloud database on Aiven.
- **External APIs:** Google Maps API for geolocation and interactive mapping, and Cloudinary API for processing and securely storing uploaded verification documents.
- **Local Storage:** SecureStore for encrypting sensitive information (tokens, passwords) and AsyncStorage for quick profile data retrieval.

## Core Features

### For Parents

- **Interactive Discovery:** View events directly on an interactive map powered by Google Maps API.
- **Smart Filtering:** Search for activities customized by interest category and the child's age.
- **Booking Management:** A fast booking system allowing users to reserve spots and cancel directly within the app.
- **Activity Tracking:** Access to a history of previous participations and a quick view of upcoming current bookings.
- **Automated Notifications:** Receive mobile alerts reminding you of upcoming reserved events.

### For Institutions

- **Activity Management:** Detailed forms to create, edit, or delete activities, defining parameters like age limits, maximum participants, and location[cite: 1].
- **Performance Monitoring:** Track the occupancy and average sell-out rate of available spots.

### Security & Administration

- **Unified Authentication:** A single intuitive registration form where users select their role (Parent or Institution).
- **Institution Verification:** A mandatory security barrier where new institutions are placed in a "pending" state and must upload a photo of their official registration document (CUI), processed via Cloudinary.
- **Admin Portal:** Administrators can review, approve, or reject pending institutional documents to maintain a safe platform.

## How to Install & Run

Because the Node.js backend and Aiven MySQL database are deployed remotely, you do not need to configure a local server or database environment to test the application. You only need to launch the mobile client.

If you wish to view the frontend code and run it on a local emulator:

1. Clone this repository.
2. Navigate into the client directory.
3. Install dependencies by running `npm install`.
4. Start the Expo development server by running `npx expo start`.
5. Scan the generated QR code with your phone or press `a` to open in an Android emulator / `i` for an iOS simulator.

## Future Roadmap

- **Online Payments:** Integration with secure processors (like Stripe or Apple/Google Pay) for upfront activity payments.
- **Review and Rating System:** A dedicated space for parents to evaluate activities and provide community feedback.
- **AI Recommendations:** Monitoring user preferences to automatically suggest relevant, personalized activities.

## Author

- **Șandor David Cristian**
