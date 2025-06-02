# Dodi Deals - Firebase Studio App

Welcome to Dodi Deals! This application is a Next.js-based platform designed to showcase products, daily deals, and allow users to manage their accounts for in-store pickups, reflecting features similar to dodihemp.com.

This project was bootstrapped with Firebase Studio and demonstrates a modern web application setup.

## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **UI Library**: [React](https://reactjs.org/)
*   **Component Library**: [ShadCN UI](https://ui.shadcn.com/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit) (for AI-powered features)
*   **Backend & Database**: Firebase (Firestore, Authentication)

## Getting Started

To get started with developing this application:

1.  **Clone the repository (if you haven't already).**
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```
3.  **Set up Firebase:**
    *   Ensure you have a Firebase project created.
    *   Configure your Firebase project credentials. For client-side Firebase, ensure your `src/lib/firebase.ts` has the correct Firebase config object.
    *   For server-side operations (like admin tasks or Genkit flows interacting with Firebase Admin SDK), ensure your environment is set up with appropriate service account credentials. See `src/lib/firebaseAdmin.ts` for details on how credentials are loaded.
4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
    This will typically start the app on `http://localhost:9002` (as configured in `package.json`).

5.  **Open `src/app/page.tsx`** in your editor to start exploring the main page of the application.

## Key Directories

*   `src/app/`: Contains the Next.js pages and layouts (App Router).
*   `src/components/`: Reusable UI components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/site/`: Custom site-specific components.
*   `src/contexts/`: React Context for global state management (e.g., `AppContext.tsx`).
*   `src/lib/`: Utility functions, Firebase configuration, type definitions.
*   `src/hooks/`: Custom React hooks.
*   `src/data/`: Static data or seed data.
*   `src/ai/`: Genkit related flows and configurations.
*   `functions/`: Firebase Cloud Functions, including Genkit HTTP endpoints.

## Building for Production

```bash
npm run build
```

This will create an optimized production build of your application.
