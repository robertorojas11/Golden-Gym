# UI Rules - Gym Access Control System (v1)

This document dictates the user interface, styling guidelines, and user experience requirements for the Gym Access Control System.

---

## 1. Visual Design Guidelines

1. **Aesthetic Philosophy**: The interface must resemble modern SaaS tools like Stripe, Linear, and Notion. Use flat, high-contrast layouts, clean grids, fine borders (1px), and generous padding.
2. **Colors**:
   - **Primary Black**: `#000000` (Used for header background, main container panels, high-contrast text)
   - **Primary Red**: `#FA2F2A` (Action accents, primary active states, branding highlights)
   - **Primary Yellow**: `#FFA624` (Warnings, pending states, membership alert highlights)
   - **Background Gray**: `#F2F2F2` (General layout background, soft panel fills)
   - **Text White**: `#FFFFFF` (High contrast text on dark backgrounds)
   - **Text Gray**: `#D1D5DB` / `#4B5563` (Subtitles, labels, secondary text)
   - **Status Success**: `#22C55E`
   - **Status Warning**: `#F59E0B`
   - **Status Danger**: `#EF4444`

---

## 2. Layout Structure

1. **Header Block**:
   - A fixed header must span the top of all views (except the login page).
   - Background color must be exactly `#000000`.
   - Height must be between 70px and 90px.
   - Left side: Application Title and navigation menu.
   - Right side: Logo placeholder block labeled "Gym Logo".
2. **Dashboard Grid**:
   - Use a card-based layout with rounded corners (`rounded-xl` or `rounded-lg`).
   - Shadows must be soft (`shadow-sm` or `shadow-md`).
3. **Responsive Flow**:
   - The receptionist view (dashboard, management) must be optimized for desktop (1920x1080 resolution is common at gym desks).
   - The member-facing Access Control Screen must scale nicely on large screens or dual-monitor configurations.

---

## 3. Micro-Animations & Dynamic Feedback

1. **Fingerprint Scanning**: The Access Control Screen scanning interface must display a pulse animation (scale & opacity transition) when scanning is active.
2. **Access States**:
   - **Success (Access Granted)**: Flash green (`#22C55E`) border or card background, accompanied by a clean checkmark or profile detail display.
   - **Danger (Access Denied)**: Red highlight (`#EF4444`), shake effect on the error text.
3. **Interactive Elements**: All buttons must have a hover transitions (e.g., transition-all duration-200, hover:scale-[1.02]).
