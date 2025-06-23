
# Dodi Deals: A Premier E-Commerce & Loyalty Platform

Dodi Deals is a feature-rich, production-ready web application built with Next.js, designed to provide a seamless online ordering experience for retail businesses with physical locations. Initially tailored for "Dodi Deals," its robust architecture serves as a powerful, scalable template for any business looking to implement online-to-in-store e-commerce, customer loyalty programs, and comprehensive management dashboards.

---

## Key Features

This application is more than just a storefront; it's a complete business management tool.

### For Customers:
*   **Store Selection:** Geographically aware store selector to connect users to their nearest location.
*   **Dynamic Product Catalog:** Browse products with real-time stock and pricing for the selected store.
*   **Daily & Weekly Deals:** A dynamic deals engine showcases special offers, driving sales and engagement.
*   **Secure Online Payments:** Integrated with Stripe for secure, pre-paid orders for in-store pickup.
*   **User Profiles & Loyalty:** Users can create accounts, track order history, and earn loyalty points.
*   **Favorites:** Save favorite products for quick re-ordering.

### For Business Management:
*   **Central Admin Dashboard:** A global view of the entire operation.
    *   **User Management:** Assign admin and store-level roles (Manager, Employee).
    *   **Store Management:** Add or edit store locations, hours, and custom deal rules.
    *   **Product Management:** Define products, manage categories, and assign availability across all stores.
    *   **Global Sales Analytics:** View aggregated reports on revenue, top products, and store performance.
*   **Store Manager Dashboard:** A dedicated interface for store-level staff.
    *   **Order Fulfillment:** Manage incoming orders through their lifecycle (Pending -> Preparing -> Ready -> Completed).
    *   **Stock Management:** Update stock levels for products available at a specific store.
    *   **Employee Management:** Assign or remove employees from the managed store.
    *   **Refund Processing:** Securely issue refunds for online orders via Stripe integration.

---

## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **UI Library**: [React](https://reactjs.org/)
*   **Component Library**: [ShadCN UI](https://ui.shadcn.com/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.tailwindcss.com/)
*   **Payments**: [Stripe](https://stripe.com/) for secure payment processing.
*   **Backend & Database**: Firebase (Firestore, Authentication, Cloud Functions)
*   **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit) (for potential future AI-powered features)

---

## Monetization & Future Vision

This platform is engineered to be a scalable, multi-tenant solution. It can be adapted and monetized in several ways:

1.  **White-Label SaaS:** The application can be packaged as a customizable solution for other retail businesses, charging a setup fee and a recurring monthly subscription.
2.  **Turnkey E-Commerce Platform:** Offer this as a complete, managed e-commerce and loyalty solution for clients, with services for customization, deployment, and maintenance.

Future development could include AI-powered product recommendations, advanced inventory forecasting, and deeper analytics.

---

## Getting Started

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up Environment Variables:**
    *   Create a `.env.local` file in the root directory.
    *   Populate it with your Firebase project credentials (`NEXT_PUBLIC_FIREBASE_*`) and your Stripe keys (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`).
4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:9002`.

5.  **Seed Initial Data (Optional):**
    *   To populate your Firestore database with initial sample stores and products, you can run the import script:
    ```bash
    npm run import-products
    ```

This updated `README.md` will give you a solid document to build your pitch from. What are your thoughts on this direction?
